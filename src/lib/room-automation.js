import { createNotification, ensureNotificationTable } from './notifications.js'
import { ensureVolunteerManagementSchema } from './volunteer-management-schema.js'
import { sql } from './db.js'

export async function notifySiteStaff(pool, siteId, title, message, relatedEntityType = 'room', relatedEntityId = null) {
  await ensureNotificationTable()
  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT u.UserId
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      WHERE u.IsActive = TRUE
        AND (
          (r.RoleCode IN ('staff', 'admin') AND u.SiteId = @siteId)
          OR r.RoleCode = 'superadmin'
        )
    `)

  await Promise.all(
    result.recordset.map((user) =>
      createNotification({
        siteId,
        userId: user.UserId,
        type: 'room_alert',
        title,
        message,
        relatedEntityType,
        relatedEntityId,
      }),
    ),
  )
}

export async function findCleaningVolunteer(pool, siteId) {
  await ensureVolunteerManagementSchema()
  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT
        u.UserId,
        u.FullName,
        vs.AvailabilityStatus,
        COUNT(CASE WHEN vt.Status IN ('pendiente', 'en_proceso') THEN 1 END) AS CurrentTasks
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      INNER JOIN VolunteerShifts vs ON vs.UserId = u.UserId AND vs.SiteId = u.SiteId
      LEFT JOIN VolunteerTasks vt ON vt.VolunteerUserId = u.UserId AND vt.Status IN ('pendiente', 'en_proceso')
      WHERE u.IsActive = TRUE
        AND u.SiteId = @siteId
        AND r.RoleCode = 'volunteer'
        AND vs.RoleName = 'limpieza'
        AND vs.AvailabilityStatus IN ('disponible', 'cupo_limitado')
      GROUP BY u.UserId, u.FullName, vs.AvailabilityStatus
      ORDER BY
        CASE vs.AvailabilityStatus WHEN 'disponible' THEN 1 ELSE 2 END,
        COUNT(CASE WHEN vt.Status IN ('pendiente', 'en_proceso') THEN 1 END) ASC,
        u.FullName ASC
      LIMIT 1
    `)

  return result.recordset[0] || null
}

export async function findOpenCleaningTask(pool, { siteId, familyId = null, roomId }) {
  const request = pool.request().input('siteId', sql.Int, siteId).input('roomId', sql.Int, roomId)
  let familyFilter = 'AND FamilyId IS NULL'

  if (familyId) {
    request.input('familyId', sql.Int, familyId)
    familyFilter = 'AND FamilyId = @familyId'
  }

  const result = await request.query(`
    SELECT *
    FROM VolunteerTasks
    WHERE SiteId = @siteId
      AND RelatedRoomId = @roomId
      ${familyFilter}
      AND TaskType = 'limpieza'
      AND Status IN ('pendiente', 'en_proceso')
    ORDER BY CreatedAt DESC
    LIMIT 1
  `)

  return result.recordset[0] || null
}

export async function createCleaningTaskForRoom(pool, {
  siteId,
  volunteerUserId,
  assignedByUserId,
  familyId = null,
  roomId,
  taskDay,
  title,
  notes,
}) {
  await ensureNotificationTable()

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('volunteerUserId', sql.Int, volunteerUserId)
    .input('assignedByUserId', sql.Int, assignedByUserId)
    .input('familyId', sql.Int, familyId)
    .input('roomId', sql.Int, roomId)
    .input('title', sql.NVarChar(160), title)
    .input('taskDay', sql.Date, taskDay)
    .input('notes', sql.NVarChar(255), notes || null)
    .query(`
      INSERT INTO VolunteerTasks (
        SiteId, VolunteerUserId, AssignedByUserId, FamilyId, RelatedRoomId, Title, TaskType, ShiftPeriod, TaskDay, Status, Notes, CreatedAt, UpdatedAt
      )
      VALUES (
        @siteId, @volunteerUserId, @assignedByUserId, @familyId, @roomId, @title, 'limpieza', 'AM', @taskDay, 'pendiente', @notes, NOW(), NOW()
      )
      RETURNING *
    `)

  const task = result.recordset[0]
  const volunteerResult = await pool
    .request()
    .input('userId', sql.Int, volunteerUserId)
    .query(`SELECT FullName FROM Users WHERE UserId = @userId`)

  const volunteerName = volunteerResult.recordset[0]?.FullName || 'Voluntariado limpieza'

  await createNotification({
    siteId,
    userId: volunteerUserId,
    type: 'task_assigned',
    title: 'Nueva tarea asignada',
    message: `Se te asignó la tarea ${title} para el día ${taskDay} turno AM`,
    relatedEntityType: 'volunteer_task',
    relatedEntityId: task.VolunteerTaskId,
  })

  return { task, volunteerName }
}
