import { getPool, sql, withTransaction } from '../../src/lib/db.js'
import { isGlobalRole, canManageInternalUser, resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { hashPassword } from '../../src/lib/security.js'
import { inferAvailabilityFromHours, inferShiftLabel, inferShiftPeriod, calculateHoursBetween } from '../../src/lib/schedule.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { email, oneOf, required, toInt } from '../../src/lib/validation.js'

const MANAGEABLE_ROLES = ['admin', 'staff', 'volunteer']
const VOLUNTEER_ROLE_NAMES = ['traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia', 'limpieza']
const STAFF_WORK_AREAS = ['recepcion', 'checkin', 'habitaciones', 'inventario', 'coordinacion', 'analitica', 'apoyo_familiar']

function buildSchedule(startTime, endTime, explicitShiftLabel = null) {
  const hoursLogged = calculateHoursBetween(startTime, endTime)
  const shiftLabel = explicitShiftLabel || inferShiftLabel(startTime)
  return {
    hoursLogged,
    shiftLabel,
    shiftPeriod: inferShiftPeriod(startTime),
    availabilityStatus: inferAvailabilityFromHours(hoursLogged),
  }
}

export default withApi({ methods: ['GET', 'POST', 'PATCH', 'DELETE'], roles: ['superadmin', 'admin', 'staff'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()

  if (req.method === 'GET') {
    const siteId = resolveScopedSiteId(req, req.query.siteId)
    const dbReq = pool.request()
    let where = "WHERE r.RoleCode IN ('admin', 'staff', 'volunteer', 'hospital')"

    if (siteId) {
      dbReq.input('siteId', sql.Int, siteId)
      where += ' AND u.SiteId = @siteId'
    }

    const result = await dbReq.query(`
      SELECT u.UserId, u.FullName, u.Email, u.SiteId, u.IsActive, u.CreatedAt, r.RoleCode, s.Name AS SiteName
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      LEFT JOIN Sites s ON s.SiteId = u.SiteId
      ${where}
      ORDER BY s.Name NULLS FIRST, r.RoleCode, u.FullName
    `)

    return result.recordset
  }

  if (req.method === 'POST') {
    required(req.body, ['fullName', 'email', 'role', 'siteId', 'password'])
    email(req.body.email)
    oneOf(req.body.role, MANAGEABLE_ROLES, 'role')
    if (!canManageInternalUser(req.auth.role, req.body.role)) throw new ApiError(403, 'No puedes crear ese tipo de usuario')

    const siteId = toInt(req.body.siteId, 'siteId')
    if (!isGlobalRole(req.auth.role) && Number(req.auth.siteId) !== siteId) {
      throw new ApiError(403, 'Solo puedes crear usuarios en tu sede')
    }

    const created = await withTransaction(async (tx) => {
      const roleResult = await tx
        .request()
        .input('roleCode', sql.NVarChar(30), req.body.role)
        .query(`SELECT RoleId FROM Roles WHERE RoleCode = @roleCode`)

      const roleRow = roleResult.recordset[0]
      if (!roleRow) throw new ApiError(404, 'Rol no encontrado')

      const userResult = await tx
        .request()
        .input('siteId', sql.Int, siteId)
        .input('roleId', sql.Int, roleRow.RoleId)
        .input('fullName', sql.NVarChar(120), req.body.fullName)
        .input('email', sql.NVarChar(160), req.body.email)
        .input('passwordHash', sql.NVarChar(255), hashPassword(req.body.password))
        .query(`
          INSERT INTO Users (SiteId, RoleId, FullName, Email, PasswordHash, IsActive, CreatedAt, UpdatedAt)
          VALUES (@siteId, @roleId, @fullName, @email, @passwordHash, TRUE, NOW(), NOW())
          RETURNING *
        `)

      const user = userResult.recordset[0]

      if (req.body.role === 'volunteer' && req.body.volunteerShift) {
        const profile = req.body.volunteerShift
        oneOf(profile.volunteerType, ['individual', 'escolar', 'empresarial'], 'volunteerType')
        oneOf(profile.roleName, VOLUNTEER_ROLE_NAMES, 'roleName')
        const derived = buildSchedule(profile.startTime, profile.endTime, profile.shiftLabel)

        await tx
          .request()
          .input('siteId', sql.Int, siteId)
          .input('userId', sql.Int, user.UserId)
          .input('volunteerName', sql.NVarChar(120), user.FullName)
          .input('volunteerType', sql.NVarChar(30), profile.volunteerType)
          .input('roleName', sql.NVarChar(40), profile.roleName)
          .input('shiftDay', sql.Date, profile.shiftDay)
          .input('workDays', sql.NVarChar(120), Array.isArray(profile.workDays) ? profile.workDays.join(',') : '')
          .input('startTime', sql.NVarChar(5), profile.startTime)
          .input('endTime', sql.NVarChar(5), profile.endTime)
          .input('shiftPeriod', sql.NVarChar(20), derived.shiftPeriod)
          .input('shiftLabel', sql.NVarChar(20), derived.shiftLabel)
          .input('availabilityStatus', sql.NVarChar(30), derived.availabilityStatus)
          .input('hoursLogged', sql.Decimal(5, 2), derived.hoursLogged)
          .query(`
            INSERT INTO VolunteerShifts (SiteId, UserId, VolunteerName, VolunteerType, RoleName, ShiftDay, WorkDays, StartTime, EndTime, ShiftPeriod, ShiftLabel, AvailabilityStatus, HoursLogged)
            VALUES (@siteId, @userId, @volunteerName, @volunteerType, @roleName, @shiftDay, @workDays, @startTime, @endTime, @shiftPeriod, @shiftLabel, @availabilityStatus, @hoursLogged)
          `)
      }

      if (req.body.role === 'staff' && req.body.staffProfile) {
        const profile = req.body.staffProfile
        oneOf(profile.workArea, STAFF_WORK_AREAS, 'workArea')
        const derived = buildSchedule(profile.startTime, profile.endTime, profile.shiftLabel)

        await tx
          .request()
          .input('siteId', sql.Int, siteId)
          .input('userId', sql.Int, user.UserId)
          .input('workArea', sql.NVarChar(40), profile.workArea)
          .input('workDays', sql.NVarChar(120), Array.isArray(profile.workDays) ? profile.workDays.join(',') : '')
          .input('startTime', sql.NVarChar(5), profile.startTime)
          .input('endTime', sql.NVarChar(5), profile.endTime)
          .input('shiftPeriod', sql.NVarChar(20), derived.shiftPeriod)
          .input('shiftLabel', sql.NVarChar(20), derived.shiftLabel)
          .input('availabilityStatus', sql.NVarChar(30), derived.availabilityStatus)
          .input('hoursLogged', sql.Decimal(5, 2), derived.hoursLogged)
          .query(`
            INSERT INTO StaffProfiles (SiteId, UserId, WorkArea, WorkDays, StartTime, EndTime, ShiftPeriod, ShiftLabel, AvailabilityStatus, HoursLogged, CreatedAt, UpdatedAt)
            VALUES (@siteId, @userId, @workArea, @workDays, @startTime, @endTime, @shiftPeriod, @shiftLabel, @availabilityStatus, @hoursLogged, NOW(), NOW())
          `)
      }

      return user
    })

    await logAudit({
      siteId,
      actorUserId: req.auth.sub,
      eventType: 'user.created',
      entityType: 'user',
      entityId: created.UserId,
      metadata: { role: req.body.role, email: req.body.email },
    })

    return created
  }

  if (req.method === 'PATCH') {
    required(req.body, ['userId'])
    const userId = toInt(req.body.userId, 'userId')
    const targetResult = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT u.UserId, u.SiteId, u.IsActive, r.RoleCode
        FROM Users u
        INNER JOIN Roles r ON r.RoleId = u.RoleId
        WHERE u.UserId = @userId
      `)

    const target = targetResult.recordset[0]
    if (!target) throw new ApiError(404, 'Usuario no encontrado')
    if (!canManageInternalUser(req.auth.role, target.RoleCode)) throw new ApiError(403, 'No puedes editar ese usuario')
    if (!isGlobalRole(req.auth.role) && Number(req.auth.siteId) !== Number(target.SiteId)) {
      throw new ApiError(403, 'Solo puedes editar usuarios de tu sede')
    }

    const nextFullName = req.body.fullName ?? null
    const nextSiteId = req.body.siteId ? Number(req.body.siteId) : null
    const nextIsActive = req.body.isActive

    if (nextSiteId && !isGlobalRole(req.auth.role) && Number(req.auth.siteId) !== nextSiteId) {
      throw new ApiError(403, 'No puedes mover usuarios a otra sede')
    }

    let roleId = null
    if (req.body.role) {
      oneOf(req.body.role, MANAGEABLE_ROLES, 'role')
      if (!canManageInternalUser(req.auth.role, req.body.role)) throw new ApiError(403, 'No puedes asignar ese rol')
      const roleResult = await pool
        .request()
        .input('roleCode', sql.NVarChar(30), req.body.role)
        .query(`SELECT RoleId FROM Roles WHERE RoleCode = @roleCode`)
      roleId = roleResult.recordset[0]?.RoleId || null
    }

    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('fullName', sql.NVarChar(120), nextFullName)
      .input('siteId', sql.Int, nextSiteId)
      .input('roleId', sql.Int, roleId)
      .input('isActive', sql.Bit, typeof nextIsActive === 'boolean' ? nextIsActive : null)
      .query(`
        UPDATE Users
        SET
          FullName = COALESCE(@fullName, FullName),
          SiteId = COALESCE(@siteId, SiteId),
          RoleId = COALESCE(@roleId, RoleId),
          IsActive = COALESCE(@isActive, IsActive),
          UpdatedAt = NOW()
        WHERE UserId = @userId
        RETURNING *
      `)

    if (nextSiteId) {
      await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('siteId', sql.Int, nextSiteId)
        .query(`
          UPDATE VolunteerShifts SET SiteId = @siteId WHERE UserId = @userId;
          UPDATE StaffProfiles SET SiteId = @siteId, UpdatedAt = NOW() WHERE UserId = @userId;
          UPDATE VolunteerTasks SET SiteId = @siteId WHERE VolunteerUserId = @userId;
        `)
    }

    await logAudit({
      siteId: nextSiteId || target.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'user.updated',
      entityType: 'user',
      entityId: userId,
      metadata: { fullName: nextFullName, siteId: nextSiteId, isActive: nextIsActive },
    })

    return result.recordset[0]
  }

  required(req.body, ['userId'])
  const userId = toInt(req.body.userId, 'userId')
  const targetResult = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT u.UserId, u.SiteId, r.RoleCode
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      WHERE u.UserId = @userId
    `)

  const target = targetResult.recordset[0]
  if (!target) throw new ApiError(404, 'Usuario no encontrado')
  if (!canManageInternalUser(req.auth.role, target.RoleCode)) throw new ApiError(403, 'No puedes eliminar ese usuario')
  if (!isGlobalRole(req.auth.role) && Number(req.auth.siteId) !== Number(target.SiteId)) {
    throw new ApiError(403, 'Solo puedes eliminar usuarios de tu sede')
  }

  await pool.request().input('userId', sql.Int, userId).query(`DELETE FROM Users WHERE UserId = @userId`)
  await logAudit({
    siteId: target.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'user.deleted',
    entityType: 'user',
    entityId: userId,
    metadata: { role: target.RoleCode },
  })

  return { message: 'Usuario eliminado' }
})
