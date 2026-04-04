import { getPool, sql } from '../../src/lib/db.js'
import { isGlobalRole, canManageInternalUser, resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { hashPassword } from '../../src/lib/security.js'
import { email, oneOf, required, toInt } from '../../src/lib/validation.js'

const MANAGEABLE_ROLES = ['admin', 'staff', 'volunteer']

export default withApi({ methods: ['GET', 'POST', 'PATCH', 'DELETE'], roles: ['superadmin', 'admin', 'staff'] }, async (req) => {
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

    const roleResult = await pool
      .request()
      .input('roleCode', sql.NVarChar(30), req.body.role)
      .query(`SELECT RoleId FROM Roles WHERE RoleCode = @roleCode`)

    const roleRow = roleResult.recordset[0]
    const result = await pool
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

    const created = result.recordset[0]
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
