import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  required(req.body, ['familyId', 'roomId'])

  const pool = await getPool()
  const familyId = toInt(req.body.familyId, 'familyId')
  const roomId = toInt(req.body.roomId, 'roomId')

  // Verificar que la familia existe y está aceptada
  const familyResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT
        f.FamilyId, f.SiteId, f.ReferralId, f.RoomId,
        f.CaregiverName, f.FamilyLastName, f.AdmissionStatus,
        r.RoomCode AS CurrentRoomCode
      FROM Families f
      LEFT JOIN Rooms r ON r.RoomId = f.RoomId
      WHERE f.FamilyId = @familyId
    `)

  const family = familyResult.recordset[0]
  if (!family) throw new ApiError(404, 'Familia no encontrada')

  if (family.AdmissionStatus !== 'checkin_completado') {
    throw new ApiError(400, 'La familia debe tener check-in completado para asignar habitación')
  }

  if (family.RoomId) {
    throw new ApiError(400, `La familia ya está asignada a la habitación ${family.CurrentRoomCode}`)
  }

  ensureSameOrGlobalSite(req, family.SiteId)

  // Verificar que la habitación existe, está activa y es de la misma sede
  const roomResult = await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`
      SELECT
        r.RoomId, r.SiteId, r.RoomCode, r.Capacity, r.RoomStatus, r.OccupiedCount
      FROM Rooms r
      WHERE r.RoomId = @roomId AND r.isactive = TRUE
    `)

  const room = roomResult.recordset[0]
  if (!room) throw new ApiError(404, 'Habitación no encontrada o inactiva')

  ensureSameOrGlobalSite(req, room.SiteId)

  // Verificar que la habitación está disponible
  if (room.RoomStatus !== 'disponible') {
    throw new ApiError(400, `La habitación no está disponible. Estado: ${room.RoomStatus}`)
  }

  // Verificar capacidad (asumimos 1 familia por habitación)
  if (room.OccupiedCount >= room.Capacity) {
    throw new ApiError(400, 'La habitación está llena')
  }

  // Asignar habitación a la familia
  const assignResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .input('roomId', sql.Int, roomId)
    .query(`
      UPDATE Families
      SET RoomId = @roomId, UpdatedAt = NOW()
      WHERE FamilyId = @familyId
      RETURNING *
    `)

  // Actualizar estado de la habitación
  await pool
    .request()
    .input('roomId', sql.Int, roomId)
    .query(`
      UPDATE Rooms
      SET
        RoomStatus = 'ocupada',
        OccupiedCount = OccupiedCount + 1,
        AvailableAt = NULL,
        RoomNote = NULL
      WHERE RoomId = @roomId
    `)

  await logAudit({
    siteId: room.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'room.assigned',
    entityType: 'family',
    entityId: familyId,
    metadata: { roomId, roomCode: room.RoomCode },
  })

  return {
    success: true,
    data: {
      familyId: family.FamilyId,
      roomId: room.RoomId,
      roomCode: room.RoomCode,
      caregiverName: family.CaregiverName,
      familyLastName: family.FamilyLastName,
    },
  }
})
