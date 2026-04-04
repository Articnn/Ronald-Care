import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite, isGlobalRole, resolveScopedSiteId } from '../../src/lib/access.js'
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
      filters.push('t.VolunteerUserId = @volunteerUserId')
    } else {
      const siteId = resolveScopedSiteId(req, req.query.siteId)
      if (siteId) {
        dbReq.input('siteId', sql.Int, siteId)
        filters.push('t.SiteId = @siteId')
      }
      if (req.query.volunteerUserId) {
        dbReq.input('volunteerUserId', sql.Int, Number(req.query.volunteerUserId))
        filters.push('t.VolunteerUserId = @volunteerUserId')
      }
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await dbReq.query(`
      SELECT
        t.*, v.FullName AS VolunteerName, a.FullName AS AssignedByName, s.Name AS SiteName
      FROM VolunteerTasks t
      INNER JOIN Users v ON v.UserId = t.VolunteerUserId
      INNER JOIN Users a ON a.UserId = t.AssignedByUserId
      INNER JOIN Sites s ON s.SiteId = t.SiteId
      ${where}
      ORDER BY t.TaskDay DESC, t.ShiftPeriod, t.CreatedAt DESC
    `)

    return result.recordset
  }

  if (req.method === 'POST') {
    required(req.body, ['volunteerUserId', 'title', 'taskType', 'shiftPeriod', 'taskDay'])
    oneOf(req.body.taskType, TASK_TYPES, 'taskType')
    oneOf(req.body.shiftPeriod, ['AM', 'PM'], 'shiftPeriod')

    const volunteerUserId = toInt(req.body.volunteerUserId, 'volunteerUserId')
    const volunteerResult = await pool
      .request()
      .input('userId', sql.Int, volunteerUserId)
      .query(`
        SELECT u.UserId, u.SiteId, r.RoleCode, u.FullName
        FROM Users u
        INNER JOIN Roles r ON r.RoleId = u.RoleId
        WHERE u.UserId = @userId
      `)

    const volunteer = volunteerResult.recordset[0]
    if (!volunteer || volunteer.RoleCode !== 'volunteer') throw new ApiError(404, 'Voluntario no encontrado')
    ensureSameOrGlobalSite(req, volunteer.SiteId)

    const result = await pool
      .request()
      .input('siteId', sql.Int, volunteer.SiteId)
      .input('volunteerUserId', sql.Int, volunteerUserId)
      .input('assignedByUserId', sql.Int, req.auth.sub)
      .input('familyId', sql.Int, req.body.familyId ? Number(req.body.familyId) : null)
      .input('relatedRequestId', sql.Int, req.body.relatedRequestId ? Number(req.body.relatedRequestId) : null)
      .input('title', sql.NVarChar(160), req.body.title)
      .input('taskType', sql.NVarChar(40), req.body.taskType)
      .input('shiftPeriod', sql.NVarChar(20), req.body.shiftPeriod)
      .input('taskDay', sql.Date, req.body.taskDay)
      .input('status', sql.NVarChar(20), 'pendiente')
      .input('notes', sql.NVarChar(255), req.body.notes || null)
      .query(`
        INSERT INTO VolunteerTasks (SiteId, VolunteerUserId, AssignedByUserId, FamilyId, RelatedRequestId, Title, TaskType, ShiftPeriod, TaskDay, Status, Notes, CreatedAt, UpdatedAt)
        VALUES (@siteId, @volunteerUserId, @assignedByUserId, @familyId, @relatedRequestId, @title, @taskType, @shiftPeriod, @taskDay, @status, @notes, NOW(), NOW())
        RETURNING *
      `)

    const task = result.recordset[0]
    await logAudit({
      siteId: volunteer.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'volunteer.task_assigned',
      entityType: 'volunteer_task',
      entityId: task.VolunteerTaskId,
      metadata: { volunteerUserId, taskType: task.TaskType },
    })

    return task
  }

  required(req.body, ['volunteerTaskId'])
  const volunteerTaskId = toInt(req.body.volunteerTaskId, 'volunteerTaskId')
  const taskResult = await pool
    .request()
    .input('volunteerTaskId', sql.Int, volunteerTaskId)
    .query(`SELECT * FROM VolunteerTasks WHERE VolunteerTaskId = @volunteerTaskId`)
  const task = taskResult.recordset[0]
  if (!task) throw new ApiError(404, 'Tarea no encontrada')

  if (req.auth.role === 'volunteer') {
    if (Number(task.VolunteerUserId) !== Number(req.auth.sub)) throw new ApiError(403, 'Solo puedes actualizar tus tareas')
    if (req.body.status && !['en_proceso', 'completada'].includes(req.body.status)) {
      throw new ApiError(403, 'Solo puedes avanzar o completar tareas')
    }
  } else {
    ensureSameOrGlobalSite(req, task.SiteId)
  }

  const nextStatus = req.body.status || task.Status
  const nextVolunteerUserId = req.body.volunteerUserId ? Number(req.body.volunteerUserId) : task.VolunteerUserId
  const nextShiftPeriod = req.body.shiftPeriod || task.ShiftPeriod
  const nextTitle = req.body.title || task.Title
  const nextTaskType = req.body.taskType || task.TaskType
  oneOf(nextShiftPeriod, ['AM', 'PM'], 'shiftPeriod')
  oneOf(nextTaskType, TASK_TYPES, 'taskType')

  const result = await pool
    .request()
    .input('volunteerTaskId', sql.Int, volunteerTaskId)
    .input('volunteerUserId', sql.Int, nextVolunteerUserId)
    .input('title', sql.NVarChar(160), nextTitle)
    .input('taskType', sql.NVarChar(40), nextTaskType)
    .input('shiftPeriod', sql.NVarChar(20), nextShiftPeriod)
    .input('status', sql.NVarChar(20), nextStatus)
    .input('notes', sql.NVarChar(255), req.body.notes ?? task.Notes)
    .query(`
      UPDATE VolunteerTasks
      SET VolunteerUserId = @volunteerUserId,
          Title = @title,
          TaskType = @taskType,
          ShiftPeriod = @shiftPeriod,
          Status = @status,
          Notes = @notes,
          UpdatedAt = NOW()
      WHERE VolunteerTaskId = @volunteerTaskId
      RETURNING *
    `)

  await logAudit({
    siteId: task.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'volunteer.task_updated',
    entityType: 'volunteer_task',
    entityId: volunteerTaskId,
    metadata: { status: nextStatus, volunteerUserId: nextVolunteerUserId },
  })

  return result.recordset[0]
})
