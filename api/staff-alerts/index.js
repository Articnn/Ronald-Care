import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { createNotification, ensureNotificationTable } from '../../src/lib/notifications.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

const ALERT_TYPES = {
  incoming_families: 'Llegan familias nuevas',
  prepare_kits: 'Se ocupan mas kits',
  reception_help: 'Recepcion necesita apoyo',
  checkin_pending: 'Hay check-ins pendientes',
}

export default withApi({ methods: ['POST'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  await ensureNotificationTable()
  const pool = await getPool()
  required(req.body, ['toStaffUserId', 'alertType'])
  oneOf(req.body.alertType, Object.keys(ALERT_TYPES), 'alertType')

  const targetUserId = toInt(req.body.toStaffUserId, 'toStaffUserId')
  const targetResult = await pool
    .request()
    .input('userId', sql.Int, targetUserId)
    .query(`
      SELECT u.UserId, u.SiteId, u.FullName, r.RoleCode
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      WHERE u.UserId = @userId
    `)

  const targetUser = targetResult.recordset[0]
  if (!targetUser || targetUser.RoleCode !== 'staff') throw new ApiError(404, 'Staff destino no encontrado')
  ensureSameOrGlobalSite(req, targetUser.SiteId)

  await createNotification({
    siteId: targetUser.SiteId,
    userId: targetUserId,
    type: 'staff_alert',
    title: 'Alerta operativa',
    message: ALERT_TYPES[req.body.alertType],
    relatedEntityType: 'staff_alert',
    relatedEntityId: targetUserId,
  })

  return { message: 'Alerta enviada' }
})
