import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite, resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { createCleaningTaskForRoom, findCleaningVolunteer, findOpenCleaningTask, notifySiteStaff } from '../../src/lib/room-automation.js'
import { required, toInt } from '../../src/lib/validation.js'

async function getVolunteerName(pool, volunteerUserId) {
  const result = await pool
    .request()
    .input('userId', sql.Int, volunteerUserId)
    .query(`SELECT FullName FROM Users WHERE UserId = @userId`)

  return result.recordset[0]?.FullName || 'Voluntariado limpieza'
}

async function getCandidateRoom(pool, siteId, requiredCapacity, desiredStatus) {
  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('requiredCapacity', sql.Int, requiredCapacity)
    .input('desiredStatus', sql.NVarChar(20), desiredStatus)
    .query(`
      SELECT
        r.RoomId AS "RoomId",
        r.RoomCode AS "RoomCode",
        r.RoomStatus AS "RoomStatus",
        r.Capacity AS "Capacity",
        r.RoomType AS "RoomType",
        r.RoomNote AS "RoomNote",
        r.AvailableAt AS "AvailableAt"
      FROM Rooms r
      WHERE r.SiteId = @siteId
        AND r.IsActive = TRUE
        AND r.Capacity >= @requiredCapacity
        AND r.RoomStatus = @desiredStatus
        AND NOT EXISTS (
          SELECT 1
          FROM Families f
          WHERE f.RoomId = r.RoomId
        )
      ORDER BY r.Capacity ASC, r.RoomType ASC, r.RoomCode ASC
      LIMIT 1
    `)

  return result.recordset[0] || null
}

async function buildArrivalFlow(pool, req, family) {
  const displayName = `${family.CaregiverName} ${family.FamilyLastName}`
  const requiredCapacity = Math.min(3, Number(family.CompanionCount || 0) + 1)

  if (family.RoomId) {
    const roomResult = await pool
      .request()
      .input('roomId', sql.Int, family.RoomId)
      .query(`
        SELECT RoomId AS "RoomId", RoomCode AS "RoomCode", RoomStatus AS "RoomStatus"
        FROM Rooms
        WHERE RoomId = @roomId
      `)

    const room = roomResult.recordset[0]
    return {
      FamilyId: family.FamilyId,
      CaregiverName: family.CaregiverName,
      FamilyLastName: family.FamilyLastName,
      ArrivalDate: family.ArrivalDate,
      SiteId: family.SiteId,
      SiteName: family.SiteName,
      RequiredCapacity: requiredCapacity,
      FlowStatus: room?.RoomStatus === 'ocupada' ? 'assigned' : 'reserved',
      Message: `Habitación ${room?.RoomCode || 'asignada'} ya está asignada para la familia ${displayName}.`,
      SuggestedRoomId: room?.RoomId || null,
      SuggestedRoomCode: room?.RoomCode || null,
      SuggestedRoomStatus: room?.RoomStatus || null,
      AssignedVolunteerUserId: null,
      AssignedVolunteerName: null,
      ExistingTaskId: null,
    }
  }

  const readyRoom = await getCandidateRoom(pool, family.SiteId, requiredCapacity, 'disponible')
  if (readyRoom) {
    return {
      FamilyId: family.FamilyId,
      CaregiverName: family.CaregiverName,
      FamilyLastName: family.FamilyLastName,
      ArrivalDate: family.ArrivalDate,
      SiteId: family.SiteId,
      SiteName: family.SiteName,
      RequiredCapacity: requiredCapacity,
      FlowStatus: 'ready',
      Message: `Habitación ${readyRoom.RoomCode} encontrada y lista.`,
      SuggestedRoomId: readyRoom.RoomId,
      SuggestedRoomCode: readyRoom.RoomCode,
      SuggestedRoomStatus: readyRoom.RoomStatus,
      AssignedVolunteerUserId: null,
      AssignedVolunteerName: null,
      ExistingTaskId: null,
    }
  }

  const prepRoom = await getCandidateRoom(pool, family.SiteId, requiredCapacity, 'mantenimiento')
  if (prepRoom) {
    let task = await findOpenCleaningTask(pool, {
      siteId: family.SiteId,
      familyId: family.FamilyId,
      roomId: prepRoom.RoomId,
    })
    let volunteerName = null
    let volunteerUserId = null

    if (task) {
      volunteerUserId = task.VolunteerUserId
      volunteerName = await getVolunteerName(pool, task.VolunteerUserId)
    } else {
      const volunteer = await findCleaningVolunteer(pool, family.SiteId)
      if (volunteer) {
        const created = await createCleaningTaskForRoom(pool, {
          siteId: family.SiteId,
          volunteerUserId: volunteer.UserId,
          assignedByUserId: req.auth.sub,
          familyId: family.FamilyId,
          roomId: prepRoom.RoomId,
          taskDay: family.ArrivalDate,
          title: `Preparar habitación ${prepRoom.RoomCode} para familia ${displayName} - llegada ${family.ArrivalDate}`,
          notes: prepRoom.RoomNote || `Habitación asignada a llegada del ${family.ArrivalDate}`,
        })
        task = created.task
        volunteerUserId = volunteer.UserId
        volunteerName = created.volunteerName
        await notifySiteStaff(
          pool,
          family.SiteId,
          'Tarea de preparación asignada',
          `Tarea asignada a ${volunteerName} para preparar la habitación ${prepRoom.RoomCode} de la familia ${displayName}.`,
          'volunteer_task',
          task.VolunteerTaskId,
        )
      }
    }

    return {
      FamilyId: family.FamilyId,
      CaregiverName: family.CaregiverName,
      FamilyLastName: family.FamilyLastName,
      ArrivalDate: family.ArrivalDate,
      SiteId: family.SiteId,
      SiteName: family.SiteName,
      RequiredCapacity: requiredCapacity,
      FlowStatus: volunteerUserId ? 'preparing' : 'prep_pending',
      Message: volunteerUserId
        ? `Tarea asignada a ${volunteerName} para preparar la habitación ${prepRoom.RoomCode}.`
        : `Habitación ${prepRoom.RoomCode} encontrada pero necesita preparación y todavía no hay voluntario de limpieza disponible.`,
      SuggestedRoomId: prepRoom.RoomId,
      SuggestedRoomCode: prepRoom.RoomCode,
      SuggestedRoomStatus: prepRoom.RoomStatus,
      AssignedVolunteerUserId: volunteerUserId,
      AssignedVolunteerName: volunteerName,
      ExistingTaskId: task?.VolunteerTaskId || null,
    }
  }

  return {
    FamilyId: family.FamilyId,
    CaregiverName: family.CaregiverName,
    FamilyLastName: family.FamilyLastName,
    ArrivalDate: family.ArrivalDate,
    SiteId: family.SiteId,
    SiteName: family.SiteName,
    RequiredCapacity: requiredCapacity,
    FlowStatus: 'unavailable',
    Message: `No encontramos habitación disponible o en preparación para la familia ${displayName}.`,
    SuggestedRoomId: null,
    SuggestedRoomCode: null,
    SuggestedRoomStatus: null,
    AssignedVolunteerUserId: null,
    AssignedVolunteerName: null,
    ExistingTaskId: null,
  }
}

export default withApi({ methods: ['GET', 'POST'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const localTomorrowExpression = "((CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date + INTERVAL '1 day')::date"

  if (req.method === 'GET') {
    const siteId = resolveScopedSiteId(req, req.query.siteId)
    const request = pool.request()
    let where = `WHERE f.AdmissionStatus = 'pendiente' AND r.ArrivalDate::date = ${localTomorrowExpression} AND fa.IsActive = TRUE`

    if (siteId) {
      request.input('siteId', sql.Int, siteId)
      where += ' AND f.SiteId = @siteId'
    }

    const result = await request.query(`
      SELECT
        f.FamilyId AS "FamilyId",
        f.SiteId AS "SiteId",
        f.RoomId AS "RoomId",
        f.CaregiverName AS "CaregiverName",
        f.FamilyLastName AS "FamilyLastName",
        r.ArrivalDate AS "ArrivalDate",
        r.CompanionCount AS "CompanionCount",
        s.Name AS "SiteName"
      FROM Families f
      INNER JOIN Referrals r ON r.ReferralId = f.ReferralId
      INNER JOIN FamilyAccess fa ON fa.FamilyId = f.FamilyId
      INNER JOIN Sites s ON s.SiteId = f.SiteId
      ${where}
      ORDER BY r.ArrivalDate ASC, f.CreatedAt ASC
    `)

    const flows = []
    for (const family of result.recordset) {
      flows.push(await buildArrivalFlow(pool, req, family))
    }

    return flows
  }

  required(req.body, ['familyId', 'roomId'])
  const familyId = toInt(req.body.familyId, 'familyId')
  const roomId = toInt(req.body.roomId, 'roomId')

  const familyResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT
        f.FamilyId,
        f.SiteId,
        f.CaregiverName,
        f.FamilyLastName,
        f.AdmissionStatus,
        r.ArrivalDate,
        r.CompanionCount
      FROM Families f
      INNER JOIN Referrals r ON r.ReferralId = f.ReferralId
      WHERE f.FamilyId = @familyId
    `)

  const family = familyResult.recordset[0]
  if (!family) throw new ApiError(404, 'Familia no encontrada')
  ensureSameOrGlobalSite(req, family.SiteId)

  const roomResult = await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`SELECT RoomId, SiteId, RoomCode, RoomStatus FROM Rooms WHERE RoomId = @roomId`)
  const room = roomResult.recordset[0]
  if (!room) throw new ApiError(404, 'Habitación no encontrada')
  if (Number(room.SiteId) !== Number(family.SiteId)) throw new ApiError(400, 'La habitación no pertenece a la misma sede')
  if (room.RoomStatus !== 'disponible') throw new ApiError(400, 'La habitación ya no está disponible')

  const occupiedFamily = await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`SELECT FamilyId FROM Families WHERE RoomId = @roomId LIMIT 1`)
  if (occupiedFamily.recordset[0]) throw new ApiError(400, 'La habitación ya está asignada a otra familia')

  await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .input('roomId', sql.Int, roomId)
    .query(`UPDATE Families SET RoomId = @roomId, UpdatedAt = NOW() WHERE FamilyId = @familyId`)

  const updatedRoom = await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`
      UPDATE Rooms
      SET RoomStatus = 'ocupada', OccupiedCount = 1, RoomNote = NULL, AvailableAt = NULL
      WHERE RoomId = @roomId
      RETURNING RoomId AS "RoomId", RoomCode AS "RoomCode", RoomStatus AS "RoomStatus"
    `)

  await notifySiteStaff(
    pool,
    family.SiteId,
    'Habitación asignada para llegada',
    `Habitación ${room.RoomCode} asignada a familia ${family.CaregiverName} ${family.FamilyLastName} a partir de mañana.`,
    'room',
    room.RoomId,
  )

  await logAudit({
    siteId: family.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'room.arrival_assigned',
    entityType: 'room',
    entityId: room.RoomId,
    metadata: { familyId, arrivalDate: family.ArrivalDate },
  })

  return {
    FamilyId: family.FamilyId,
    Room: updatedRoom.recordset[0],
    Message: `Habitación ${room.RoomCode} asignada a familia ${family.CaregiverName} ${family.FamilyLastName} a partir de mañana.`,
  }
})
