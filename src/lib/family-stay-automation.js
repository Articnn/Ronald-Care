import { createCleaningTaskForRoom, findCleaningVolunteer, findOpenCleaningTask, notifySiteStaff } from './room-automation.js'
import { sql } from './db.js'

export const LOCAL_TOMORROW_SQL = "((CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date + INTERVAL '1 day')::date"
export const LOCAL_TODAY_SQL = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date"

async function getFamilyStayRecord(pool, familyId) {
  const result = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT
        f.FamilyId,
        f.SiteId,
        f.RoomId,
        f.PlannedRoomId,
        f.StayDays,
        f.PlannedCheckoutDate,
        f.AutomationStatus,
        f.AdmissionStatus,
        f.CaregiverName,
        f.FamilyLastName,
        r.ArrivalDate,
        r.CompanionCount,
        s.Name AS SiteName,
        pr.RoomCode AS PlannedRoomCode,
        rr.RoomCode AS RoomCode
      FROM Families f
      INNER JOIN Referrals r ON r.ReferralId = f.ReferralId
      INNER JOIN Sites s ON s.SiteId = f.SiteId
      LEFT JOIN Rooms pr ON pr.RoomId = f.PlannedRoomId
      LEFT JOIN Rooms rr ON rr.RoomId = f.RoomId
      WHERE f.FamilyId = @familyId
    `)

  return result.recordset[0] || null
}

async function findCandidateRoom(pool, { siteId, requiredCapacity, status }) {
  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('requiredCapacity', sql.Int, requiredCapacity)
    .input('status', sql.NVarChar(20), status)
    .query(`
      SELECT
        r.RoomId,
        r.RoomCode,
        r.RoomStatus,
        r.RoomNote,
        r.AvailableAt,
        r.Capacity,
        r.RoomType
      FROM Rooms r
      WHERE r.SiteId = @siteId
        AND r.IsActive = TRUE
        AND r.Capacity >= @requiredCapacity
        AND r.RoomStatus = @status
        AND NOT EXISTS (
          SELECT 1
          FROM Families f
          WHERE f.RoomId = r.RoomId OR f.PlannedRoomId = r.RoomId
        )
      ORDER BY r.Capacity ASC, r.RoomType ASC, r.RoomCode ASC
      LIMIT 1
    `)

  return result.recordset[0] || null
}

export async function automateFamilyStayAssignment(pool, { familyId, actorUserId }) {
  const family = await getFamilyStayRecord(pool, familyId)
  if (!family) return null

  const requiredCapacity = Math.min(3, Number(family.CompanionCount || 0) + 1)
  const displayName = `${family.CaregiverName} ${family.FamilyLastName}`
  const stayDays = Number(family.StayDays || 3)
  const checkoutResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT (ArrivalDate::date + MAKE_INTERVAL(days => StayDays))::date AS PlannedCheckoutDate
      FROM (
        SELECT r.ArrivalDate, f.StayDays
        FROM Families f
        INNER JOIN Referrals r ON r.ReferralId = f.ReferralId
        WHERE f.FamilyId = @familyId
      ) t
    `)
  const plannedCheckoutDate = checkoutResult.recordset[0]?.PlannedCheckoutDate || family.PlannedCheckoutDate

  if (family.RoomId && family.RoomCode) {
    return {
      FamilyId: family.FamilyId,
      CaregiverName: family.CaregiverName,
      FamilyLastName: family.FamilyLastName,
      SiteId: family.SiteId,
      SiteName: family.SiteName,
      ArrivalDate: family.ArrivalDate,
      StayDays: stayDays,
      PlannedCheckoutDate: plannedCheckoutDate,
      AutomationStatus: family.AutomationStatus || 'reservada',
      PlannedRoomId: family.RoomId,
      PlannedRoomCode: family.RoomCode,
      AssignedVolunteerUserId: null,
      AssignedVolunteerName: null,
      Message: `Habitación ${family.RoomCode} asignada para la familia ${displayName} durante ${stayDays} días.`,
    }
  }

  const readyRoom = await findCandidateRoom(pool, { siteId: family.SiteId, requiredCapacity, status: 'disponible' })
  if (readyRoom) {
    await pool
      .request()
      .input('familyId', sql.Int, family.FamilyId)
      .input('roomId', sql.Int, readyRoom.RoomId)
      .input('plannedCheckoutDate', sql.Date, plannedCheckoutDate)
      .query(`
        UPDATE Families
        SET PlannedRoomId = @roomId,
            RoomId = @roomId,
            PlannedCheckoutDate = @plannedCheckoutDate,
            AutomationStatus = 'reservada',
            UpdatedAt = NOW()
        WHERE FamilyId = @familyId
      `)

    await pool
      .request()
      .input('roomId', sql.Int, readyRoom.RoomId)
      .query(`
        UPDATE Rooms
        SET RoomStatus = 'reservada', OccupiedCount = 1, AvailableAt = NULL, RoomNote = NULL
        WHERE RoomId = @roomId
      `)

    await notifySiteStaff(
      pool,
      family.SiteId,
      'Habitación reservada automáticamente',
      `Habitación ${readyRoom.RoomCode} asignada a familia ${displayName} durante ${stayDays} días.`,
      'room',
      readyRoom.RoomId,
    )

    return {
      FamilyId: family.FamilyId,
      CaregiverName: family.CaregiverName,
      FamilyLastName: family.FamilyLastName,
      SiteId: family.SiteId,
      SiteName: family.SiteName,
      ArrivalDate: family.ArrivalDate,
      StayDays: stayDays,
      PlannedCheckoutDate: plannedCheckoutDate,
      AutomationStatus: 'reservada',
      PlannedRoomId: readyRoom.RoomId,
      PlannedRoomCode: readyRoom.RoomCode,
      AssignedVolunteerUserId: null,
      AssignedVolunteerName: null,
      Message: `Habitación ${readyRoom.RoomCode} se encuentra libre y fue asignada para la familia durante esos días.`,
    }
  }

  const prepRoom = await findCandidateRoom(pool, { siteId: family.SiteId, requiredCapacity, status: 'mantenimiento' })
  if (prepRoom) {
    await pool
      .request()
      .input('familyId', sql.Int, family.FamilyId)
      .input('roomId', sql.Int, prepRoom.RoomId)
      .input('plannedCheckoutDate', sql.Date, plannedCheckoutDate)
      .query(`
        UPDATE Families
        SET PlannedRoomId = @roomId,
            PlannedCheckoutDate = @plannedCheckoutDate,
            AutomationStatus = 'preparacion',
            UpdatedAt = NOW()
        WHERE FamilyId = @familyId
      `)

    let volunteer = await findCleaningVolunteer(pool, family.SiteId)
    let volunteerName = null
    let volunteerUserId = null
    let task = await findOpenCleaningTask(pool, { siteId: family.SiteId, familyId: family.FamilyId, roomId: prepRoom.RoomId })

    if (task) {
      volunteerUserId = task.VolunteerUserId
      const volunteerResult = await pool.request().input('userId', sql.Int, volunteerUserId).query(`SELECT FullName FROM Users WHERE UserId = @userId`)
      volunteerName = volunteerResult.recordset[0]?.FullName || 'Voluntariado limpieza'
    } else if (volunteer) {
      volunteerUserId = volunteer.UserId
      const created = await createCleaningTaskForRoom(pool, {
        siteId: family.SiteId,
        volunteerUserId,
        assignedByUserId: actorUserId,
        familyId: family.FamilyId,
        roomId: prepRoom.RoomId,
        taskDay: family.ArrivalDate,
        title: `Preparar habitación ${prepRoom.RoomCode} para familia ${displayName} - llegada ${family.ArrivalDate}`,
        notes: prepRoom.RoomNote || `Preparación automática para estancia de ${stayDays} días.`,
      })
      volunteerName = created.volunteerName
      task = created.task
      await notifySiteStaff(
        pool,
        family.SiteId,
        'Preparación de habitación en curso',
        `Tarea asignada a ${volunteerName} para preparar la habitación ${prepRoom.RoomCode} para la familia ${displayName}.`,
        'volunteer_task',
        task.VolunteerTaskId,
      )
    }

    return {
      FamilyId: family.FamilyId,
      CaregiverName: family.CaregiverName,
      FamilyLastName: family.FamilyLastName,
      SiteId: family.SiteId,
      SiteName: family.SiteName,
      ArrivalDate: family.ArrivalDate,
      StayDays: stayDays,
      PlannedCheckoutDate: plannedCheckoutDate,
      AutomationStatus: 'preparacion',
      PlannedRoomId: prepRoom.RoomId,
      PlannedRoomCode: prepRoom.RoomCode,
      AssignedVolunteerUserId: volunteerUserId,
      AssignedVolunteerName: volunteerName,
      Message: volunteerName
        ? `Habitación ${prepRoom.RoomCode} encontrada. ${volunteerName} la preparará antes de la llegada.`
        : 'Se encontró habitación, pero no hay voluntario de limpieza disponible para prepararla en este momento.',
    }
  }

  await pool
    .request()
    .input('familyId', sql.Int, family.FamilyId)
    .input('plannedCheckoutDate', sql.Date, plannedCheckoutDate)
    .query(`
      UPDATE Families
      SET PlannedRoomId = NULL,
          PlannedCheckoutDate = @plannedCheckoutDate,
          AutomationStatus = 'sin_cupo',
          UpdatedAt = NOW()
      WHERE FamilyId = @familyId
    `)

  return {
    FamilyId: family.FamilyId,
    CaregiverName: family.CaregiverName,
    FamilyLastName: family.FamilyLastName,
    SiteId: family.SiteId,
    SiteName: family.SiteName,
    ArrivalDate: family.ArrivalDate,
    StayDays: stayDays,
    PlannedCheckoutDate: plannedCheckoutDate,
    AutomationStatus: 'sin_cupo',
    PlannedRoomId: null,
    PlannedRoomCode: null,
    AssignedVolunteerUserId: null,
    AssignedVolunteerName: null,
    Message: 'Cupo lleno de momento. No hay habitación libre para asignar automáticamente.',
  }
}

export async function syncExpiredFamilyStays(pool, actorUserId = null) {
  const result = await pool.query(`
    SELECT
      f.FamilyId,
      f.SiteId,
      f.RoomId,
      f.CaregiverName,
      f.FamilyLastName,
      f.PlannedCheckoutDate,
      r.RoomCode
    FROM Families f
    INNER JOIN Rooms r ON r.RoomId = f.RoomId
    WHERE f.RoomId IS NOT NULL
      AND f.PlannedCheckoutDate IS NOT NULL
      AND f.PlannedCheckoutDate <= ${LOCAL_TODAY_SQL}
      AND f.AutomationStatus IN ('reservada', 'ocupada')
  `)

  for (const family of result.recordset) {
    await pool
      .request()
      .input('familyId', sql.Int, family.FamilyId)
      .query(`
        UPDATE Families
        SET RoomId = NULL,
            PlannedRoomId = NULL,
            AutomationStatus = 'checkout_completado',
            UpdatedAt = NOW()
        WHERE FamilyId = @familyId
      `)

    await pool
      .request()
      .input('roomId', sql.Int, family.RoomId)
      .input('roomNote', sql.NVarChar(255), `Limpieza posterior a estancia de familia ${family.FamilyLastName}`)
      .query(`
        UPDATE Rooms
        SET RoomStatus = 'mantenimiento',
            OccupiedCount = 0,
            AvailableAt = NULL,
            RoomNote = @roomNote
        WHERE RoomId = @roomId
      `)

    const volunteer = await findCleaningVolunteer(pool, family.SiteId)
    let volunteerName = null
    if (volunteer) {
      const created = await createCleaningTaskForRoom(pool, {
        siteId: family.SiteId,
        volunteerUserId: volunteer.UserId,
        assignedByUserId: actorUserId || volunteer.UserId,
        familyId: null,
        roomId: family.RoomId,
        taskDay: new Date().toISOString().slice(0, 10),
        title: `Preparar habitación ${family.RoomCode} después de estancia de familia ${family.CaregiverName} ${family.FamilyLastName}`,
        notes: `Salida automática por fin de estancia acordada.`,
      })
      volunteerName = created.volunteerName
    }

    await notifySiteStaff(
      pool,
      family.SiteId,
      'Habitación liberada automáticamente',
      volunteerName
        ? `Habitación ${family.RoomCode} liberada tras estancia de ${family.CaregiverName} ${family.FamilyLastName}. Limpieza asignada a ${volunteerName}.`
        : `Habitación ${family.RoomCode} liberada tras estancia de ${family.CaregiverName} ${family.FamilyLastName}.`,
      'room',
      family.RoomId,
    )
  }
}

export async function extendFamilyStay(pool, { familyId, extraDays }) {
  const result = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .input('extraDays', sql.Int, extraDays)
    .query(`
      UPDATE Families
      SET StayDays = GREATEST(1, StayDays + @extraDays),
          PlannedCheckoutDate = COALESCE(PlannedCheckoutDate, ${LOCAL_TODAY_SQL}) + MAKE_INTERVAL(days => @extraDays),
          UpdatedAt = NOW()
      WHERE FamilyId = @familyId
      RETURNING *
    `)

  return result.recordset[0] || null
}

export async function listFamilyStayAutomation(pool, siteId = null) {
  const request = pool.request()
  let where = `WHERE fa.IsActive = TRUE AND f.AutomationStatus <> 'checkout_completado'`

  if (siteId) {
    request.input('siteId', sql.Int, siteId)
    where += ' AND f.SiteId = @siteId'
  }

  const result = await request.query(`
    SELECT
      f.FamilyId,
      f.SiteId,
      f.CaregiverName,
      f.FamilyLastName,
      f.StayDays,
      f.PlannedCheckoutDate,
      f.AutomationStatus,
      r.ArrivalDate,
      s.Name AS SiteName,
      pr.RoomCode AS PlannedRoomCode,
      f.RoomId,
      f.PlannedRoomId
    FROM Families f
    INNER JOIN Referrals r ON r.ReferralId = f.ReferralId
    INNER JOIN Sites s ON s.SiteId = f.SiteId
    INNER JOIN FamilyAccess fa ON fa.FamilyId = f.FamilyId
    LEFT JOIN Rooms pr ON pr.RoomId = COALESCE(f.RoomId, f.PlannedRoomId)
    ${where}
    ORDER BY r.ArrivalDate ASC, f.CreatedAt DESC
  `)

  return result.recordset.map((family) => {
    const displayName = `${family.CaregiverName} ${family.FamilyLastName}`
    let message = `Validando el tiempo acordado de residencia para ${displayName}.`

    if (family.AutomationStatus === 'reservada' || family.AutomationStatus === 'ocupada') {
      message = `Habitación ${family.PlannedRoomCode} se encuentra libre y quedó asignada para la familia durante ${family.StayDays} días.`
    } else if (family.AutomationStatus === 'preparacion') {
      message = `Buscando habitación disponible y preparando ${family.PlannedRoomCode || 'una habitación'} para la familia.`
    } else if (family.AutomationStatus === 'sin_cupo') {
      message = 'Cupo lleno de momento.'
    }

    return {
      ...family,
      Message: message,
    }
  })
}
