import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin', 'volunteer'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)
  const dbReq = pool.request()
  let where = `WHERE r.RoleCode = 'volunteer' AND u.IsActive = TRUE`

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
      COALESCE(vs.VolunteerType, 'individual') AS VolunteerType,
      COALESCE(vs.RoleName, 'recepcion') AS RoleName,
      COALESCE(vs.WorkDays, '') AS WorkDays,
      COALESCE(vs.StartTime, '08:00') AS StartTime,
      COALESCE(vs.EndTime, '14:00') AS EndTime,
      COALESCE(vs.ShiftLabel, 'manana') AS ShiftLabel,
      COALESCE(vs.AvailabilityStatus, 'disponible') AS AvailabilityStatus,
      COALESCE(vs.HoursLogged, 0) AS HoursLogged,
      COUNT(t.VolunteerTaskId) FILTER (WHERE t.Status IN ('pendiente', 'en_proceso')) AS CurrentTasks
    FROM Users u
    INNER JOIN Roles r ON r.RoleId = u.RoleId
    LEFT JOIN Sites s ON s.SiteId = u.SiteId
    LEFT JOIN LATERAL (
      SELECT *
      FROM VolunteerShifts vs
      WHERE vs.UserId = u.UserId
      ORDER BY vs.CreatedAt DESC
      LIMIT 1
    ) vs ON TRUE
    LEFT JOIN VolunteerTasks t ON t.VolunteerUserId = u.UserId
    ${where}
    GROUP BY
      u.UserId, u.FullName, u.Email, u.SiteId, s.Name,
      vs.VolunteerType, vs.RoleName, vs.WorkDays, vs.StartTime, vs.EndTime,
      vs.ShiftLabel, vs.AvailabilityStatus, vs.HoursLogged
    ORDER BY s.Name, u.FullName
  `)

  return result.recordset
})
