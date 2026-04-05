import { getPool, sql } from './db.js'
import { ensureVolunteerManagementSchema } from './volunteer-management-schema.js'

export async function ensureNotificationTable() {
  await ensureVolunteerManagementSchema()
}

export async function createNotification({
  siteId = null,
  userId,
  type,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
}) {
  await ensureNotificationTable()
  const pool = await getPool()
  await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('userId', sql.Int, userId)
    .input('type', sql.NVarChar(40), type)
    .input('title', sql.NVarChar(160), title)
    .input('message', sql.NVarChar(255), message)
    .input('relatedEntityType', sql.NVarChar(50), relatedEntityType)
    .input('relatedEntityId', sql.Int, relatedEntityId)
    .query(`
      INSERT INTO AppNotifications (SiteId, UserId, Type, Title, Message, RelatedEntityType, RelatedEntityId, IsRead, CreatedAt)
      VALUES (@siteId, @userId, @type, @title, @message, @relatedEntityType, @relatedEntityId, FALSE, NOW())
    `)
}
