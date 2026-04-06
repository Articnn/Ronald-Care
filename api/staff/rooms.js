import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite, resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'PATCH'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  if (req.method === 'GET') {
    const siteId = resolveScopedSiteId(req, req.query.siteId)
    const dbReq = pool.request()
    let where = 'WHERE r.isactive = true'
    if (siteId) {
      dbReq.input('siteId', sql.Int, siteId)
      where += ' AND r.siteid = @siteId'
    }
    const result = await dbReq.query(`
      SELECT
        r.roomid        AS "roomid",
        r.siteid        AS "siteid",
        r.roomcode      AS "roomcode",
        r.capacity      AS "capacity",
        r.roomtype      AS "roomtype",
        r.occupiedcount AS "occupiedcount",
        r.roomstatus    AS "roomstatus",
        r.availableat   AS "availableat",
        r.roomnote      AS "roomnote",
        r.isactive      AS "isactive",
        s.name          AS "sitename",
        (
          SELECT STRING_AGG(f.caregivername || ' ' || f.familylastname, ', ')
          FROM families f
          WHERE f.roomid = r.roomid
            AND f.admissionstatus = 'checkin_completado'
        ) AS "assignedfamilies"
      FROM rooms r
      JOIN sites s ON s.siteid = r.siteid
      ${where}
      ORDER BY r.roomcode ASC
    `)
    return result.recordset
  }

  required(req.body, ['roomId'])
  const roomId = toInt(req.body.roomId, 'roomId')
  const roomResult = await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`SELECT roomid, siteid FROM rooms WHERE roomid = @roomId`)
  const room = roomResult.recordset[0]
  ensureSameOrGlobalSite(req, room.SiteId)

  const availableAt = req.body.availableAt || null
  const roomNote = req.body.roomNote || null
  const roomStatus = req.body.roomStatus || (availableAt || roomNote ? 'mantenimiento' : null)

  const result = await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .input('availableAt', sql.NVarChar(40), availableAt)
    .input('roomNote', sql.NVarChar(255), roomNote)
    .input('roomStatus', sql.NVarChar(20), roomStatus)
    .query(`
      UPDATE rooms
      SET
        availableat = COALESCE(NULLIF(@availableAt, '')::timestamp, availableat),
        roomnote = COALESCE(@roomNote, roomnote),
        roomstatus = COALESCE(@roomStatus, roomstatus)
      WHERE roomid = @roomId
      RETURNING *
    `)

  await logAudit({
    siteId: room.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'room.updated',
    entityType: 'room',
    entityId: roomId,
    metadata: { availableAt, roomNote, roomStatus },
  })

  return result.recordset[0]
})
