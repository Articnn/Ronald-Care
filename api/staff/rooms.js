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
        r.roomid AS "RoomId",
        r.siteid AS "SiteId",
        r.roomcode AS "RoomCode",
        r.capacity AS "Capacity",
        r.roomtype AS "RoomType",
        r.occupiedcount AS "OccupiedCount",
        r.roomstatus AS "RoomStatus",
        r.availableat AS "AvailableAt",
        r.roomnote AS "RoomNote",
        r.isactive AS "IsActive",
        s.name AS "SiteName",
        af.familyid AS "AssignedFamilyId",
        af.caregivername AS "AssignedFamilyName",
        af.familylastname AS "AssignedFamilyLastName",
        af.admissionstatus AS "AssignedFamilyAdmissionStatus",
        CASE
          WHEN af.familyid IS NOT NULL THEN af.caregivername || ' ' || af.familylastname
          ELSE NULL
        END AS "assignedfamilies"
      FROM rooms r
      JOIN sites s ON s.siteid = r.siteid
      LEFT JOIN LATERAL (
        SELECT f.familyid, f.caregivername, f.familylastname, f.admissionstatus
        FROM families f
        WHERE f.roomid = r.roomid
        ORDER BY f.updatedat DESC NULLS LAST, f.createdat DESC
        LIMIT 1
      ) af ON TRUE
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
    .query(`SELECT roomid AS "RoomId", siteid AS "SiteId" FROM rooms WHERE roomid = @roomId`)
  const room = roomResult.recordset[0]
  ensureSameOrGlobalSite(req, room.SiteId)

  const availableAt = req.body.availableAt || null
  const roomNote = req.body.roomNote ?? null
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
        availableat = CASE
          WHEN @availableAt IS NULL OR @availableAt = '' THEN availableat
          ELSE @availableAt::timestamp
        END,
        roomnote = @roomNote,
        roomstatus = COALESCE(@roomStatus, roomstatus)
      WHERE roomid = @roomId
      RETURNING
        roomid AS "RoomId",
        roomcode AS "RoomCode",
        roomstatus AS "RoomStatus",
        availableat AS "AvailableAt",
        roomnote AS "RoomNote"
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
