import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { comparePassword, signJwt } from '../../src/lib/security.js'
import { email, required } from '../../src/lib/validation.js'

export default withApi({ methods: ['POST'] }, async (req) => {
  required(req.body, ['email', 'password'])
  email(req.body.email)

  const pool = await getPool()
  const result = await pool
    .request()
    .input('email', sql.NVarChar(160), req.body.email)
    .query(`
      SELECT
        u.UserId, u.SiteId, u.FullName, u.Email, u.PasswordHash, u.IsActive,
        r.RoleCode,
        s.Name AS SiteName
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      INNER JOIN Sites s ON s.SiteId = u.SiteId
      WHERE u.Email = @email
    `)

  const user = result.recordset[0]
  if (!user || !user.IsActive) throw new ApiError(401, 'Credenciales invalidas')

  const matches = await comparePassword(req.body.password, user.PasswordHash)
  if (!matches) throw new ApiError(401, 'Credenciales invalidas')

  const token = signJwt({
    sub: user.UserId,
    role: user.RoleCode,
    siteId: user.SiteId,
    email: user.Email,
  })

  return {
    token,
    user: {
      userId: user.UserId,
      fullName: user.FullName,
      email: user.Email,
      role: user.RoleCode,
      siteId: user.SiteId,
      siteName: user.SiteName,
    },
  }
})
