import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff'] }, async (req) => {
  const pool = await getPool()
  const siteId = req.query.siteId ? Number(req.query.siteId) : req.auth.siteId

  const avgAssignmentResult = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT AVG(EXTRACT(EPOCH FROM (AssignedAt - CreatedAt)) / 60) AS "avgAssignmentMinutes"
      FROM Requests
      WHERE SiteId = @siteId
    `)

  const urgentResult = await pool
    .request()
    .input('siteId', sql.Int, siteId)
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
      WHERE SiteId = @siteId
    `)

  const backlogResult = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT
        day_series.day::date AS "day",
        (
          SELECT COUNT(*)
          FROM Requests r
          WHERE r.SiteId = @siteId
            AND r.CreatedAt::date <= day_series.day::date
            AND (r.ResolvedAt IS NULL OR r.ResolvedAt::date > day_series.day::date)
        ) AS backlog
      FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') AS day_series(day)
      ORDER BY day_series.day
    `)

  const tripsByDestinationResult = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT Destination, AVG(COALESCE(DurationMinutes, 0)::float) AS "avgDurationMinutes"
      FROM Trips
      WHERE SiteId = @siteId
      GROUP BY Destination
      ORDER BY Destination
    `)

  const tripsByShiftResult = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT Shift, AVG(COALESCE(DurationMinutes, 0)::float) AS "avgDurationMinutes"
      FROM Trips
      WHERE SiteId = @siteId
      GROUP BY Shift
    `)

  const volunteerCoverageResult = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT
        COUNT(*) AS "totalShifts",
        SUM(CASE WHEN AvailabilityStatus = 'disponible' THEN 1 ELSE 0 END) AS "coveredShifts",
        SUM(HoursLogged) AS "totalHours"
      FROM VolunteerShifts
      WHERE SiteId = @siteId
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
