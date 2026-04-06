import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'POST'], roles: ['staff', 'volunteer', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()

  if (req.method === 'GET') {
    const siteId = resolveScopedSiteId(req, req.query.siteId)
    const dbReq = pool.request()
    let where = 'WHERE 1=1'
    if (siteId) {
      dbReq.input('siteId', sql.Int, siteId)
      where += ' AND SiteId = @siteId'
    }

    if (req.query.shiftDay) {
      dbReq.input('shiftDay', sql.Date, req.query.shiftDay)
      where += ' AND ShiftDay = @shiftDay'
    }

    const result = await dbReq.query(`
      SELECT *
      FROM VolunteerShifts
      ${where}
      ORDER BY ShiftDay DESC, ShiftPeriod
    `)

    return result.recordset
  }

  required(req.body, ['siteId', 'volunteerName', 'volunteerType', 'roleName', 'shiftDay', 'shiftPeriod', 'availabilityStatus', 'hoursLogged', 'workDays', 'startTime', 'endTime', 'shiftLabel'])
  oneOf(req.body.volunteerType, ['individual', 'escolar', 'empresarial'], 'volunteerType')
  oneOf(req.body.roleName, ['traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia', 'limpieza'], 'roleName')
  oneOf(req.body.shiftPeriod, ['AM', 'PM'], 'shiftPeriod')
  oneOf(req.body.shiftLabel, ['manana', 'tarde', 'noche'], 'shiftLabel')
  oneOf(req.body.availabilityStatus, ['disponible', 'cupo_limitado', 'no_disponible'], 'availabilityStatus')

  const userId = req.auth.role === 'volunteer' ? req.auth.sub : (req.body.userId ? Number(req.body.userId) : null)

  const result = await pool
    .request()
    .input('siteId', sql.Int, toInt(req.body.siteId, 'siteId'))
    .input('userId', sql.Int, userId)
    .input('volunteerName', sql.NVarChar(120), req.body.volunteerName)
    .input('volunteerType', sql.NVarChar(30), req.body.volunteerType)
    .input('roleName', sql.NVarChar(40), req.body.roleName)
    .input('shiftDay', sql.Date, req.body.shiftDay)
    .input('workDays', sql.NVarChar(80), Array.isArray(req.body.workDays) ? req.body.workDays.join(',') : String(req.body.workDays || ''))
    .input('startTime', sql.NVarChar(5), req.body.startTime)
    .input('endTime', sql.NVarChar(5), req.body.endTime)
    .input('shiftPeriod', sql.NVarChar(20), req.body.shiftPeriod)
    .input('shiftLabel', sql.NVarChar(20), req.body.shiftLabel)
    .input('availabilityStatus', sql.NVarChar(30), req.body.availabilityStatus)
    .input('hoursLogged', sql.Decimal(5, 2), Number(req.body.hoursLogged))
    .query(`
      INSERT INTO VolunteerShifts (SiteId, UserId, VolunteerName, VolunteerType, RoleName, ShiftDay, WorkDays, StartTime, EndTime, ShiftPeriod, ShiftLabel, AvailabilityStatus, HoursLogged)
      VALUES (@siteId, @userId, @volunteerName, @volunteerType, @roleName, @shiftDay, @workDays, @startTime, @endTime, @shiftPeriod, @shiftLabel, @availabilityStatus, @hoursLogged)
      RETURNING *
    `)

  const shift = result.recordset[0]
  await logAudit({
    siteId: shift.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'volunteer.shift_registered',
    entityType: 'volunteer_shift',
    entityId: shift.VolunteerShiftId,
    metadata: { volunteerType: shift.VolunteerType, hoursLogged: shift.HoursLogged },
  })

  return shift
})
