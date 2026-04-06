import { getPool } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], authOptional: true }, async () => {
  const pool = await getPool()
  const result = await pool.request().query(`
    SELECT
      id,
      image_url   AS "image_url",
      impact_title AS "impact_title",
      description AS "description",
      site        AS "site",
      month       AS "month"
    FROM impactgallery
    ORDER BY month DESC, id ASC
  `)
  return result.recordset
})
