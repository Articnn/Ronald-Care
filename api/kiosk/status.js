import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], authOptional: true }, async (req) => {
  const code = req.query.code
  if (!code) throw new ApiError(400, 'Se requiere ?code=')

  const pool = await getPool()
  const familyQuery = await pool
    .request()
    .input('code', sql.NVarChar(80), code)
    .query(`
      SELECT
        f.FamilyId,
        f.CaregiverName,
        f.FamilyLastName,
        f.AdmissionStatus,
        s.Name AS SiteName,
        s.SiteCode,
        r.RoomCode
      FROM FamilyAccess fa
      INNER JOIN Families f ON f.FamilyId = fa.FamilyId
      INNER JOIN Sites s ON s.SiteId = f.SiteId
      LEFT JOIN Rooms r ON r.RoomId = f.RoomId
      WHERE fa.TicketCode = @code OR fa.QrCode = @code
      LIMIT 1
    `)

  const family = familyQuery.recordset[0]
  if (!family) throw new ApiError(404, 'Codigo no encontrado')

  const requestsQuery = await pool
    .request()
    .input('familyId', sql.Int, family.FamilyId)
    .query(`
      SELECT RequestId, Title, RequestType, Urgency, Status, PriorityScore, PriorityLabel, AssignedDisplayName, CreatedAt
      FROM Requests
      WHERE FamilyId = @familyId
      ORDER BY CreatedAt DESC
    `)

  const tripsQuery = await pool
    .request()
    .input('familyId', sql.Int, family.FamilyId)
    .query(`
      SELECT TripId, Destination, Shift, Status, DurationMinutes, AssignedDisplayName, CreatedAt
      FROM Trips
      WHERE FamilyId = @familyId
      ORDER BY CreatedAt DESC
    `)

  return {
    family,
    requests: requestsQuery.recordset,
    trips: tripsQuery.recordset,
  }
})
