import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff', 'volunteer'] }, async (req) => {
  required(req.body, ['requestId'])

  const pool = await getPool()
  const result = await pool
    .request()
    .input('requestId', sql.Int, toInt(req.body.requestId, 'requestId'))
    .query(`
      UPDATE dbo.Requests
      SET Status = 'resuelta', ResolvedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE RequestId = @requestId
    `)

  const requestRow = result.recordset[0]
  if (!requestRow) throw new ApiError(404, 'Solicitud no encontrada')

  await pool
    .request()
    .input('siteId', sql.Int, requestRow.SiteId)
    .input('eventType', sql.NVarChar(50), 'request_resolved')
    .input('sourceEntityType', sql.NVarChar(50), 'request')
    .input('sourceEntityId', sql.Int, requestRow.RequestId)
    .input('publicTitle', sql.NVarChar(150), 'Solicitud resuelta')
    .input('publicDetail', sql.NVarChar(400), `Se completo un apoyo de ${requestRow.RequestType} dentro del flujo operativo.`)
    .input('isPublic', sql.Bit, 1)
    .query(`
      INSERT INTO dbo.ImpactEvents (SiteId, EventType, SourceEntityType, SourceEntityId, PublicTitle, PublicDetail, IsPublic)
      VALUES (@siteId, @eventType, @sourceEntityType, @sourceEntityId, @publicTitle, @publicDetail, @isPublic)
    `)

  await logAudit({
    siteId: requestRow.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'request.resolved',
    entityType: 'request',
    entityId: requestRow.RequestId,
    metadata: { requestType: requestRow.RequestType },
  })

  return requestRow
})
