import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { calculatePriority } from '../../src/lib/priority.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'POST'], roles: ['staff', 'volunteer', 'family', 'admin', 'superadmin'] }, async (req) => {
  const pool = await getPool()

  if (req.method === 'GET') {
    const filters = []
    const dbReq = pool.request()

    if (req.auth.role === 'family') {
      dbReq.input('familyId', sql.Int, req.auth.familyId)
      filters.push('FamilyId = @familyId')
    } else {
      const siteId = resolveScopedSiteId(req, req.query.siteId)
      if (siteId) {
        dbReq.input('siteId', sql.Int, siteId)
        filters.push('SiteId = @siteId')
      }

      if (req.auth.role === 'volunteer') {
        dbReq.input('assignedRole', sql.NVarChar(30), 'volunteer')
        dbReq.input('assignedUserId', sql.Int, req.auth.sub)
        filters.push('AssignedRole = @assignedRole')
        filters.push('(AssignedUserId = @assignedUserId OR AssignedUserId IS NULL)')
      }
    }

    if (req.query.status) {
      dbReq.input('status', sql.NVarChar(30), req.query.status)
      filters.push('Status = @status')
    } else {
      filters.push(`Status <> 'borrador_extraido'`)
    }
    if (req.query.requestType) {
      dbReq.input('requestType', sql.NVarChar(30), req.query.requestType)
      filters.push('RequestType = @requestType')
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await dbReq.query(`
      SELECT *
      FROM Requests
      ${whereClause}
      ORDER BY
        CASE PriorityLabel WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
        PriorityScore DESC,
        CreatedAt DESC
    `)

    return result.recordset
  }

  required(req.body, ['familyId', 'title', 'requestType', 'urgency'])
  oneOf(req.body.requestType, ['transporte', 'kit', 'alimento', 'recepcion'], 'requestType')
  oneOf(req.body.urgency, ['baja', 'media', 'alta'], 'urgency')

  const waitingMinutes = Number(req.body.waitingMinutes || 0)
  const priority = calculatePriority({
    urgency: req.body.urgency,
    waitingMinutes,
    requestType: req.body.requestType,
    optionalWindow: req.body.optionalWindow || null,
  })

  const createdBySource = req.auth.role === 'family' ? 'family' : 'staff'
  const assignedRole = req.body.requestType === 'transporte' ? 'volunteer' : 'staff'
  const assignedDisplayName = assignedRole === 'volunteer' ? 'Pendiente voluntariado' : 'Pendiente staff'
  const createdByUserId = req.auth.role === 'family' ? null : req.auth.sub
  const familyId = req.auth.role === 'family' ? req.auth.familyId : toInt(req.body.familyId, 'familyId')

  const familyResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`SELECT FamilyId, SiteId FROM Families WHERE FamilyId = @familyId`)
  const family = familyResult.recordset[0]

  const insert = await pool
    .request()
    .input('siteId', sql.Int, family.SiteId)
    .input('familyId', sql.Int, family.FamilyId)
    .input('createdByUserId', sql.Int, createdByUserId)
    .input('createdBySource', sql.NVarChar(20), createdBySource)
    .input('title', sql.NVarChar(160), req.body.title)
    .input('requestType', sql.NVarChar(30), req.body.requestType)
    .input('urgency', sql.NVarChar(20), req.body.urgency)
    .input('optionalWindow', sql.NVarChar(30), req.body.optionalWindow || null)
    .input('priorityScore', sql.Int, priority.score)
    .input('priorityLabel', sql.NVarChar(20), priority.label)
    .input('priorityReason', sql.NVarChar(255), priority.reason)
    .input('status', sql.NVarChar(30), 'nueva')
    .input('assignedRole', sql.NVarChar(30), assignedRole)
    .input('assignedDisplayName', sql.NVarChar(120), assignedDisplayName)
    .query(`
      INSERT INTO Requests (
        SiteId, FamilyId, CreatedByUserId, CreatedBySource, Title, RequestType, Urgency, OptionalWindow,
        PriorityScore, PriorityLabel, PriorityReason, Status, AssignedRole, AssignedDisplayName
      )
      VALUES (
        @siteId, @familyId, @createdByUserId, @createdBySource, @title, @requestType, @urgency, @optionalWindow,
        @priorityScore, @priorityLabel, @priorityReason, @status, @assignedRole, @assignedDisplayName
      )
      RETURNING *
    `)

  const requestRow = insert.recordset[0]
  await logAudit({
    siteId: requestRow.SiteId,
    actorUserId: req.auth.role === 'family' ? null : req.auth.sub,
    actorFamilyId: req.auth.role === 'family' ? req.auth.familyId : null,
    eventType: 'request.created',
    entityType: 'request',
    entityId: requestRow.RequestId,
    metadata: { requestType: requestRow.RequestType, urgency: requestRow.Urgency, priorityScore: requestRow.PriorityScore },
  })

  return requestRow
})
