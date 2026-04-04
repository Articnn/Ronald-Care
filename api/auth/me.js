import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['superadmin', 'admin', 'hospital', 'staff', 'volunteer', 'family'] }, async (req) => {
  const pool = await getPool()

  if (req.auth.role === 'family') {
    const result = await pool
      .request()
      .input('familyId', sql.Int, req.auth.familyId)
      .query(`
        SELECT FamilyId, SiteId, CaregiverName, FamilyLastName, AdmissionStatus
        FROM Families
        WHERE FamilyId = @familyId
      `)
    return { role: 'family', profile: result.recordset[0] }
  }

  const result = await pool
    .request()
    .input('userId', sql.Int, req.auth.sub)
    .query(`
      SELECT u.UserId, u.FullName, u.Email, u.SiteId, r.RoleCode, s.Name AS SiteName
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      LEFT JOIN Sites s ON s.SiteId = u.SiteId
      WHERE u.UserId = @userId
    `)

  return { role: result.recordset[0].RoleCode, profile: result.recordset[0] }
})
