import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff'] }, async (req) => {
  required(req.body, ['requestId', 'assignedRole', 'assignedDisplayName'])
  oneOf(req.body.assignedRole, ['staff', 'volunteer'], 'assignedRole')

  const pool = await getPool()
  const result = await pool
    .request()
    .input('requestId', sql.Int, toInt(req.body.requestId, 'requestId'))
    .input('assignedRole', sql.NVarChar(30), req.body.assignedRole)
    .input('assignedUserId', sql.Int, req.body.assignedUserId ? Number(req.body.assignedUserId) : null)
    .input('assignedDisplayName', sql.NVarChar(120), req.body.assignedDisplayName)
    .query(`
      UPDATE dbo.Requests
      SET AssignedRole = @assignedRole,
          AssignedUserId = @assignedUserId,
          AssignedDisplayName = @assignedDisplayName,
          Status = 'asignada',
          AssignedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE RequestId = @requestId
    `)

  const requestRow = result.recordset[0]
  if (!requestRow) throw new ApiError(404, 'Solicitud no encontrada')

  await logAudit({
    siteId: requestRow.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'request.assigned',
    entityType: 'request',
    entityId: requestRow.RequestId,
    metadata: { assignedRole: requestRow.AssignedRole, assignedUserId: requestRow.AssignedUserId },
  })

  return requestRow
})
