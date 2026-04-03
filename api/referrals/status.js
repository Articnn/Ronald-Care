import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['hospital', 'staff'] }, async (req) => {
  required(req.body, ['referralId', 'status'])
  oneOf(req.body.status, ['enviada', 'en_revision', 'aceptada'], 'status')

  const pool = await getPool()
  const result = await pool
    .request()
    .input('referralId', sql.Int, toInt(req.body.referralId, 'referralId'))
    .input('status', sql.NVarChar(30), req.body.status)
    .query(`
      UPDATE Referrals
      SET Status = @status
      WHERE ReferralId = @referralId
      RETURNING *
    `)

  const referral = result.recordset[0]
  if (!referral) throw new ApiError(404, 'Referencia no encontrada')

  await logAudit({
    siteId: referral.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'referral.status_updated',
    entityType: 'referral',
    entityId: referral.ReferralId,
    metadata: { status: referral.Status },
  })

  return referral
})
