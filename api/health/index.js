import { getPool } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], authOptional: true }, async () => {
  const pool = await getPool()
  const result = await pool.request().query('SELECT 1 AS ok, DB_NAME() AS databaseName')
  return {
    service: 'ronaldcare-serverless-api',
    status: 'healthy',
    database: result.recordset[0].databaseName,
  }
})
