import { getPool } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

const CURRENT_YEAR = new Date().getFullYear()

export default withApi({ methods: ['GET'], authOptional: true }, async () => {
  const pool = await getPool()
  const result = await pool.request().query(
    `SELECT
      id,
      event_title  AS "event_title",
      description  AS "description",
      site         AS "site",
      date         AS "date",
      image_url    AS "image_url"
    FROM events
    WHERE EXTRACT(YEAR FROM date) = ${CURRENT_YEAR}
    ORDER BY date ASC`,
  )
  return result.recordset
})
