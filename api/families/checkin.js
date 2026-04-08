import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  required(req.body, ['familyId'])

  const pool = await getPool()
  const familyId = toInt(req.body.familyId, 'familyId')
  const roomId = req.body.roomId ? toInt(req.body.roomId, 'roomId') : null

  const result = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .input('roomId', sql.Int, roomId)
    .input('idVerified', sql.Bit, Boolean(req.body.idVerified))
    .input('regulationAccepted', sql.Bit, Boolean(req.body.regulationAccepted))
    .input('simpleSignature', sql.NVarChar(150), req.body.simpleSignature || null)
    .query(`
      UPDATE Families
      SET
        RoomId = @roomId,
        IdVerified = @idVerified,
        RegulationAccepted = @regulationAccepted,
        SimpleSignature = @simpleSignature,
        AdmissionStatus = 'checkin_completado',
        CheckInCompletedAt = NOW(),
        UpdatedAt = NOW()
      WHERE FamilyId = @familyId
      RETURNING *
    `)

  const family = result.recordset[0]
  if (!family) throw new ApiError(404, 'Familia no encontrada')
  ensureSameOrGlobalSite(req, family.SiteId)

  if (roomId) {
    await pool
      .request()
      .input('roomId', sql.Int, roomId)
      .query(`
        UPDATE Rooms
        SET RoomStatus = 'ocupada', OccupiedCount = 1, AvailableAt = NULL, RoomNote = NULL
        WHERE RoomId = @roomId
      `)
  }

  await logAudit({
    siteId: family.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'checkin.completed',
    entityType: 'family',
    entityId: family.FamilyId,
    metadata: { roomId },
  })

  await pool
    .request()
    .input('siteId', sql.Int, family.SiteId)
    .input('eventType', sql.NVarChar(50), 'checkin_completed')
    .input('sourceEntityType', sql.NVarChar(50), 'family')
    .input('sourceEntityId', sql.Int, family.FamilyId)
    .input('publicTitle', sql.NVarChar(150), 'Nueva familia recibida')
    .input('publicDetail', sql.NVarChar(400), 'Check-in operativo completado y ficha familia emitida sin incidencias.')
    .input('isPublic', sql.Bit, 1)
    .query(`
      INSERT INTO ImpactEvents (SiteId, EventType, SourceEntityType, SourceEntityId, PublicTitle, PublicDetail, IsPublic)
      VALUES (@siteId, @eventType, @sourceEntityType, @sourceEntityId, @publicTitle, @publicDetail, @isPublic)
    `)

  return family
})
