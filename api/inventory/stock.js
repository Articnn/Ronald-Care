import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)
  const dbReq = pool.request()
  let where = 'WHERE 1=1'
  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    where += ' AND SiteId = @siteId'
  }

  const result = await dbReq.query(`
      SELECT InventoryItemId, ItemCode, Name, Unit, Stock, MinStock,
             CASE WHEN Stock <= MinStock THEN TRUE ELSE FALSE END AS LowStock
      FROM InventoryItems
      ${where}
      ORDER BY Name
    `)

  return result.recordset
})
