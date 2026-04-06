import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'
import { ensureNotificationTable } from '../../src/lib/notifications.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'PATCH'], roles: ['superadmin', 'admin', 'staff', 'volunteer'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  await ensureNotificationTable()

  if (req.method === 'GET') {
    const result = await pool
      .request()
      .input('userId', sql.Int, req.auth.sub)
      .query(`
        SELECT NotificationId, RelatedEntityId AS VolunteerTaskId, Title, Message, CreatedAt, IsRead
        FROM AppNotifications
        WHERE UserId = @userId
        ORDER BY CreatedAt DESC
        LIMIT 30
      `)

    const notifications = result.recordset.map((item) => ({
      ...item,
      TaskDay: item.CreatedAt,
      ShiftPeriod: 'AM',
    }))
    const unreadCount = notifications.filter((item) => !item.IsRead).length
    return { unreadCount, notifications }
  }

  required(req.body, ['notificationId'])
  const notificationId = toInt(req.body.notificationId, 'notificationId')

  await pool
    .request()
    .input('notificationId', sql.Int, notificationId)
    .input('userId', sql.Int, req.auth.sub)
    .query(`
      UPDATE AppNotifications
      SET IsRead = TRUE
      WHERE NotificationId = @notificationId AND UserId = @userId
    `)

  return { message: 'Notificacion marcada como leida' }
})
