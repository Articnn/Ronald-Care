import { getPool } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], authOptional: true }, async () => {
  const pool = await getPool()
  const result = await pool.request().query(`
    SELECT
      s.SiteCode,
      s.Name,
      COUNT(CASE WHEN ie.IsPublic = 1 THEN 1 END) AS impactEvents,
      COUNT(DISTINCT f.FamilyId) AS familiesSupported,
      COUNT(DISTINCT t.TripId) AS totalTrips,
      COUNT(DISTINCT r.RequestId) AS totalRequests
    FROM dbo.Sites s
    LEFT JOIN dbo.ImpactEvents ie ON ie.SiteId = s.SiteId AND ie.IsPublic = 1
    LEFT JOIN dbo.Families f ON f.SiteId = s.SiteId
    LEFT JOIN dbo.Trips t ON t.SiteId = s.SiteId
    LEFT JOIN dbo.Requests r ON r.SiteId = s.SiteId
    GROUP BY s.SiteCode, s.Name
    ORDER BY s.Name;

    SELECT TOP 20
      ie.ImpactEventId,
      s.SiteCode,
      s.Name AS SiteName,
      ie.EventType,
      ie.PublicTitle,
      ie.PublicDetail,
      ie.CreatedAt
    FROM dbo.ImpactEvents ie
    INNER JOIN dbo.Sites s ON s.SiteId = ie.SiteId
    WHERE ie.IsPublic = 1
    ORDER BY ie.CreatedAt DESC;
  `)

  return {
    bySite: result.recordsets[0],
    feed: result.recordsets[1],
  }
})
