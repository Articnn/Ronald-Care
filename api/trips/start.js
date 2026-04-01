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
      UPDATE dbo.Trips
      SET Status = 'en_curso', StartedAt = ISNULL(StartedAt, SYSUTCDATETIME())
      OUTPUT INSERTED.*
      WHERE TripId = @tripId
    `)

  const trip = result.recordset[0]
  if (!trip) throw new ApiError(404, 'Viaje no encontrado')

  await logAudit({
    siteId: trip.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'trip.started',
    entityType: 'trip',
    entityId: trip.TripId,
    metadata: { shift: trip.Shift },
  })

  return trip
})
