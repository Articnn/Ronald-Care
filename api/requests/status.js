import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff', 'volunteer'] }, async (req) => {
  required(req.body, ['requestId', 'status'])
  oneOf(req.body.status, ['asignada', 'en_proceso'], 'status')

  const pool = await getPool()
  const result = await pool
    .request()
    .input('requestId', sql.Int, toInt(req.body.requestId, 'requestId'))
    .input('status', sql.NVarChar(30), req.body.status)
    .query(`
      UPDATE dbo.Requests
      SET Status = @status
      OUTPUT INSERTED.*
      WHERE RequestId = @requestId
    `)

  const requestRow = result.recordset[0]
  if (!requestRow) throw new ApiError(404, 'Solicitud no encontrada')

  await logAudit({
    siteId: requestRow.SiteId,
    actorUserId: req.auth.sub,
    eventType: `request.${requestRow.Status}`,
    entityType: 'request',
    entityId: requestRow.RequestId,
    metadata: { status: requestRow.Status },
  })

  return requestRow
})
