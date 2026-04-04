import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { comparePassword, hashPassword } from '../../src/lib/security.js'
import { required } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['family'] }, async (req) => {
  required(req.body, ['currentPin', 'newPin'])

  const pool = await getPool()
  const result = await pool
    .request()
    .input('familyId', sql.Int, req.auth.familyId)
    .query(`
      SELECT FamilyAccessId, PinHash, IsActive
      FROM FamilyAccess
      WHERE FamilyId = @familyId
      ORDER BY FamilyAccessId DESC
      LIMIT 1
    `)

  const access = result.recordset[0]
  if (!access || !access.IsActive) throw new ApiError(404, 'Acceso familiar no disponible')

  const valid = await comparePassword(req.body.currentPin, access.PinHash)
  if (!valid) throw new ApiError(401, 'El PIN actual no coincide')

  const nextHash = hashPassword(req.body.newPin)
  await pool
    .request()
    .input('familyAccessId', sql.Int, access.FamilyAccessId)
    .input('pinHash', sql.NVarChar(255), nextHash)
    .query(`
      UPDATE FamilyAccess
      SET PinHash = @pinHash, UpdatedAt = NOW()
      WHERE FamilyAccessId = @familyAccessId
    `)

  return { message: 'PIN actualizado correctamente' }
})
