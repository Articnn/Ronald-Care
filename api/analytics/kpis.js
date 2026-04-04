import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)
  const whereClause = siteId ? 'WHERE SiteId = @siteId' : ''
  const withSite = (dbReq) => {
    if (siteId) dbReq.input('siteId', sql.Int, siteId)
    return dbReq
  }

  const avgAssignmentResult = await withSite(pool.request())
    .query(`
      SELECT AVG(EXTRACT(EPOCH FROM (AssignedAt - CreatedAt)) / 60) AS "avgAssignmentMinutes"
      FROM Requests
      ${whereClause}
    `)

  const urgentResult = await withSite(pool.request())
    .query(`
      SELECT
        SUM(CASE WHEN Urgency = 'alta' THEN 1 ELSE 0 END) AS "totalUrgent",
        SUM(
          CASE
            WHEN Urgency = 'alta' AND AssignedAt IS NOT NULL AND EXTRACT(EPOCH FROM (AssignedAt - CreatedAt)) / 60 <= 15
            THEN 1
            ELSE 0
          END
        ) AS "urgentWithinSla"
      FROM Requests
      ${whereClause}
    `)

  const backlogResult = await withSite(pool.request())
    .query(`
      SELECT
        day_series.day::date AS "day",
        (
          SELECT COUNT(*)
          FROM Requests r
          WHERE (${siteId ? 'r.SiteId = @siteId AND' : ''} r.CreatedAt::date <= day_series.day::date)
            AND (r.ResolvedAt IS NULL OR r.ResolvedAt::date > day_series.day::date)
        ) AS backlog
      FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') AS day_series(day)
      ORDER BY day_series.day
    `)

  const tripsByDestinationResult = await withSite(pool.request())
    .query(`
      SELECT Destination, AVG(COALESCE(DurationMinutes, 0)::float) AS "avgDurationMinutes"
      FROM Trips
      ${whereClause}
      GROUP BY Destination
      ORDER BY Destination
    `)

  const tripsByShiftResult = await withSite(pool.request())
    .query(`
      SELECT Shift, AVG(COALESCE(DurationMinutes, 0)::float) AS "avgDurationMinutes"
      FROM Trips
      ${whereClause}
      GROUP BY Shift
    `)

  const volunteerCoverageResult = await withSite(pool.request())
    .query(`
      SELECT
        COUNT(*) AS "totalShifts",
        SUM(CASE WHEN AvailabilityStatus = 'disponible' THEN 1 ELSE 0 END) AS "coveredShifts",
        SUM(HoursLogged) AS "totalHours"
      FROM VolunteerShifts
      ${whereClause}
    `)

  const avgAssignment = Math.round(Number(avgAssignmentResult.recordset[0].avgAssignmentMinutes || 0))
  const urgentRow = urgentResult.recordset[0]
  const totalUrgent = Number(urgentRow.totalUrgent || 0)
  const urgentWithinSla = Number(urgentRow.urgentWithinSla || 0)
  const slaPct = totalUrgent ? Math.round((urgentWithinSla / totalUrgent) * 100) : 0

  const volunteerRow = volunteerCoverageResult.recordset[0]
  const coveragePct = Number(volunteerRow.totalShifts || 0)
    ? Math.round((Number(volunteerRow.coveredShifts || 0) / Number(volunteerRow.totalShifts || 0)) * 100)
    : 0

  return {
    avgAssignmentMinutes: avgAssignment,
    slaUrgentPct: slaPct,
    backlogDaily: backlogResult.recordset,
    tripsByDestination: tripsByDestinationResult.recordset,
    tripsByShift: tripsByShiftResult.recordset,
    volunteerCoverage: {
      totalShifts: Number(volunteerRow.totalShifts || 0),
      coveredShifts: Number(volunteerRow.coveredShifts || 0),
      totalHours: Number(volunteerRow.totalHours || 0),
      coveragePct,
    },
  }
})
