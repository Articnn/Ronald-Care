import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { comparePassword, hashPassword } from '../../src/lib/security.js'
import { required } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['superadmin', 'admin', 'hospital', 'staff', 'volunteer'] }, async (req) => {
  required(req.body, ['currentPassword', 'newPassword'])

  const pool = await getPool()
  const result = await pool
    .request()
    .input('userId', sql.Int, req.auth.sub)
    .query(`
      SELECT UserId, PasswordHash
      FROM Users
      WHERE UserId = @userId AND IsActive = TRUE
    `)

  const user = result.recordset[0]
  if (!user) throw new ApiError(404, 'Usuario no encontrado')

  const valid = await comparePassword(req.body.currentPassword, user.PasswordHash)
  if (!valid) throw new ApiError(401, 'La contrasena actual no coincide')

  const nextHash = hashPassword(req.body.newPassword)
  await pool
    .request()
    .input('userId', sql.Int, req.auth.sub)
    .input('passwordHash', sql.NVarChar(255), nextHash)
    .query(`
      UPDATE Users
      SET PasswordHash = @passwordHash, UpdatedAt = NOW()
      WHERE UserId = @userId
    `)

  return { message: 'Contrasena actualizada correctamente' }
})
