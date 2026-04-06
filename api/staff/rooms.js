import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  const pool = await getPool()
  const siteId = req.query.siteId ? parseInt(req.query.siteId, 10) : null
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
      r.occupiedcount AS "occupiedcount",
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
})
