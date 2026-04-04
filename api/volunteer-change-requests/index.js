import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite, resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

const TASK_TYPES = ['cocina', 'lavanderia', 'traslados', 'acompanamiento', 'recepcion', 'limpieza', 'inventario']

export default withApi({ methods: ['GET', 'POST', 'PATCH'], roles: ['superadmin', 'admin', 'staff', 'volunteer'] }, async (req) => {
  const pool = await getPool()

  if (req.method === 'GET') {
    const dbReq = pool.request()
    const filters = []

    if (req.auth.role === 'volunteer') {
      dbReq.input('volunteerUserId', sql.Int, req.auth.sub)
      filters.push('c.VolunteerUserId = @volunteerUserId')
    } else {
      const siteId = resolveScopedSiteId(req, req.query.siteId)
      if (siteId) {
        dbReq.input('siteId', sql.Int, siteId)
        filters.push('c.SiteId = @siteId')
      }
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await dbReq.query(`
      SELECT c.*, u.FullName AS VolunteerName
      FROM VolunteerChangeRequests c
      INNER JOIN Users u ON u.UserId = c.VolunteerUserId
      ${where}
      ORDER BY c.CreatedAt DESC
    `)

    return result.recordset
  }

  if (req.method === 'POST') {
    if (req.auth.role !== 'volunteer') throw new ApiError(403, 'Solo voluntariado puede solicitar cambios')
    required(req.body, ['reason'])
    if (req.body.requestedTaskType) oneOf(req.body.requestedTaskType, TASK_TYPES, 'requestedTaskType')
    if (req.body.requestedShiftPeriod) oneOf(req.body.requestedShiftPeriod, ['AM', 'PM'], 'requestedShiftPeriod')

    const userResult = await pool
      .request()
      .input('userId', sql.Int, req.auth.sub)
      .query(`SELECT UserId, SiteId FROM Users WHERE UserId = @userId`)
    const volunteer = userResult.recordset[0]

    const result = await pool
      .request()
      .input('siteId', sql.Int, volunteer.SiteId)
      .input('volunteerUserId', sql.Int, req.auth.sub)
      .input('requestedShiftPeriod', sql.NVarChar(20), req.body.requestedShiftPeriod || null)
      .input('requestedTaskType', sql.NVarChar(40), req.body.requestedTaskType || null)
      .input('reason', sql.NVarChar(255), req.body.reason)
      .input('status', sql.NVarChar(20), 'pendiente')
      .query(`
        INSERT INTO VolunteerChangeRequests (SiteId, VolunteerUserId, RequestedShiftPeriod, RequestedTaskType, Reason, Status, CreatedAt, UpdatedAt)
        VALUES (@siteId, @volunteerUserId, @requestedShiftPeriod, @requestedTaskType, @reason, @status, NOW(), NOW())
        RETURNING *
      `)

    await logAudit({
      siteId: volunteer.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'volunteer.change_requested',
      entityType: 'volunteer_change_request',
      entityId: result.recordset[0].VolunteerChangeRequestId,
      metadata: { requestedTaskType: req.body.requestedTaskType, requestedShiftPeriod: req.body.requestedShiftPeriod },
    })

    return result.recordset[0]
  }

  required(req.body, ['volunteerChangeRequestId', 'status'])
  if (!['superadmin', 'admin', 'staff'].includes(req.auth.role)) throw new ApiError(403, 'Solo staff o admin pueden revisar cambios')
  oneOf(req.body.status, ['aprobada', 'rechazada'], 'status')

  const volunteerChangeRequestId = toInt(req.body.volunteerChangeRequestId, 'volunteerChangeRequestId')
  const changeResult = await pool
    .request()
    .input('volunteerChangeRequestId', sql.Int, volunteerChangeRequestId)
    .query(`SELECT * FROM VolunteerChangeRequests WHERE VolunteerChangeRequestId = @volunteerChangeRequestId`)

  const changeRequest = changeResult.recordset[0]
  if (!changeRequest) throw new ApiError(404, 'Solicitud de cambio no encontrada')
  ensureSameOrGlobalSite(req, changeRequest.SiteId)

  const updatedResult = await pool
    .request()
    .input('volunteerChangeRequestId', sql.Int, volunteerChangeRequestId)
    .input('status', sql.NVarChar(20), req.body.status)
    .input('reviewedByUserId', sql.Int, req.auth.sub)
    .query(`
      UPDATE VolunteerChangeRequests
      SET Status = @status, ReviewedByUserId = @reviewedByUserId, UpdatedAt = NOW()
      WHERE VolunteerChangeRequestId = @volunteerChangeRequestId
      RETURNING *
    `)

  if (req.body.status === 'aprobada' && (changeRequest.RequestedShiftPeriod || changeRequest.RequestedTaskType)) {
    await pool
      .request()
      .input('userId', sql.Int, changeRequest.VolunteerUserId)
      .input('shiftPeriod', sql.NVarChar(20), changeRequest.RequestedShiftPeriod)
      .input('taskType', sql.NVarChar(40), changeRequest.RequestedTaskType)
      .query(`
        UPDATE VolunteerTasks
        SET ShiftPeriod = COALESCE(@shiftPeriod, ShiftPeriod),
            TaskType = COALESCE(@taskType, TaskType),
            UpdatedAt = NOW()
        WHERE VolunteerUserId = @userId AND Status IN ('pendiente', 'en_proceso')
      `)
  }

  await logAudit({
    siteId: changeRequest.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'volunteer.change_reviewed',
    entityType: 'volunteer_change_request',
    entityId: volunteerChangeRequestId,
    metadata: { status: req.body.status },
  })

  return updatedResult.recordset[0]
})
