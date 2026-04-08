import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)

  const dbReq = pool.request()
  let where = 'WHERE 1=1'

  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    where += ' AND st.SiteId = @siteId'
  }

  if (req.query.status) {
    dbReq.input('status', sql.NVarChar(20), String(req.query.status))
    where += ' AND st.Status = @status'
  }

  const result = await dbReq.query(`
    SELECT
      st.*,
      s.Name AS SiteName,
      u.FullName AS AssignedUserName,
      cb.FullName AS CreatedByName,
      r.CaregiverName,
      r.FamilyLastName,
      rm.RoomCode
    FROM StaffTasks st
    INNER JOIN Sites s ON s.SiteId = st.SiteId
    LEFT JOIN Users u ON u.UserId = st.AssignedUserId
    LEFT JOIN Users cb ON cb.UserId = st.CreatedByUserId
    LEFT JOIN Referrals r ON r.ReferralId = st.ReferralId
    LEFT JOIN Families f ON f.FamilyId = st.FamilyId
    LEFT JOIN Rooms rm ON rm.RoomId = COALESCE(f.RoomId, f.PlannedRoomId)
    ${where}
    ORDER BY
      CASE st.Priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
      st.CreatedAt DESC
  `)

  return result.recordset
})
