import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['POST'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  required(req.body, ['familyId'])

  const pool = await getPool()
  const familyId = toInt(req.body.familyId, 'familyId')

  // Verificar que la familia existe y tiene habitación asignada
  const familyResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT
        f.FamilyId, f.SiteId, f.RoomId,
        f.CaregiverName, f.FamilyLastName,
        r.RoomCode, r.RoomId AS RoomId
      FROM Families f
      INNER JOIN Rooms r ON r.RoomId = f.RoomId
      WHERE f.FamilyId = @familyId
        AND f.RoomId IS NOT NULL
    `)

  const family = familyResult.recordset[0]
  if (!family) throw new ApiError(400, 'La familia no tiene una habitación asignada')

  ensureSameOrGlobalSite(req, family.SiteId)

  // Liberar habitación: quitar asignación de la familia
  await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      UPDATE Families
      SET RoomId = NULL, UpdatedAt = NOW()
      WHERE FamilyId = @familyId
    `)

  // Actualizar estado de la habitación
  const updateResult = await pool
    .request()
    .input('roomId', sql.Int, family.RoomId)
    .query(`
      UPDATE Rooms
      SET
        RoomStatus = CASE
          WHEN (OccupiedCount - 1) > 0 THEN 'ocupada'
          ELSE 'disponible'
        END,
        OccupiedCount = CASE
          WHEN OccupiedCount > 0 THEN OccupiedCount - 1
          ELSE 0
        END,
        AvailableAt = NOW()
      WHERE RoomId = @roomId
      RETURNING *
    `)

  const room = updateResult.recordset[0]

  await logAudit({
    siteId: family.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'room.released',
    entityType: 'family',
    entityId: familyId,
    metadata: { roomId: family.RoomId, roomCode: family.RoomCode },
  })

  return {
    success: true,
    data: {
      familyId: family.FamilyId,
      roomId: family.RoomId,
      roomCode: family.RoomCode,
      caregiverName: family.CaregiverName,
      familyLastName: family.FamilyLastName,
      newRoomStatus: room.RoomStatus,
    },
  }
})
