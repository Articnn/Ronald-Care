import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { getUpcomingDepartureReminders, markDepartureReminderPrepared } from '../../src/lib/admission-workflow.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'PATCH'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)

  if (req.method === 'GET') {
    return getUpcomingDepartureReminders(pool, siteId)
  }

  required(req.body, ['familyId'])
  const familyId = toInt(req.body.familyId, 'familyId')
  const result = await markDepartureReminderPrepared(pool, familyId)
  const row = result.recordset[0]
  if (!row) throw new ApiError(404, 'Familia no encontrada')

  await logAudit({
    siteId: siteId || null,
    actorUserId: req.auth.sub,
    eventType: 'family.departure_reminder_prepared',
    entityType: 'family',
    entityId: familyId,
    metadata: { placeholder: 'send_reminder_message' },
  })

  // TODO: WhatsApp Trigger - recordatorio de salida familiar

  return {
    FamilyId: row.FamilyId,
    DepartureReminderSentAt: row.DepartureReminderSentAt,
    Message: 'Recordatorio preparado para salida familiar.',
  }
})
