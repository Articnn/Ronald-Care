import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], authOptional: true }, async (req) => {
  const pool = await getPool()
  const siteName = req.query.siteName || null
  const bySiteRequest = pool.request()
  const feedRequest = pool.request()
  let where = ''
  if (siteName) {
    bySiteRequest.input('siteName', sql.NVarChar(100), siteName)
    feedRequest.input('siteName', sql.NVarChar(100), siteName)
    where = 'WHERE s.Name = @siteName'
  }

  const bySiteResult = await bySiteRequest.query(`
    SELECT
      s.SiteCode,
      s.Name,
      COUNT(ie.ImpactEventId) AS "impactEvents",
      COUNT(DISTINCT f.FamilyId) AS "familiesSupported",
      COUNT(DISTINCT t.TripId) AS "totalTrips",
      COUNT(DISTINCT r.RequestId) AS "totalRequests"
    FROM Sites s
    LEFT JOIN ImpactEvents ie ON ie.SiteId = s.SiteId AND ie.IsPublic = TRUE
    LEFT JOIN Families f ON f.SiteId = s.SiteId
    LEFT JOIN Trips t ON t.SiteId = s.SiteId
    LEFT JOIN Requests r ON r.SiteId = s.SiteId
    ${where}
    GROUP BY s.SiteCode, s.Name
    ORDER BY s.Name
  `)

  const feedResult = await feedRequest.query(`
    SELECT
      ie.ImpactEventId,
      s.SiteCode,
      s.Name AS SiteName,
      ie.EventType,
      ie.PublicTitle,
      ie.PublicDetail,
      ie.CreatedAt
    FROM ImpactEvents ie
    INNER JOIN Sites s ON s.SiteId = ie.SiteId
    WHERE ie.IsPublic = TRUE ${siteName ? 'AND s.Name = @siteName' : ''}
    ORDER BY ie.CreatedAt DESC
    LIMIT 20
  `)

  return {
    bySite: bySiteResult.recordset,
    feed: feedResult.recordset,
  }
})
