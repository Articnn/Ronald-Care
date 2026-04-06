import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)
  const dbReq = pool.request()
  let where = 'WHERE 1=1'
  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    where += ' AND SiteId = @siteId'
  }

  const result = await dbReq.query(`
      SELECT
        i.InventoryItemId,
        i.ItemCode,
        i.Name,
        i.ItemCategory,
        i.Unit,
        i.Stock,
        i.MinStock,
        i.ExpiryDate,
        CASE WHEN i.Stock <= i.MinStock THEN TRUE ELSE FALSE END AS LowStock,
        CASE WHEN i.ExpiryDate IS NOT NULL AND i.ExpiryDate <= CURRENT_DATE + INTERVAL '7 days' THEN TRUE ELSE FALSE END AS ExpiringSoon,
        lm.Reason AS LastMovementReason,
        lm.CreatedAt AS LastMovementAt
      FROM InventoryItems i
      LEFT JOIN LATERAL (
        SELECT Reason, CreatedAt
        FROM InventoryMovements im
        WHERE im.InventoryItemId = i.InventoryItemId
        ORDER BY im.CreatedAt DESC
        LIMIT 1
      ) lm ON TRUE
      ${where.replace(/SiteId/g, 'i.SiteId')}
      ORDER BY i.ItemCategory, i.Name
    `)

  return result.recordset
})
