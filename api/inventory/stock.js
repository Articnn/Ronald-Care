import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff'] }, async (req) => {
  const pool = await getPool()
  const siteId = req.query.siteId ? Number(req.query.siteId) : req.auth.siteId

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT InventoryItemId, ItemCode, Name, Unit, Stock, MinStock,
             CASE WHEN Stock <= MinStock THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS LowStock
      FROM InventoryItems
      WHERE SiteId = @siteId
      ORDER BY Name
    `)

  return result.recordset
})
