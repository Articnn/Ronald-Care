import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff'] }, async (req) => {
  const pool = await getPool()
  const siteId = req.query.siteId ? Number(req.query.siteId) : req.auth.siteId

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT AVG(CASE WHEN AssignedAt IS NOT NULL THEN DATEDIFF(MINUTE, CreatedAt, AssignedAt) END) AS avgAssignmentMinutes
      FROM dbo.Requests
      WHERE SiteId = @siteId;

      SELECT
        SUM(CASE WHEN Urgency = 'alta' THEN 1 ELSE 0 END) AS totalUrgent,
        SUM(CASE WHEN Urgency = 'alta' AND AssignedAt IS NOT NULL AND DATEDIFF(MINUTE, CreatedAt, AssignedAt) <= 15 THEN 1 ELSE 0 END) AS urgentWithinSla
      FROM dbo.Requests
      WHERE SiteId = @siteId;

      WITH Days AS (
        SELECT CAST(DATEADD(DAY, -6, CAST(SYSUTCDATETIME() AS DATE)) AS DATE) AS d
        UNION ALL
        SELECT DATEADD(DAY, 1, d) FROM Days WHERE d < CAST(SYSUTCDATETIME() AS DATE)
      )
      SELECT
        d AS [day],
        (
          SELECT COUNT(*)
          FROM dbo.Requests r
          WHERE r.SiteId = @siteId
            AND CAST(r.CreatedAt AS DATE) <= d
            AND (r.ResolvedAt IS NULL OR CAST(r.ResolvedAt AS DATE) > d)
        ) AS backlog
      FROM Days
      OPTION (MAXRECURSION 7);

      SELECT Destination, AVG(CAST(ISNULL(DurationMinutes, 0) AS FLOAT)) AS avgDurationMinutes
      FROM dbo.Trips
      WHERE SiteId = @siteId
      GROUP BY Destination
      ORDER BY Destination;

      SELECT Shift, AVG(CAST(ISNULL(DurationMinutes, 0) AS FLOAT)) AS avgDurationMinutes
      FROM dbo.Trips
      WHERE SiteId = @siteId
      GROUP BY Shift;

      SELECT
        COUNT(*) AS totalShifts,
        SUM(CASE WHEN AvailabilityStatus = 'disponible' THEN 1 ELSE 0 END) AS coveredShifts,
        SUM(HoursLogged) AS totalHours
      FROM dbo.VolunteerShifts
      WHERE SiteId = @siteId;
    `)

  const avgAssignment = Math.round(Number(result.recordsets[0][0].avgAssignmentMinutes || 0))
  const urgentRow = result.recordsets[1][0]
  const totalUrgent = Number(urgentRow.totalUrgent || 0)
  const urgentWithinSla = Number(urgentRow.urgentWithinSla || 0)
  const slaPct = totalUrgent ? Math.round((urgentWithinSla / totalUrgent) * 100) : 0

  const volunteerRow = result.recordsets[5][0]
  const coveragePct = Number(volunteerRow.totalShifts || 0)
    ? Math.round((Number(volunteerRow.coveredShifts || 0) / Number(volunteerRow.totalShifts || 0)) * 100)
    : 0

  return {
    avgAssignmentMinutes: avgAssignment,
    slaUrgentPct: slaPct,
    backlogDaily: result.recordsets[2],
    tripsByDestination: result.recordsets[3],
    tripsByShift: result.recordsets[4],
    volunteerCoverage: {
      totalShifts: Number(volunteerRow.totalShifts || 0),
      coveredShifts: Number(volunteerRow.coveredShifts || 0),
      totalHours: Number(volunteerRow.totalHours || 0),
      coveragePct,
    },
  }
})
