import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { createCleaningTaskForRoom, findCleaningVolunteer, findOpenCleaningTask, notifySiteStaff } from '../../src/lib/room-automation.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  required(req.body, ['roomId'])

  const pool = await getPool()
  const roomId = toInt(req.body.roomId, 'roomId')
  const roomResult = await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`
      SELECT
        r.RoomId,
        r.SiteId,
        r.RoomCode,
        r.RoomStatus,
        f.FamilyId,
        f.CaregiverName,
        f.FamilyLastName
      FROM Rooms r
      LEFT JOIN Families f ON f.RoomId = r.RoomId
      WHERE r.RoomId = @roomId
      ORDER BY f.UpdatedAt DESC NULLS LAST
      LIMIT 1
    `)

  const room = roomResult.recordset[0]
  if (!room) throw new ApiError(404, 'Habitación no encontrada')
  ensureSameOrGlobalSite(req, room.SiteId)

  await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`UPDATE Families SET RoomId = NULL, UpdatedAt = NOW() WHERE RoomId = @roomId`)

  const updatedRoom = await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`
      UPDATE Rooms
      SET RoomStatus = 'disponible', OccupiedCount = 0, RoomNote = NULL, AvailableAt = NULL
      WHERE RoomId = @roomId
      RETURNING RoomId AS "RoomId", RoomCode AS "RoomCode", RoomStatus AS "RoomStatus"
    `)

  let volunteerName = null
  let volunteerUserId = null
  let taskId = null
  const existingTask = await findOpenCleaningTask(pool, { siteId: room.SiteId, roomId, familyId: null })

  if (existingTask) {
    volunteerUserId = existingTask.VolunteerUserId
    taskId = existingTask.VolunteerTaskId
    const volunteerResult = await pool
      .request()
      .input('userId', sql.Int, volunteerUserId)
      .query(`SELECT FullName FROM Users WHERE UserId = @userId`)
    volunteerName = volunteerResult.recordset[0]?.FullName || 'Voluntariado limpieza'
  } else {
    const volunteer = await findCleaningVolunteer(pool, room.SiteId)
    if (volunteer) {
      volunteerUserId = volunteer.UserId
      const created = await createCleaningTaskForRoom(pool, {
        siteId: room.SiteId,
        volunteerUserId,
        assignedByUserId: req.auth.sub,
        familyId: null,
        roomId,
        taskDay: new Date().toISOString().slice(0, 10),
        title: `Preparar habitación ${room.RoomCode} después de check-out`,
        notes: 'Limpieza automática posterior a salida de familia.',
      })
      volunteerName = created.volunteerName
      taskId = created.task.VolunteerTaskId
    }
  }

  await notifySiteStaff(
    pool,
    room.SiteId,
    'Habitación liberada',
    volunteerName
      ? `Habitación ${room.RoomCode} liberada y limpieza asignada a ${volunteerName}.`
      : `Habitación ${room.RoomCode} liberada. No se encontró voluntario de limpieza disponible en este momento.`,
    'room',
    room.RoomId,
  )

  await logAudit({
    siteId: room.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'room.checkout_released',
    entityType: 'room',
    entityId: room.RoomId,
    metadata: { familyId: room.FamilyId, volunteerUserId },
  })

  return {
    Room: updatedRoom.recordset[0],
    AssignedVolunteerUserId: volunteerUserId,
    AssignedVolunteerName: volunteerName,
    VolunteerTaskId: taskId,
    Message: volunteerName
      ? `Habitación ${room.RoomCode} disponible y limpieza asignada a ${volunteerName}.`
      : `Habitación ${room.RoomCode} disponible. No se encontró voluntario de limpieza disponible.`,
  }
})
