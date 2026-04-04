import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'POST'], roles: ['staff', 'volunteer', 'family', 'admin', 'superadmin'] }, async (req) => {
  const pool = await getPool()

  if (req.method === 'GET') {
    const dbReq = pool.request()
    const filters = []

    if (req.auth.role === 'family') {
      dbReq.input('familyId', sql.Int, req.auth.familyId)
      filters.push('FamilyId = @familyId')
    } else if (req.auth.role === 'volunteer') {
      dbReq.input('assignedUserId', sql.Int, req.auth.sub)
      filters.push('(AssignedUserId = @assignedUserId OR AssignedUserId IS NULL)')
    } else {
      const siteId = resolveScopedSiteId(req, req.query.siteId)
      if (siteId) {
        dbReq.input('siteId', sql.Int, siteId)
        filters.push('SiteId = @siteId')
      }
    }

    if (req.query.shift) {
      dbReq.input('shift', sql.NVarChar(2), req.query.shift)
      filters.push('Shift = @shift')
    }
    if (req.query.status) {
      dbReq.input('status', sql.NVarChar(30), req.query.status)
      filters.push('Status = @status')
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await dbReq.query(`
      SELECT *
      FROM Trips
      ${whereClause}
      ORDER BY CreatedAt DESC
    `)
    return result.recordset
  }

  required(req.body, ['familyId', 'destination', 'shift'])
  oneOf(req.body.shift, ['AM', 'PM'], 'shift')

  const familyId = toInt(req.body.familyId, 'familyId')
  const familyResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`SELECT FamilyId, SiteId FROM Families WHERE FamilyId = @familyId`)
  const family = familyResult.recordset[0]

  const result = await pool
    .request()
    .input('siteId', sql.Int, family.SiteId)
    .input('familyId', sql.Int, familyId)
    .input('relatedRequestId', sql.Int, req.body.relatedRequestId ? Number(req.body.relatedRequestId) : null)
    .input('destination', sql.NVarChar(160), req.body.destination)
    .input('shift', sql.NVarChar(2), req.body.shift)
    .input('assignedUserId', sql.Int, req.body.assignedUserId ? Number(req.body.assignedUserId) : null)
    .input('assignedDisplayName', sql.NVarChar(120), req.body.assignedDisplayName || 'Pendiente asignacion')
    .input('status', sql.NVarChar(30), 'pendiente')
    .query(`
      INSERT INTO Trips (SiteId, FamilyId, RelatedRequestId, Destination, Shift, AssignedUserId, AssignedDisplayName, Status)
      VALUES (@siteId, @familyId, @relatedRequestId, @destination, @shift, @assignedUserId, @assignedDisplayName, @status)
      RETURNING *
    `)

  const trip = result.recordset[0]
  await logAudit({
    siteId: trip.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'trip.created',
    entityType: 'trip',
    entityId: trip.TripId,
    metadata: { shift: trip.Shift, destination: trip.Destination },
  })

  return trip
})
