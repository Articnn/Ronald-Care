import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)
  const dbReq = pool.request()
  let where = `WHERE r.RoleCode = 'staff' AND u.IsActive = TRUE`

  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    where += ' AND u.SiteId = @siteId'
  }

  const result = await dbReq.query(`
    SELECT
      u.UserId,
      u.FullName,
      u.Email,
      u.SiteId,
      s.Name AS SiteName,
      COALESCE(sp.WorkArea, 'recepcion') AS WorkArea,
      COALESCE(sp.WorkDays, '') AS WorkDays,
      COALESCE(sp.StartTime, '08:00') AS StartTime,
      COALESCE(sp.EndTime, '16:00') AS EndTime,
      COALESCE(sp.ShiftPeriod, 'AM') AS ShiftPeriod,
      COALESCE(sp.ShiftLabel, 'manana') AS ShiftLabel,
      COALESCE(sp.AvailabilityStatus, 'disponible') AS AvailabilityStatus,
      COALESCE(sp.HoursLogged, 0) AS HoursLogged,
      (
        COUNT(DISTINCT req.RequestId) FILTER (WHERE req.Status IN ('nueva', 'asignada', 'en_proceso'))
        + COUNT(DISTINCT t.TripId) FILTER (WHERE t.Status IN ('pendiente', 'en_curso'))
      ) AS CurrentLoad
    FROM Users u
    INNER JOIN Roles r ON r.RoleId = u.RoleId
    LEFT JOIN Sites s ON s.SiteId = u.SiteId
    LEFT JOIN StaffProfiles sp ON sp.UserId = u.UserId
    LEFT JOIN Requests req ON req.AssignedUserId = u.UserId
    LEFT JOIN Trips t ON t.AssignedUserId = u.UserId
    ${where}
    GROUP BY
      u.UserId, u.FullName, u.Email, u.SiteId, s.Name,
      sp.WorkArea, sp.WorkDays, sp.StartTime, sp.EndTime, sp.ShiftPeriod, sp.ShiftLabel, sp.AvailabilityStatus, sp.HoursLogged
    ORDER BY s.Name, u.FullName
  `)

  return result.recordset
})
