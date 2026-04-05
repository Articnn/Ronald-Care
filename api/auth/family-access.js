import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { comparePassword, signJwt } from '../../src/lib/security.js'
import { required } from '../../src/lib/validation.js'

export default withApi({ methods: ['POST'] }, async (req) => {
  required(req.body, ['code', 'pin'])

  const pool = await getPool()
  const result = await pool
    .request()
    .input('code', sql.NVarChar(80), req.body.code)
    .query(`
      SELECT
        fa.FamilyAccessId, fa.FamilyId, fa.TicketCode, fa.QrCode, fa.PinHash, fa.IsActive,
        f.SiteId, f.CaregiverName, f.FamilyLastName
      FROM FamilyAccess fa
      INNER JOIN Families f ON f.FamilyId = fa.FamilyId
      WHERE fa.TicketCode = @code OR fa.QrCode = @code
      LIMIT 1
    `)

  const access = result.recordset[0]
  console.log('[family-access] lookup', {
    code: req.body.code,
    found: Boolean(access),
    familyAccessId: access?.FamilyAccessId ?? null,
    familyId: access?.FamilyId ?? null,
    ticketCode: access?.TicketCode ?? null,
    qrCode: access?.QrCode ?? null,
    isActive: access?.IsActive ?? null,
  })
  if (!access || !access.IsActive) throw new ApiError(401, 'Codigo/PIN invalidos')

  const matches = await comparePassword(req.body.pin, access.PinHash)
  console.log('[family-access] compare', {
    code: req.body.code,
    familyAccessId: access.FamilyAccessId,
    matches,
  })
  if (!matches) throw new ApiError(401, 'Codigo/PIN invalidos')

  await pool
    .request()
    .input('familyAccessId', sql.Int, access.FamilyAccessId)
    .query(`UPDATE FamilyAccess SET LastLoginAt = NOW() WHERE FamilyAccessId = @familyAccessId`)

  const token = signJwt({
    familyId: access.FamilyId,
    role: 'family',
    siteId: access.SiteId,
  })

  return {
    token,
    family: {
      familyId: access.FamilyId,
      caregiverName: access.CaregiverName,
      familyLastName: access.FamilyLastName,
      siteId: access.SiteId,
    },
  }
})
