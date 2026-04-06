import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite, resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { createNotification, ensureNotificationTable } from '../../src/lib/notifications.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

const TASK_TYPES = ['cocina', 'lavanderia', 'traslados', 'acompanamiento', 'recepcion', 'limpieza', 'inventario']

export default withApi({ methods: ['GET', 'POST', 'PATCH'], roles: ['superadmin', 'admin', 'staff', 'volunteer'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  await ensureNotificationTable()

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
  if (req.body.requestedRoleName) oneOf(req.body.requestedRoleName, ['traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia', 'limpieza'], 'requestedRoleName')
    if (req.body.requestedShiftLabel) oneOf(req.body.requestedShiftLabel, ['manana', 'tarde', 'noche'], 'requestedShiftLabel')

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
      .input('requestedRoleName', sql.NVarChar(40), req.body.requestedRoleName || null)
      .input('requestedWorkDays', sql.NVarChar(120), Array.isArray(req.body.requestedWorkDays) ? req.body.requestedWorkDays.join(',') : null)
      .input('requestedStartTime', sql.NVarChar(5), req.body.requestedStartTime || null)
      .input('requestedEndTime', sql.NVarChar(5), req.body.requestedEndTime || null)
      .input('requestedShiftLabel', sql.NVarChar(20), req.body.requestedShiftLabel || null)
      .input('reason', sql.NVarChar(255), req.body.reason)
      .input('status', sql.NVarChar(20), 'pendiente')
      .query(`
        INSERT INTO VolunteerChangeRequests (SiteId, VolunteerUserId, RequestedShiftPeriod, RequestedTaskType, RequestedRoleName, RequestedWorkDays, RequestedStartTime, RequestedEndTime, RequestedShiftLabel, Reason, Status, CreatedAt, UpdatedAt)
        VALUES (@siteId, @volunteerUserId, @requestedShiftPeriod, @requestedTaskType, @requestedRoleName, @requestedWorkDays, @requestedStartTime, @requestedEndTime, @requestedShiftLabel, @reason, @status, NOW(), NOW())
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

  if (req.body.status === 'aprobada' && (changeRequest.RequestedShiftPeriod || changeRequest.RequestedTaskType || changeRequest.RequestedRoleName || changeRequest.RequestedWorkDays || changeRequest.RequestedStartTime || changeRequest.RequestedEndTime || changeRequest.RequestedShiftLabel)) {
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

    await pool
      .request()
      .input('userId', sql.Int, changeRequest.VolunteerUserId)
      .input('roleName', sql.NVarChar(40), changeRequest.RequestedRoleName)
      .input('workDays', sql.NVarChar(120), changeRequest.RequestedWorkDays)
      .input('startTime', sql.NVarChar(5), changeRequest.RequestedStartTime)
      .input('endTime', sql.NVarChar(5), changeRequest.RequestedEndTime)
      .input('shiftLabel', sql.NVarChar(20), changeRequest.RequestedShiftLabel)
      .input('shiftPeriod', sql.NVarChar(20), changeRequest.RequestedShiftPeriod)
      .query(`
        UPDATE VolunteerShifts
        SET RoleName = COALESCE(@roleName, RoleName),
            WorkDays = COALESCE(@workDays, WorkDays),
            StartTime = COALESCE(@startTime, StartTime),
            EndTime = COALESCE(@endTime, EndTime),
            ShiftLabel = COALESCE(@shiftLabel, ShiftLabel),
            ShiftPeriod = COALESCE(@shiftPeriod, ShiftPeriod)
        WHERE VolunteerShiftId = (
          SELECT VolunteerShiftId
          FROM VolunteerShifts
          WHERE UserId = @userId
          ORDER BY CreatedAt DESC
          LIMIT 1
        )
      `)
  }

  await createNotification({
    siteId: changeRequest.SiteId,
    userId: changeRequest.VolunteerUserId,
    type: req.body.status === 'aprobada' ? 'change_approved' : 'change_rejected',
    title: req.body.status === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada',
    message: req.body.status === 'aprobada' ? 'Tu solicitud de cambio fue aprobada.' : 'Tu solicitud de cambio fue rechazada.',
    relatedEntityType: 'volunteer_change_request',
    relatedEntityId: volunteerChangeRequestId,
  })

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
