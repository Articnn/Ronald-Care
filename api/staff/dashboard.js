import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)
  const currentShift = new Date().getHours() < 12 ? 'AM' : 'PM'
  const whereClause = siteId ? 'WHERE siteid = @siteId' : ''
  const withSite = (dbReq) => {
    if (siteId) dbReq.input('siteId', sql.Int, siteId)
    return dbReq
  }

  const pendingRequestsResult = await withSite(pool.request()).query(`
    SELECT COUNT(*) AS "count"
    FROM Requests
    ${whereClause ? `${whereClause} AND` : 'WHERE'} CreatedAt::date = CURRENT_DATE
      AND Status <> 'resuelta'
  `)

  const availableVolunteersResult = await withSite(pool.request())
    .input('shiftPeriod', sql.NVarChar(20), currentShift)
    .query(`
      SELECT COUNT(*) AS "count"
      FROM VolunteerShifts
      ${whereClause ? `${whereClause} AND` : 'WHERE'} ShiftDay = CURRENT_DATE
        AND ShiftPeriod = @shiftPeriod
        AND AvailabilityStatus = 'disponible'
    `)

  const familiesInHouseResult = await withSite(pool.request()).query(`
    SELECT COUNT(*) AS "count"
    FROM Families
    ${whereClause ? `${whereClause} AND` : 'WHERE'} AdmissionStatus = 'checkin_completado'
  `)

  const unassignedTasksResult = await withSite(pool.request()).query(`
    SELECT COUNT(*) AS "count"
    FROM Requests
    ${whereClause ? `${whereClause} AND` : 'WHERE'} (
      AssignedUserId IS NULL
      OR AssignedDisplayName IS NULL
      OR AssignedDisplayName = 'Pendiente'
      OR AssignedDisplayName = 'Pendiente voluntariado'
      OR AssignedDisplayName = 'Pendiente staff'
    )
      AND Status <> 'resuelta'
  `)

  return {
    pendingRequestsToday: Number(pendingRequestsResult.recordset[0]?.count || 0),
    availableVolunteersNow: Number(availableVolunteersResult.recordset[0]?.count || 0),
    familiesInHouse: Number(familiesInHouseResult.recordset[0]?.count || 0),
    unassignedTasks: Number(unassignedTasksResult.recordset[0]?.count || 0),
  }
})
