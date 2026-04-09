import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

let poolInstance = null
let compatPoolInstance = null

const KEY_ALIASES = {
  admissionstatus: 'AdmissionStatus',
  admissionstage: 'AdmissionStage',
  approvedat: 'ApprovedAt',
  assignedsiteid: 'AssignedSiteId',
  assignedsitename: 'AssignedSiteName',
  automationstatus: 'AutomationStatus',
  actorfamilyid: 'ActorFamilyId',
  actoruserid: 'ActorUserId',
  arrivaldate: 'ArrivalDate',
  assignedat: 'AssignedAt',
  assigneddisplayname: 'AssignedDisplayName',
  assignedrole: 'AssignedRole',
  assigneduserid: 'AssignedUserId',
  authoralias: 'AuthorAlias',
  availabilitystatus: 'AvailabilityStatus',
  capacity: 'Capacity',
  caregivername: 'CaregiverName',
  checkincompletedat: 'CheckInCompletedAt',
  communitypostid: 'CommunityPostId',
  companioncount: 'CompanionCount',
  currenttasks: 'CurrentTasks',
  createdat: 'CreatedAt',
  createdbyname: 'CreatedByName',
  createdbyuserid: 'CreatedByUserId',
  createdbysource: 'CreatedBySource',
  familylastnamefromreferral: 'FamilyLastNameFromReferral',
  caregivernamefromreferral: 'CaregiverNameFromReferral',
  destination: 'Destination',
  displayname: 'DisplayName',
  durationminutes: 'DurationMinutes',
  eligibilityconfirmed: 'EligibilityConfirmed',
  email: 'Email',
  expirydate: 'ExpiryDate',
  expiringsoon: 'ExpiringSoon',
  endedat: 'EndedAt',
  entityid: 'EntityId',
  entitytype: 'EntityType',
  eventtype: 'EventType',
  familyaccessid: 'FamilyAccessId',
  familycode: 'FamilyCode',
  familyid: 'FamilyId',
  familylastname: 'FamilyLastName',
  fullname: 'FullName',
  hourslogged: 'HoursLogged',
  idverified: 'IdVerified',
  impacteventid: 'ImpactEventId',
  inventoryitemid: 'InventoryItemId',
  inventorymovementid: 'InventoryMovementId',
  inventoryreportid: 'InventoryReportId',
  itemcategory: 'ItemCategory',
  isactive: 'IsActive',
  ispublic: 'IsPublic',
  lastloginat: 'LastLoginAt',
  lastmovementreason: 'LastMovementReason',
  lastmovementat: 'LastMovementAt',
  logisticsnote: 'LogisticsNote',
  lowstock: 'LowStock',
  message: 'Message',
  metadatajson: 'MetadataJson',
  minstock: 'MinStock',
  moderatedat: 'ModeratedAt',
  moderatedbyuserid: 'ModeratedByUserId',
  movementtype: 'MovementType',
  name: 'Name',
  occupiedcount: 'OccupiedCount',
  optionalwindow: 'OptionalWindow',
  passwordhash: 'PasswordHash',
  performedbyuserid: 'PerformedByUserId',
  pinhash: 'PinHash',
  plannedcheckoutdate: 'PlannedCheckoutDate',
  plannedroomid: 'PlannedRoomId',
  prioritylabel: 'PriorityLabel',
  priorityreason: 'PriorityReason',
  priorityscore: 'PriorityScore',
  publicdetail: 'PublicDetail',
  publictitle: 'PublicTitle',
  qrcode: 'QrCode',
  quantity: 'Quantity',
  referralcode: 'ReferralCode',
  referralid: 'ReferralId',
  relatedrequestid: 'RelatedRequestId',
  relatedroomid: 'RelatedRoomId',
  regulationaccepted: 'RegulationAccepted',
  reportcount: 'ReportCount',
  requestid: 'RequestId',
  requesteddate: 'RequestedDate',
  requestedshiftperiod: 'RequestedShiftPeriod',
  requestedtasktype: 'RequestedTaskType',
  requesttype: 'RequestType',
  resolvedat: 'ResolvedAt',
  returnpassid: 'ReturnPassId',
  rolecode: 'RoleCode',
  roleid: 'RoleId',
  rolename: 'RoleName',
  roomcode: 'RoomCode',
  roomid: 'RoomId',
  roomtype: 'RoomType',
  roomnote: 'RoomNote',
  roomstatus: 'RoomStatus',
  rolelabel: 'RoleLabel',
  reviewbyuserid: 'ReviewByUserId',
  reviewedbyuserid: 'ReviewedByUserId',
  reason: 'Reason',
  shift: 'Shift',
  shiftday: 'ShiftDay',
  shiftperiod: 'ShiftPeriod',
  simplesignature: 'SimpleSignature',
  sitecode: 'SiteCode',
  siteid: 'SiteId',
  sitename: 'SiteName',
  stafftaskid: 'StaffTaskId',
  suggestedroomcode: 'SuggestedRoomCode',
  taskcount: 'TaskCount',
  taskday: 'TaskDay',
  tasktype: 'TaskType',
  sourceentityid: 'SourceEntityId',
  sourceentitytype: 'SourceEntityType',
  startedat: 'StartedAt',
  staydays: 'StayDays',
  status: 'Status',
  stock: 'Stock',
  ticketcode: 'TicketCode',
  title: 'Title',
  tripid: 'TripId',
  unit: 'Unit',
  urgency: 'Urgency',
  userid: 'UserId',
  instructions: 'Instructions',
  volunteername: 'VolunteerName',
  volunteeruserid: 'VolunteerUserId',
  volunteertaskid: 'VolunteerTaskId',
  volunteerchangerequestid: 'VolunteerChangeRequestId',
  volunteershiftid: 'VolunteerShiftId',
  volunteertype: 'VolunteerType',
  waitingstartedat: 'WaitingStartedAt',
  itemcode: 'ItemCode',
  isread: 'IsRead',
  updatedat: 'UpdatedAt',
  availableat: 'AvailableAt',
  notificationid: 'NotificationId',
  relatedentityid: 'RelatedEntityId',
  relatedentitytype: 'RelatedEntityType',
  type: 'Type',
  workdays: 'WorkDays',
  starttime: 'StartTime',
  endtime: 'EndTime',
  shiftlabel: 'ShiftLabel',
  requestedrolename: 'RequestedRoleName',
  requestedworkdays: 'RequestedWorkDays',
  requestedstarttime: 'RequestedStartTime',
  requestedendtime: 'RequestedEndTime',
  requestedshiftlabel: 'RequestedShiftLabel',
  staffprofileid: 'StaffProfileId',
  workarea: 'WorkArea',
  currentload: 'CurrentLoad',
  detail: 'Detail',
  departureremindersentat: 'DepartureReminderSentAt',
  dossiersummary: 'DossierSummary',
  estimatedcheckoutdate: 'EstimatedCheckoutDate',
  feedbackmessage: 'FeedbackMessage',
  followupid: 'FollowUpId',
  origincity: 'OriginCity',
  originhospital: 'OriginHospital',
  previouscheckoutdate: 'PreviousCheckoutDate',
  recordedat: 'RecordedAt',
  recordedbyuserid: 'RecordedByUserId',
  requesttemplatejson: 'RequestTemplateJson',
  socialworkername: 'SocialWorkerName',
  clinicname: 'ClinicName',
  childname: 'ChildName',
  diagnosis: 'Diagnosis',
  documentreferenceurl: 'DocumentReferenceUrl',
  documentoreferenciaurl: 'DocumentReferenceUrl',
  transporteventready: 'TransportEventReady',
  familycontactphone: 'FamilyContactPhone',
  requestid: 'RequestId',
}

function transformRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [KEY_ALIASES[key] || key, value])
  )
}

function normalizeResult(result) {
  const rows = result.rows.map(transformRow)
  return {
    rows,
    rowCount: result.rowCount,
    recordset: rows,
    recordsets: [rows],
  }
}

function convertNamedParams(queryText, paramsMap) {
  const names = []
  const sqlText = queryText.replace(/@([A-Za-z][A-Za-z0-9_]*)/g, (_, name) => {
    const existingIndex = names.indexOf(name)
    if (existingIndex >= 0) return `$${existingIndex + 1}`
    names.push(name)
    return `$${names.length}`
  })

  const values = names.map((name) => (paramsMap.has(name) ? paramsMap.get(name) : null))
  return { sqlText, values }
}

class CompatRequest {
  constructor(queryable) {
    this.queryable = queryable
    this.params = new Map()
  }

  input(name, typeOrValue, maybeValue) {
    const value = arguments.length >= 3 ? maybeValue : typeOrValue
    this.params.set(name, value)
    return this
  }

  async query(queryText) {
    const { sqlText, values } = convertNamedParams(queryText, this.params)
    const result = await this.queryable.query(sqlText, values)
    return normalizeResult(result)
  }
}

class CompatQueryable {
  constructor(queryable) {
    this.queryable = queryable
  }

  request() {
    return new CompatRequest(this.queryable)
  }

  async query(queryText, values = []) {
    const result = await this.queryable.query(queryText, values)
    return normalizeResult(result)
  }
}

function getConfig() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    throw new Error('DATABASE_URL no esta configurada. Para Neon define DATABASE_URL en tu .env')
  }

  return {
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
  }
}

export async function getPool() {
  if (!poolInstance) {
    poolInstance = new Pool(getConfig())
    compatPoolInstance = new CompatQueryable(poolInstance)
  }

  return compatPoolInstance
}

export async function withTransaction(work) {
  if (!poolInstance) {
    await getPool()
  }

  const client = await poolInstance.connect()
  const compatClient = new CompatQueryable(client)

  try {
    await client.query('BEGIN')
    const result = await work(compatClient)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

class CompatSqlRequest {
  constructor(ctx) {
    return ctx.request()
  }
}

export const sql = {
  Int: 'int',
  Bit: 'bit',
  Date: 'date',
  Decimal: (...args) => args,
  NVarChar: (...args) => args,
  MAX: 'max',
  Request: CompatSqlRequest,
}
