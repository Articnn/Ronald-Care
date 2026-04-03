import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff', 'volunteer'] }, async (req) => {
  required(req.body, ['tripId'])

  const pool = await getPool()
  const result = await pool
    .request()
    .input('tripId', sql.Int, toInt(req.body.tripId, 'tripId'))
    .query(`
      UPDATE Trips
      SET
        Status = 'finalizado',
        EndedAt = NOW(),
        DurationMinutes = FLOOR(EXTRACT(EPOCH FROM (NOW() - StartedAt)) / 60)
      WHERE TripId = @tripId AND StartedAt IS NOT NULL
      RETURNING *
    `)

  const trip = result.recordset[0]
  if (!trip) throw new ApiError(404, 'Viaje no encontrado o no iniciado')

  await logAudit({
    siteId: trip.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'trip.finished',
    entityType: 'trip',
    entityId: trip.TripId,
    metadata: { durationMinutes: trip.DurationMinutes, shift: trip.Shift },
  })

  return trip
})
