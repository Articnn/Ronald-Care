import { getPool, sql } from '../../src/lib/db.js'
import { ensureSameOrGlobalSite, resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required } from '../../src/lib/validation.js'

const REPORT_CATEGORIES = ['kit', 'cocina', 'limpieza', 'lavanderia', 'recepcion']

export default withApi({ methods: ['GET', 'POST', 'PATCH'], roles: ['staff', 'admin', 'superadmin', 'volunteer'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()

  if (req.method === 'GET') {
    const siteId = resolveScopedSiteId(req, req.query.siteId)
    const dbReq = pool.request()
    let where = 'WHERE 1=1'

    if (siteId) {
      dbReq.input('siteId', sql.Int, siteId)
      where += ' AND ir.SiteId = @siteId'
    }

    if (req.auth.role === 'volunteer') {
      dbReq.input('volunteerUserId', sql.Int, req.auth.sub)
      where += ' AND ir.VolunteerUserId = @volunteerUserId'
    }

    const result = await dbReq.query(`
      SELECT ir.*, u.FullName AS VolunteerName, s.Name AS SiteName
      FROM InventoryReports ir
      INNER JOIN Users u ON u.UserId = ir.VolunteerUserId
      INNER JOIN Sites s ON s.SiteId = ir.SiteId
      ${where}
      ORDER BY ir.CreatedAt DESC
    `)

    return result.recordset
  }

  if (req.method === 'POST') {
    required(req.body, ['itemCategory', 'title', 'detail'])
    oneOf(req.body.itemCategory, REPORT_CATEGORIES, 'itemCategory')

    const volunteerResult = await pool
      .request()
      .input('userId', sql.Int, req.auth.sub)
      .query(`
        SELECT u.UserId, u.SiteId, r.RoleCode
        FROM Users u
        INNER JOIN Roles r ON r.RoleId = u.RoleId
        WHERE u.UserId = @userId
      `)

    const volunteer = volunteerResult.recordset[0]
    ensureSameOrGlobalSite(req, volunteer.SiteId)

    const result = await pool
      .request()
      .input('siteId', sql.Int, volunteer.SiteId)
      .input('volunteerUserId', sql.Int, req.auth.sub)
      .input('itemCategory', sql.NVarChar(20), req.body.itemCategory)
      .input('title', sql.NVarChar(160), req.body.title)
      .input('detail', sql.NVarChar(500), req.body.detail)
      .input('status', sql.NVarChar(20), 'pendiente')
      .query(`
        INSERT INTO InventoryReports (SiteId, VolunteerUserId, ItemCategory, Title, Detail, Status, CreatedAt, UpdatedAt)
        VALUES (@siteId, @volunteerUserId, @itemCategory, @title, @detail, @status, NOW(), NOW())
        RETURNING *
      `)

    await logAudit({
      siteId: volunteer.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'inventory.report_created',
      entityType: 'inventory_report',
      entityId: result.recordset[0].InventoryReportId,
      metadata: { itemCategory: req.body.itemCategory },
    })

    return result.recordset[0]
  }

  required(req.body, ['inventoryReportId', 'status'])
  oneOf(req.body.status, ['pendiente', 'atendido'], 'status')

  const reportResult = await pool
    .request()
    .input('inventoryReportId', sql.Int, Number(req.body.inventoryReportId))
    .query(`SELECT InventoryReportId, SiteId FROM InventoryReports WHERE InventoryReportId = @inventoryReportId`)

  const report = reportResult.recordset[0]
  ensureSameOrGlobalSite(req, report.SiteId)

  const result = await pool
    .request()
    .input('inventoryReportId', sql.Int, Number(req.body.inventoryReportId))
    .input('status', sql.NVarChar(20), req.body.status)
    .query(`
      UPDATE InventoryReports
      SET Status = @status, UpdatedAt = NOW()
      WHERE InventoryReportId = @inventoryReportId
      RETURNING *
    `)

  return result.recordset[0]
})
