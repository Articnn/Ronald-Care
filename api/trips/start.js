import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff', 'volunteer', 'admin', 'superadmin'] }, async (req) => {
  required(req.body, ['tripId'])

  const pool = await getPool()
  const result = await pool
    .request()
    .input('tripId', sql.Int, toInt(req.body.tripId, 'tripId'))
    .query(`
      UPDATE Trips
      SET Status = 'en_curso', StartedAt = COALESCE(StartedAt, NOW())
      WHERE TripId = @tripId
      RETURNING *
    `)

  const trip = result.recordset[0]
  if (!trip) throw new ApiError(404, 'Viaje no encontrado')
  if (req.auth.role !== 'volunteer') ensureSameOrGlobalSite(req, trip.SiteId)

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
