import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { createNotification, ensureNotificationTable } from '../../src/lib/notifications.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

const ALERT_TYPES = {
  need_help: 'Necesito apoyo',
  running_late: 'Voy tarde',
  task_completed: 'Tarea completada',
  cover_me: 'Puedes cubrirme?',
}

export default withApi({ methods: ['POST'], roles: ['volunteer'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  await ensureNotificationTable()
  required(req.body, ['toVolunteerUserId', 'alertType'])
  oneOf(req.body.alertType, Object.keys(ALERT_TYPES), 'alertType')

  const targetUserId = toInt(req.body.toVolunteerUserId, 'toVolunteerUserId')
  const currentResult = await pool.request().input('userId', sql.Int, req.auth.sub).query(`
    SELECT SiteId, FullName
    FROM Users
    WHERE UserId = @userId
  `)
  const targetResult = await pool.request().input('userId', sql.Int, targetUserId).query(`
    SELECT u.UserId, u.SiteId, u.FullName, r.RoleCode
    FROM Users u
    INNER JOIN Roles r ON r.RoleId = u.RoleId
    WHERE u.UserId = @userId
  `)

  const currentUser = currentResult.recordset[0]
  const targetUser = targetResult.recordset[0]
  if (!targetUser || targetUser.RoleCode !== 'volunteer') throw new ApiError(404, 'Voluntario destino no encontrado')
  if (Number(currentUser.SiteId) !== Number(targetUser.SiteId)) throw new ApiError(403, 'Solo puedes alertar a voluntarios de tu sede')

  await createNotification({
    siteId: currentUser.SiteId,
    userId: targetUserId,
    type: 'peer_alert',
    title: 'Alerta de companero',
    message: `${currentUser.FullName}: ${ALERT_TYPES[req.body.alertType]}`,
    relatedEntityType: 'volunteer_alert',
    relatedEntityId: targetUserId,
  })

  return { message: 'Alerta enviada' }
})
