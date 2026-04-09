import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { isGlobalRole, resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'

function cleanLatinText(value) {
  return String(value || '')
    .replace(/\u00c3\u00a1/g, 'á')
    .replace(/\u00c3\u00a9/g, 'é')
    .replace(/\u00c3\u00ad/g, 'í')
    .replace(/\u00c3\u00b3/g, 'ó')
    .replace(/\u00c3\u00ba/g, 'ú')
    .replace(/\u00c3\u00b1/g, 'ñ')
    .replace(/\u00c2/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveTaskSiteScope(req, explicitSiteId = null) {
  if (req.auth?.role === 'admin') {
    if (!req.auth?.siteId) {
      throw new ApiError(403, 'No hay sede asignada para este gerente')
    }
    return Number(req.auth.siteId)
  }

  return resolveScopedSiteId(req, explicitSiteId)
}

async function getStaffUser(pool, userId) {
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        u.UserId,
        u.SiteId,
        u.IsActive,
        r.RoleCode
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      WHERE u.UserId = @userId
    `)

  return result.recordset[0] || null
}

async function notifyTaskAssigned(pool, { siteId, userId, title, dueDate, priority, createdByUserId, staffTaskId }) {
  const priorityLabel = priority === 'alta' ? 'alta' : priority === 'media' ? 'media' : 'baja'
  const dueLabel = dueDate ? new Date(dueDate).toLocaleDateString('es-MX') : 'sin fecha límite'

  await pool.request()
    .input('siteId', sql.Int, siteId)
    .input('userId', sql.Int, userId)
    .input('type', sql.NVarChar(40), 'staff_task_assigned')
    .input('title', sql.NVarChar(160), 'Nueva tarea asignada')
    .input('message', sql.NVarChar(255), `${title} · vence ${dueLabel} · prioridad ${priorityLabel}`)
    .input('relatedEntityType', sql.NVarChar(50), 'stafftask')
    .input('relatedEntityId', sql.Int, staffTaskId)
    .input('createdByUserId', sql.Int, createdByUserId || null)
    .query(`
      INSERT INTO AppNotifications (
        SiteId,
        UserId,
        Type,
        Title,
        Message,
        RelatedEntityType,
        RelatedEntityId,
        CreatedByUserId
      )
      VALUES (
        @siteId,
        @userId,
        @type,
        @title,
        @message,
        @relatedEntityType,
        @relatedEntityId,
        @createdByUserId
      )
    `)
}

async function listTasks(req) {
  const pool = await getPool()
  const siteId = resolveTaskSiteScope(req, req.query.siteId)

  const dbReq = pool.request()
  let where = 'WHERE 1=1'

  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    where += ' AND st.SiteId = @siteId'
  }

  if (req.query.status) {
    dbReq.input('status', sql.NVarChar(20), String(req.query.status))
    where += ' AND st.Status = @status'
  }

  if (req.query.assignedUserId) {
    dbReq.input('assignedUserId', sql.Int, Number(req.query.assignedUserId))
    where += ' AND st.AssignedUserId = @assignedUserId'
  }

  if (req.auth?.role === 'staff') {
    dbReq.input('selfUserId', sql.Int, Number(req.auth.userId))
    where += ' AND st.AssignedUserId = @selfUserId'
  }

  const result = await dbReq.query(`
    SELECT
      st.*,
      s.Name AS SiteName,
      u.FullName AS AssignedUserName,
      cb.FullName AS CreatedByName,
      r.CaregiverName,
      r.FamilyLastName,
      rm.RoomCode
    FROM StaffTasks st
    INNER JOIN Sites s ON s.SiteId = st.SiteId
    LEFT JOIN Users u ON u.UserId = st.AssignedUserId
    LEFT JOIN Users cb ON cb.UserId = st.CreatedByUserId
    LEFT JOIN Referrals r ON r.ReferralId = st.ReferralId
    LEFT JOIN Families f ON f.FamilyId = st.FamilyId
    LEFT JOIN Rooms rm ON rm.RoomId = COALESCE(f.RoomId, f.PlannedRoomId)
    ${where}
    ORDER BY
      CASE st.Status WHEN 'pendiente' THEN 1 WHEN 'en_proceso' THEN 2 ELSE 3 END,
      CASE st.Priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
      COALESCE(st.DueDate, CURRENT_DATE + INTERVAL '365 day') ASC,
      st.CreatedAt DESC
  `)

  return result.recordset
}

async function createTask(req) {
  if (!isGlobalRole(req.auth?.role)) {
    throw new ApiError(403, 'Solo Dirección Ejecutiva o Gerencia de Sede pueden crear tareas')
  }

  const title = cleanLatinText(req.body.title)
  const description = cleanLatinText(req.body.description)
  const assignedUserId = Number(req.body.assignedUserId)
  const dueDate = req.body.dueDate ? String(req.body.dueDate) : null
  const priority = String(req.body.priority || 'media')
  const requestedSiteId = req.body.siteId ? Number(req.body.siteId) : null

  if (!title || !description || !assignedUserId || !dueDate) {
    throw new ApiError(400, 'Completa título, descripción, staff asignado y fecha límite')
  }

  if (!['baja', 'media', 'alta'].includes(priority)) {
    throw new ApiError(400, 'La prioridad no es válida')
  }

  const pool = await getPool()
  const staffUser = await getStaffUser(pool, assignedUserId)
  if (!staffUser || !['staff', 'admin'].includes(String(staffUser.RoleCode || '').toLowerCase()) || !staffUser.IsActive) {
    throw new ApiError(400, 'Selecciona un miembro activo del equipo de sede')
  }

  const scopedSiteId = resolveTaskSiteScope(req, requestedSiteId)
  if (!scopedSiteId && req.auth?.role === 'superadmin') {
    throw new ApiError(400, 'Selecciona una sede activa para asignar la tarea')
  }

  if (Number(staffUser.SiteId) !== Number(scopedSiteId)) {
    throw new ApiError(403, 'Solo puedes asignar tareas al staff de la sede filtrada')
  }

  const insert = await pool.request()
    .input('siteId', sql.Int, scopedSiteId)
    .input('assignedUserId', sql.Int, assignedUserId)
    .input('createdByUserId', sql.Int, Number(req.auth.userId))
    .input('title', sql.NVarChar(160), title)
    .input('instructions', sql.NVarChar(sql.MAX), description)
    .input('dueDate', sql.Date, dueDate)
    .input('priority', sql.NVarChar(20), priority)
    .query(`
      INSERT INTO StaffTasks (
        SiteId,
        AssignedUserId,
        CreatedByUserId,
        Title,
        Instructions,
        DueDate,
        Priority,
        Status
      )
      VALUES (
        @siteId,
        @assignedUserId,
        @createdByUserId,
        @title,
        @instructions,
        @dueDate,
        @priority,
        'pendiente'
      )
      RETURNING StaffTaskId
    `)

  const taskId = insert.recordset[0]?.StaffTaskId

  await notifyTaskAssigned(pool, {
    siteId: scopedSiteId,
    userId: assignedUserId,
    title,
    dueDate,
    priority,
    createdByUserId: Number(req.auth.userId),
    staffTaskId: taskId,
  })

  const response = await pool.request()
    .input('staffTaskId', sql.Int, taskId)
    .query(`
      SELECT
        st.*,
        s.Name AS SiteName,
        u.FullName AS AssignedUserName,
        cb.FullName AS CreatedByName
      FROM StaffTasks st
      INNER JOIN Sites s ON s.SiteId = st.SiteId
      LEFT JOIN Users u ON u.UserId = st.AssignedUserId
      LEFT JOIN Users cb ON cb.UserId = st.CreatedByUserId
      WHERE st.StaffTaskId = @staffTaskId
    `)

  return response.recordset[0]
}

async function updateTask(req) {
  const staffTaskId = Number(req.body.staffTaskId)
  const status = req.body.status ? String(req.body.status) : null

  if (!staffTaskId || !status || !['pendiente', 'en_proceso', 'completada'].includes(status)) {
    throw new ApiError(400, 'Envía una tarea y un estado válidos')
  }

  const pool = await getPool()
  const current = await pool.request()
    .input('staffTaskId', sql.Int, staffTaskId)
    .query(`
      SELECT
        st.*,
        u.FullName AS AssignedUserName
      FROM StaffTasks st
      LEFT JOIN Users u ON u.UserId = st.AssignedUserId
      WHERE st.StaffTaskId = @staffTaskId
    `)

  const existing = current.recordset[0]
  if (!existing) {
    throw new ApiError(404, 'La tarea no existe')
  }

  if (req.auth?.role === 'staff' && Number(existing.AssignedUserId) !== Number(req.auth.userId)) {
    throw new ApiError(403, 'Solo puedes actualizar tus propias tareas')
  }

  if (req.auth?.role === 'admin' && Number(existing.SiteId) !== Number(req.auth.siteId)) {
    throw new ApiError(403, 'No puedes modificar tareas de otra sede')
  }

  await pool.request()
    .input('staffTaskId', sql.Int, staffTaskId)
    .input('status', sql.NVarChar(20), status)
    .query(`
      UPDATE StaffTasks
      SET
        Status = @status,
        UpdatedAt = NOW()
      WHERE StaffTaskId = @staffTaskId
    `)

  const updated = await pool.request()
    .input('staffTaskId', sql.Int, staffTaskId)
    .query(`
      SELECT
        st.*,
        s.Name AS SiteName,
        u.FullName AS AssignedUserName,
        cb.FullName AS CreatedByName
      FROM StaffTasks st
      INNER JOIN Sites s ON s.SiteId = st.SiteId
      LEFT JOIN Users u ON u.UserId = st.AssignedUserId
      LEFT JOIN Users cb ON cb.UserId = st.CreatedByUserId
      WHERE st.StaffTaskId = @staffTaskId
    `)

  return updated.recordset[0]
}

export default withApi({ methods: ['GET', 'POST', 'PATCH'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()

  if (req.method === 'POST') return createTask(req)
  if (req.method === 'PATCH') return updateTask(req)
  return listTasks(req)
})
