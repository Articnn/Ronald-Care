import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET'], roles: ['hospital', 'staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)

  if (!req.query.familyId && !req.query.referralId) {
    throw new ApiError(400, 'Se requiere familyId o referralId')
  }

  const dbReq = pool.request()
  const filters = []

  if (req.query.familyId) {
    dbReq.input('familyId', sql.Int, toInt(req.query.familyId, 'familyId'))
    filters.push('sc.FamilyId = @familyId')
  }

  if (req.query.referralId) {
    dbReq.input('referralId', sql.Int, toInt(req.query.referralId, 'referralId'))
    filters.push('sc.ReferralId = @referralId')
  }

  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    filters.push('sc.SiteId = @siteId')
  }

  const result = await dbReq.query(`
    SELECT
      sc.FollowUpId,
      sc.FamilyId,
      sc.ReferralId,
      sc.SiteId,
      s.Name AS SiteName,
      sc.RecordedByUserId,
      u.FullName AS RecordedByName,
      sc.ClinicName,
      sc.FeedbackMessage,
      sc.PreviousCheckoutDate,
      sc.EstimatedCheckoutDate,
      sc.RecordedAt
    FROM seguimiento_clinico sc
    INNER JOIN Sites s ON s.SiteId = sc.SiteId
    LEFT JOIN Users u ON u.UserId = sc.RecordedByUserId
    WHERE ${filters.join(' AND ')}
    ORDER BY sc.RecordedAt DESC
  `)

  return result.recordset
})
