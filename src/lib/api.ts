const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787/api').replace(/\/$/, '')

interface ApiEnvelope<T> {
  success: boolean
  data: T
  error: { message: string; details?: string | null } | null
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function apiRequest<T>(path: string, options: { method?: HttpMethod; token?: string | null; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const payload = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || 'No se pudo completar la solicitud')
  }

  return payload.data
}

export type InternalRole = 'superadmin' | 'admin' | 'hospital' | 'staff' | 'volunteer'

export interface InternalLoginResponse {
  token: string
  user: {
    userId: number
    fullName: string
    email: string
    role: InternalRole
    siteId: number | null
    siteName: string | null
  }
}

export interface FamilyLoginResponse {
  token: string
  family: {
    familyId: number
    caregiverName: string
    familyLastName: string
    siteId: number
  }
}

export interface BackendReferral {
  ReferralId: number
  SiteId: number
  AssignedSiteId?: number | null
  CaregiverName: string
  FamilyLastName: string
  ChildName?: string | null
  Diagnosis?: string | null
  ReferralCode: string
  FamilyCode: string
  Status: 'enviada' | 'en_revision' | 'aceptada'
  AdmissionStage?: 'referencia' | 'borrador_extraido' | 'expediente_armado' | 'aprobada' | 'lista_espera'
  OriginHospital?: string | null
  OriginCity?: string | null
  FamilyContactPhone?: string | null
  RequestTemplateJson?: string | null
  DossierSummary?: string | null
  SocialWorkerName?: string | null
  ApprovedAt?: string | null
  WaitlistEnteredAt?: string | null
  ArrivalDate: string
  CompanionCount: number
  LogisticsNote: string | null
  EligibilityConfirmed: boolean
  CreatedAt: string
  SiteName?: string
  AssignedSiteName?: string | null
  ReservedRoomId?: number | null
  ReservedRoomCode?: string | null
  Message?: string
}

export interface BackendFamily {
  FamilyId: number
  ReferralId: number | null
  PlannedRoomId?: number | null
  CaregiverName: string
  FamilyLastName: string
  StayDays?: number
  PlannedCheckoutDate?: string | null
  AutomationStatus?: 'pendiente' | 'sin_cupo' | 'preparacion' | 'reservada' | 'ocupada' | 'checkout_completado'
  AdmissionStatus: 'pendiente' | 'checkin_completado'
  IdVerified: boolean
  RegulationAccepted: boolean
  SimpleSignature: string | null
  TicketCode: string | null
  QrCode: string | null
  RoomCode: string | null
  SiteName: string
  IsActive?: boolean
}

export interface BackendRequest {
  RequestId: number
  SiteId: number
  FamilyId: number | null
  Title: string
  RequestType: 'transporte' | 'kit' | 'alimento' | 'recepcion'
  Urgency: 'baja' | 'media' | 'alta'
  OptionalWindow: string | null
  PriorityScore: number
  PriorityLabel: 'baja' | 'media' | 'alta'
  PriorityReason: string
  Status: 'referencia' | 'borrador_extraido' | 'nueva' | 'asignada' | 'en_proceso' | 'resuelta'
  ReferralId?: number | null
  DocumentReferenceUrl?: string | null
  AssignedRole: 'staff' | 'volunteer'
  AssignedDisplayName: string | null
  CreatedAt: string
}

export interface BackendTrip {
  TripId: number
  SiteId: number
  FamilyId: number
  Destination: string
  Shift: 'AM' | 'PM'
  AssignedDisplayName: string | null
  Status: 'pendiente' | 'en_curso' | 'finalizado'
  StartedAt: string | null
  EndedAt: string | null
  DurationMinutes: number | null
}

export interface BackendFamilyStatusResponse {
  family: {
    FamilyId: number
    CaregiverName: string
    FamilyLastName: string
    AdmissionStatus: 'pendiente' | 'checkin_completado'
    SiteName: string
    SiteCode: string
    RoomCode: string | null
  }
  requests: BackendRequest[]
  trips: BackendTrip[]
  returnPasses: Array<{
    ReturnPassId: number
    RequestedDate: string
    CompanionCount: number
    LogisticsNote: string | null
    Status: 'borrador' | 'enviado'
    CreatedAt: string
  }>
}

export type BackendKioskStatusResponse = BackendFamilyStatusResponse

export interface DonorImpactResponse {
  bySite: Array<{
    SiteCode: string
    Name: string
    impactEvents: number
    familiesSupported: number
    totalTrips: number
    totalRequests: number
  }>
  feed: Array<{
    ImpactEventId: number
    SiteCode: string
    SiteName: string
    EventType: string
    PublicTitle: string
    PublicDetail: string
    CreatedAt: string
  }>
}

export interface BackendUser {
  UserId: number
  FullName: string
  Email: string
  SiteId: number | null
  SiteName: string | null
  RoleCode: InternalRole | 'hospital'
  IsActive: boolean
  CreatedAt: string
}

export interface PendingReferral extends BackendReferral {}

export interface AdmissionRecord extends BackendReferral {
  FamilyId?: number | null
  DraftRequestId?: number | null
}

export interface ExtractedAdmissionReference {
  childFullName: string
  age: string
  originHospital: string
  originDepartment: string
  originCity: string
  referringDoctorName: string
  doctorOfficePhone: string
  scheduledDate: string
  tutorFullName: string
  tutorPhone: string
  siteSuggestion: string
  message: string
}

export interface ClinicalHistoryRecord {
  FollowUpId: number
  FamilyId: number
  ReferralId: number | null
  SiteId: number
  SiteName: string
  RecordedByUserId: number | null
  RecordedByName?: string | null
  ClinicName: string | null
  FeedbackMessage: string
  PreviousCheckoutDate: string | null
  EstimatedCheckoutDate: string | null
  RecordedAt: string
}

export interface DepartureReminderRecord {
  FamilyId: number
  SiteId: number
  CaregiverName: string
  FamilyLastName: string
  PlannedCheckoutDate: string
  DepartureReminderSentAt: string | null
  TicketCode: string | null
  SiteName: string
  RoomCode: string | null
  ReminderMessage: string
}

export interface ActivationResponse {
  family: BackendFamily
  access: {
    FamilyAccessId: number
    TicketCode: string
    QrCode: string
    IsActive: boolean
  }
  generatedPin: string
  automation?: FamilyStayAutomationRecord | null
}

export interface FamilyStayAutomationRecord {
  FamilyId: number
  SiteId: number
  SiteName: string
  CaregiverName: string
  FamilyLastName: string
  ArrivalDate: string
  StayDays: number
  PlannedCheckoutDate: string | null
  AutomationStatus: 'pendiente' | 'sin_cupo' | 'preparacion' | 'reservada' | 'ocupada' | 'checkout_completado'
  PlannedRoomId: number | null
  PlannedRoomCode: string | null
  AssignedVolunteerUserId?: number | null
  AssignedVolunteerName?: string | null
  Message: string
}

export interface VolunteerTask {
  VolunteerTaskId: number
  SiteId: number
  VolunteerUserId: number
  VolunteerName?: string
  AssignedByName?: string
  FamilyId: number | null
  RelatedRequestId: number | null
  RelatedRoomId?: number | null
  Title: string
  TaskType: 'cocina' | 'lavanderia' | 'traslados' | 'acompanamiento' | 'recepcion' | 'limpieza' | 'inventario'
  ShiftPeriod: 'AM' | 'PM'
  TaskDay: string
  Status: 'pendiente' | 'en_proceso' | 'completada'
  Notes: string | null
  CreatedAt: string
  UpdatedAt: string
}

export interface VolunteerChangeRequest {
  VolunteerChangeRequestId: number
  SiteId: number
  VolunteerUserId: number
  VolunteerName?: string
  RequestedShiftPeriod: 'AM' | 'PM' | null
  RequestedTaskType: VolunteerTask['TaskType'] | null
  Reason: string
  Status: 'pendiente' | 'aprobada' | 'rechazada'
  CreatedAt: string
  UpdatedAt: string
}

export interface BackendVolunteerNotification {
  NotificationId: number
  VolunteerTaskId: number | null
  Title: string
  Message: string
  TaskDay: string
  ShiftPeriod: 'AM' | 'PM'
  IsRead: boolean
  CreatedAt: string
}

export interface BackendVolunteerRosterItem {
  UserId: number
  FullName: string
  Email: string
  SiteId: number
  SiteName: string
  VolunteerType: 'individual' | 'escolar' | 'empresarial'
  RoleName: 'traslados' | 'recepcion' | 'acompanamiento' | 'cocina' | 'lavanderia' | 'limpieza'
  WorkDays: string
  StartTime: string
  EndTime: string
  ShiftLabel: 'manana' | 'tarde' | 'noche'
  AvailabilityStatus: 'disponible' | 'cupo_limitado' | 'no_disponible'
  HoursLogged: number
  CurrentTasks: number
}

export interface BackendStaffRosterItem {
  UserId: number
  FullName: string
  Email: string
  SiteId: number
  SiteName: string
  WorkArea: 'recepcion' | 'checkin' | 'habitaciones' | 'inventario' | 'coordinacion' | 'analitica' | 'apoyo_familiar'
  WorkDays: string
  StartTime: string
  EndTime: string
  ShiftPeriod: 'AM' | 'PM'
  ShiftLabel: 'manana' | 'tarde' | 'noche'
  AvailabilityStatus: 'disponible' | 'cupo_limitado' | 'no_disponible'
  HoursLogged: number
  CurrentLoad: number
}

export interface StaffDashboardResponse {
  pendingRequestsToday: number
  availableVolunteersNow: number
  familiesInHouse: number
  unassignedTasks: number
}

export interface StaffTaskRecord {
  StaffTaskId: number
  SiteId: number
  SiteName: string
  ReferralId: number | null
  FamilyId: number | null
  AssignedUserId: number | null
  AssignedUserName?: string | null
  CreatedByUserId: number | null
  CreatedByName?: string | null
  CaregiverName?: string | null
  FamilyLastName?: string | null
  RoomCode?: string | null
  SuggestedRoomCode?: string | null
  Title: string
  Instructions: string
  DueDate?: string | null
  Priority: 'baja' | 'media' | 'alta'
  Status: 'pendiente' | 'en_proceso' | 'completada'
  CreatedAt: string
  UpdatedAt: string
}

export function loginInternal(email: string, password: string) {
  return apiRequest<InternalLoginResponse>('/auth/login', { method: 'POST', body: { email, password } })
}

export function loginFamily(code: string, pin: string) {
  return apiRequest<FamilyLoginResponse>('/auth/family-access', { method: 'POST', body: { code, pin } })
}

export function getMe(token: string) {
  return apiRequest<{ role: string; profile: Record<string, unknown> }>('/auth/me', { token })
}

export function changePassword(token: string, currentPassword: string, newPassword: string) {
  return apiRequest<{ message: string }>('/auth/change-password', { method: 'PATCH', token, body: { currentPassword, newPassword } })
}

export function changePin(token: string, currentPin: string, newPin: string) {
  return apiRequest<{ message: string }>('/auth/change-pin', { method: 'PATCH', token, body: { currentPin, newPin } })
}

export function getReferrals(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendReferral[]>(`/referrals${query}`, { token })
}

export function createReferral(
  token: string,
  payload: {
    siteId: number
    caregiverName: string
    familyLastName: string
    arrivalDate: string
    companionCount: number
    logisticsNote?: string
    eligibilityConfirmed: boolean
    originHospital?: string
    originCity?: string
    familyContactPhone?: string
  }
) {
  return apiRequest<BackendReferral>('/referrals', { method: 'POST', token, body: payload })
}

export function getAdmissions(token: string, params: { siteId?: number | null; stage?: 'referencia' | 'borrador_extraido' | 'expediente_armado' | 'aprobada' | 'lista_espera' } = {}) {
  const query = new URLSearchParams()
  if (params.siteId) query.set('siteId', String(params.siteId))
  if (params.stage) query.set('stage', params.stage)
  return apiRequest<AdmissionRecord[]>(`/admissions${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export function createAdmissionReferral(token: string, payload: {
  siteId: number
  childFullName?: string
  age?: string
  originDepartment?: string
  referringDoctorName?: string
  doctorOfficePhone?: string
  tutorFullName: string
  tutorPhone?: string
  documentName?: string
  scheduledDate?: string
  arrivalDate: string
  companionCount: number
  logisticsNote?: string
  eligibilityConfirmed: boolean
  originHospital?: string
  originCity?: string
  documentReferenceUrl?: string
  admissionStage?: 'referencia' | 'borrador_extraido'
}) {
  return apiRequest<AdmissionRecord>('/admissions', { method: 'POST', token, body: payload })
}

export function extractAdmissionReference(token: string, payload: { fileName: string; hintText?: string; dataUrl?: string }) {
  return apiRequest<ExtractedAdmissionReference>('/admissions/extract', { method: 'POST', token, body: payload })
}

export function updateAdmissionRecord(token: string, payload: {
  referralId: number
  action: 'enrich' | 'approve' | 'clinical-feedback' | 'assign-waitlist-room'
  socialWorkerName?: string
  familyContactPhone?: string
  dossierSummary?: string
  originHospital?: string
  originCity?: string
  childName?: string
  diagnosis?: string
  roomId?: number
  familyId?: number
  requestId?: number
  clinicName?: string
  feedbackMessage?: string
  estimatedCheckoutDate?: string | null
}) {
  return apiRequest<AdmissionRecord | ClinicalHistoryRecord>('/admissions', { method: 'PATCH', token, body: payload })
}

export function getClinicalHistory(token: string, params: { familyId?: number | null; referralId?: number | null; siteId?: number | null }) {
  const query = new URLSearchParams()
  if (params.familyId) query.set('familyId', String(params.familyId))
  if (params.referralId) query.set('referralId', String(params.referralId))
  if (params.siteId) query.set('siteId', String(params.siteId))
  return apiRequest<ClinicalHistoryRecord[]>(`/admissions/clinical-history?${query.toString()}`, { token })
}

export function getDepartureReminders(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<DepartureReminderRecord[]>(`/admissions/departure-reminders${query}`, { token })
}

export function markDepartureReminderPreparedApi(token: string, familyId: number) {
  return apiRequest<{ FamilyId: number; DepartureReminderSentAt: string; Message: string }>('/admissions/departure-reminders', {
    method: 'PATCH',
    token,
    body: { familyId },
  })
}

export function updateReferralStatus(token: string, referralId: number, status: 'enviada' | 'en_revision' | 'aceptada') {
  return apiRequest<BackendReferral>('/referrals/status', { method: 'PATCH', token, body: { referralId, status } })
}

export function getFamilies(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendFamily[]>(`/families${query}`, { token })
}

export function checkInFamily(token: string, payload: { familyId: number; roomId?: number | null; idVerified: boolean; regulationAccepted: boolean; simpleSignature?: string }) {
  return apiRequest<BackendFamily>('/families/checkin', { method: 'PATCH', token, body: payload })
}

export function getFamilyStatus(token: string) {
  return apiRequest<BackendFamilyStatusResponse>('/families/status', { token })
}

export function getFamilyStatusByCode(token: string, code: string) {
  return apiRequest<BackendFamilyStatusResponse>(`/families/status?code=${encodeURIComponent(code)}`, { token })
}

export function getKioskStatus(code: string, token?: string | null) {
  return apiRequest<BackendKioskStatusResponse>(`/kiosk/status?code=${encodeURIComponent(code)}`, { token: token || null })
}

export function getRequests(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendRequest[]>(`/requests${query}`, { token })
}

export function createRequest(
  token: string,
  payload: { familyId: number; title: string; requestType: 'transporte' | 'kit' | 'alimento' | 'recepcion'; urgency: 'baja' | 'media' | 'alta'; optionalWindow?: string }
) {
  return apiRequest<BackendRequest>('/requests', { method: 'POST', token, body: payload })
}

export function assignRequest(
  token: string,
  payload: { requestId: number; assignedRole: 'staff' | 'volunteer'; assignedUserId?: number; assignedDisplayName: string }
) {
  return apiRequest<BackendRequest>('/requests/assign', { method: 'PATCH', token, body: payload })
}

export function updateRequestWorkflowStatus(token: string, requestId: number, status: 'asignada' | 'en_proceso') {
  return apiRequest<BackendRequest>('/requests/status', { method: 'PATCH', token, body: { requestId, status } })
}

export function resolveRequest(token: string, requestId: number) {
  return apiRequest<BackendRequest>('/requests/resolve', { method: 'PATCH', token, body: { requestId } })
}

export function getTrips(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendTrip[]>(`/trips${query}`, { token })
}

export function createTrip(
  token: string,
  payload: { familyId: number; destination: string; shift: 'AM' | 'PM'; assignedDisplayName?: string }
) {
  return apiRequest<BackendTrip>('/trips', { method: 'POST', token, body: payload })
}

export function startTrip(token: string, tripId: number) {
  return apiRequest<BackendTrip>('/trips/start', { method: 'PATCH', token, body: { tripId } })
}

export function finishTrip(token: string, tripId: number) {
  return apiRequest<BackendTrip>('/trips/finish', { method: 'PATCH', token, body: { tripId } })
}

export function getVolunteerShifts(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<Array<Record<string, unknown>>>(`/volunteers/shifts${query}`, { token })
}

export function createVolunteerShift(
  token: string,
  payload: {
    siteId: number
    userId: number
    volunteerName: string
    volunteerType: 'individual' | 'escolar' | 'empresarial'
    roleName: 'traslados' | 'recepcion' | 'acompanamiento' | 'cocina' | 'lavanderia' | 'limpieza'
    shiftDay: string
    workDays: string[]
    startTime: string
    endTime: string
    shiftPeriod: 'AM' | 'PM'
    shiftLabel: 'manana' | 'tarde' | 'noche'
    availabilityStatus: 'disponible' | 'cupo_limitado' | 'no_disponible'
    hoursLogged: number
  },
) {
  return apiRequest<Record<string, unknown>>('/volunteers/shifts', { method: 'POST', token, body: payload })
}

export function getVolunteerRoster(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendVolunteerRosterItem[]>(`/volunteers/roster${query}`, { token })
}

export function getVolunteerTasks(token: string, params: { siteId?: number | null; volunteerUserId?: number | null } = {}) {
  const query = new URLSearchParams()
  if (params.siteId) query.set('siteId', String(params.siteId))
  if (params.volunteerUserId) query.set('volunteerUserId', String(params.volunteerUserId))
  return apiRequest<VolunteerTask[]>(`/volunteer-tasks${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export function createVolunteerTask(token: string, payload: { volunteerUserId: number; title: string; taskType: VolunteerTask['TaskType']; shiftPeriod: 'AM' | 'PM'; taskDay: string; familyId?: number; relatedRequestId?: number; relatedRoomId?: number; notes?: string }) {
  return apiRequest<VolunteerTask>('/volunteer-tasks', { method: 'POST', token, body: payload })
}

export function updateVolunteerTask(
  token: string,
  payload: {
    volunteerTaskId: number
    volunteerUserId?: number
    title?: string
    taskType?: VolunteerTask['TaskType']
    shiftPeriod?: 'AM' | 'PM'
    status?: VolunteerTask['Status']
    notes?: string | null
    relatedRoomId?: number | null
  },
) {
  return apiRequest<VolunteerTask>('/volunteer-tasks', { method: 'PATCH', token, body: payload })
}

export function getVolunteerChangeRequests(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<VolunteerChangeRequest[]>(`/volunteer-change-requests${query}`, { token })
}

export function createVolunteerChangeRequest(token: string, payload: { requestedShiftPeriod?: 'AM' | 'PM'; requestedTaskType?: VolunteerTask['TaskType']; reason: string }) {
  return apiRequest<VolunteerChangeRequest>('/volunteer-change-requests', { method: 'POST', token, body: payload })
}

export function createDetailedVolunteerChangeRequest(
  token: string,
  payload: {
    requestedShiftPeriod?: 'AM' | 'PM'
    requestedTaskType?: VolunteerTask['TaskType']
    requestedRoleName?: BackendVolunteerRosterItem['RoleName']
    requestedWorkDays?: string[]
    requestedStartTime?: string
    requestedEndTime?: string
    requestedShiftLabel?: BackendVolunteerRosterItem['ShiftLabel']
    reason: string
  },
) {
  return apiRequest<VolunteerChangeRequest>('/volunteer-change-requests', { method: 'POST', token, body: payload })
}

export function reviewVolunteerChangeRequest(token: string, volunteerChangeRequestId: number, status: 'aprobada' | 'rechazada') {
  return apiRequest<VolunteerChangeRequest>('/volunteer-change-requests', { method: 'PATCH', token, body: { volunteerChangeRequestId, status } })
}

export function getNotifications(token: string) {
  return apiRequest<{ unreadCount: number; notifications: BackendVolunteerNotification[] }>('/notifications', { token })
}

export function markNotificationRead(token: string, notificationId: number) {
  return apiRequest<{ message: string }>('/notifications', { method: 'PATCH', token, body: { notificationId } })
}

export function getStaffDashboard(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<StaffDashboardResponse>(`/staff/dashboard${query}`, { token })
}

export function getStaffRoster(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendStaffRosterItem[]>(`/staff/roster${query}`, { token })
}

export function getStaffTasks(token: string, params: { siteId?: number | null; status?: 'pendiente' | 'en_proceso' | 'completada'; assignedUserId?: number | null } = {}) {
  const query = new URLSearchParams()
  if (params.siteId) query.set('siteId', String(params.siteId))
  if (params.status) query.set('status', params.status)
  if (params.assignedUserId) query.set('assignedUserId', String(params.assignedUserId))
  return apiRequest<StaffTaskRecord[]>(`/staff/tasks${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export function createStaffTask(token: string, payload: {
  siteId?: number | null
  title: string
  description: string
  assignedUserId: number
  dueDate: string
  priority: 'baja' | 'media' | 'alta'
}) {
  return apiRequest<StaffTaskRecord>('/staff/tasks', { method: 'POST', token, body: payload })
}

export function updateStaffTask(token: string, payload: {
  staffTaskId: number
  status?: 'pendiente' | 'en_proceso' | 'completada'
}) {
  return apiRequest<StaffTaskRecord>('/staff/tasks', { method: 'PATCH', token, body: payload })
}

export function sendVolunteerAlert(token: string, payload: { toVolunteerUserId: number; alertType: 'need_help' | 'running_late' | 'task_completed' | 'cover_me' }) {
  return apiRequest<{ message: string }>('/volunteer-alerts', { method: 'POST', token, body: payload })
}

export function sendStaffAlert(token: string, payload: { toStaffUserId: number; alertType: 'incoming_families' | 'prepare_kits' | 'reception_help' | 'checkin_pending' }) {
  return apiRequest<{ message: string }>('/staff-alerts', { method: 'POST', token, body: payload })
}

export function getDonorImpact(siteName?: string) {
  const query = siteName ? `?siteName=${encodeURIComponent(siteName)}` : ''
  return apiRequest<DonorImpactResponse>(`/donor/impact${query}`)
}

export interface GalleryImage {
  id: number
  impact_title: string
  description: string
  site: string
  image_url: string
  month: string
}

export function getGallery() {
  return apiRequest<GalleryImage[]>('/donor/gallery')
}

export interface DonorEvent {
  id: number
  event_title: string
  description: string
  site: string
  date: string
  image_url: string
}

export function getEvents() {
  return apiRequest<DonorEvent[]>('/donor/events')
}

export interface RoomArrivalFlow {
  FamilyId: number
  CaregiverName: string
  FamilyLastName: string
  ArrivalDate: string
  SiteId: number
  SiteName: string
  RequiredCapacity: number
  FlowStatus: 'ready' | 'assigned' | 'reserved' | 'preparing' | 'prep_pending' | 'unavailable'
  Message: string
  SuggestedRoomId: number | null
  SuggestedRoomCode: string | null
  SuggestedRoomStatus: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento' | null
  AssignedVolunteerUserId: number | null
  AssignedVolunteerName: string | null
  ExistingTaskId: number | null
}

export interface Room {
  RoomId: number
  SiteId: number
  RoomCode: string
  Capacity: number
  RoomType?: 'normal' | 'especial'
  OccupiedCount: number
  RoomStatus?: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento'
  AvailableAt?: string | null
  RoomNote?: string | null
  IsActive: boolean
  SiteName: string
  AssignedFamilyId?: number | null
  AssignedFamilyName?: string | null
  AssignedFamilyLastName?: string | null
  AssignedFamilyAdmissionStatus?: 'pendiente' | 'checkin_completado' | null
  assignedfamilies: string | null
}

export interface BackendInventoryItem {
  InventoryItemId: number
  ItemCode: string
  Name: string
  ItemCategory: 'kit' | 'cocina' | 'limpieza' | 'otro'
  Unit: string
  Stock: number
  MinStock: number
  ExpiryDate: string | null
  LowStock?: boolean
  ExpiringSoon?: boolean
  LastMovementReason?: string | null
  LastMovementAt?: string | null
}

export function getRooms(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<Room[]>(`/staff/rooms${query}`, { token })
}

export function updateRoom(token: string, payload: { roomId: number; availableAt?: string | null; roomNote?: string | null; roomStatus?: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento' }) {
  return apiRequest<Room>('/staff/rooms', { method: 'PATCH', token, body: payload })
}

export function getRoomArrivalFlow(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<RoomArrivalFlow[]>(`/staff/arrival-flow${query}`, { token })
}

export function confirmRoomArrivalAssignment(token: string, payload: { familyId: number; roomId: number }) {
  return apiRequest<{ FamilyId: number; Room: Pick<Room, 'RoomId' | 'RoomCode' | 'RoomStatus'>; Message: string }>('/staff/arrival-flow', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function releaseRoom(token: string, roomId: number) {
  return apiRequest<{
    Room: Pick<Room, 'RoomId' | 'RoomCode' | 'RoomStatus'>
    AssignedVolunteerUserId: number | null
    AssignedVolunteerName: string | null
    VolunteerTaskId: number | null
    Message: string
  }>('/staff/rooms/release', {
    method: 'PATCH',
    token,
    body: { roomId },
  })
}

export interface BackendInventoryReport {
  InventoryReportId: number
  SiteId: number
  VolunteerUserId: number
  VolunteerName?: string
  SiteName?: string
  ItemCategory: 'kit' | 'cocina' | 'limpieza' | 'lavanderia' | 'recepcion'
  Title: string
  Detail: string
  Status: 'pendiente' | 'atendido'
  CreatedAt: string
  UpdatedAt: string
}

export function getAdminUsers(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendUser[]>(`/admin/users${query}`, { token })
}

export function createAdminUser(token: string, payload: {
  fullName: string
  email: string
  role: 'admin' | 'staff' | 'volunteer'
  siteId: number
  password: string
  volunteerShift?: {
    volunteerType: 'individual' | 'escolar' | 'empresarial'
    roleName: 'traslados' | 'recepcion' | 'acompanamiento' | 'cocina' | 'lavanderia' | 'limpieza'
    shiftDay: string
    workDays: string[]
    startTime: string
    endTime: string
    shiftLabel?: 'manana' | 'tarde' | 'noche'
  }
  staffProfile?: {
    workArea: 'recepcion' | 'checkin' | 'habitaciones' | 'inventario' | 'coordinacion' | 'analitica' | 'apoyo_familiar'
    workDays: string[]
    startTime: string
    endTime: string
    shiftLabel?: 'manana' | 'tarde' | 'noche'
  }
}) {
  return apiRequest<BackendUser>('/admin/users', { method: 'POST', token, body: payload })
}

export function updateAdminUser(token: string, payload: { userId: number; fullName?: string; role?: 'admin' | 'staff' | 'volunteer'; siteId?: number; isActive?: boolean }) {
  return apiRequest<BackendUser>('/admin/users', { method: 'PATCH', token, body: payload })
}

export function deleteAdminUser(token: string, userId: number) {
  return apiRequest<{ message: string }>('/admin/users', { method: 'DELETE', token, body: { userId } })
}

export function getPendingReferrals(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<PendingReferral[]>(`/admin/pending-referrals${query}`, { token })
}

export function activateFamily(token: string, referralId: number, stayDays?: number) {
  return apiRequest<ActivationResponse>('/admin/activate-family', { method: 'POST', token, body: { referralId, stayDays } })
}

export function updateFamilyAccess(token: string, familyId: number, action: 'pause' | 'reactivate' | 'reset-pin') {
  return apiRequest<{ message: string; newPin?: string; ticketCode?: string; qrCode?: string }>('/admin/family-access', { method: 'PATCH', token, body: { familyId, action } })
}

export function getFamilyStayAutomation(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<FamilyStayAutomationRecord[]>(`/admin/family-stays${query}`, { token })
}

export function extendFamilyStayApi(token: string, payload: { familyId: number; extraDays: number }) {
  return apiRequest<FamilyStayAutomationRecord[]>('/admin/family-stays', {
    method: 'PATCH',
    token,
    body: { familyId: payload.familyId, extraDays: payload.extraDays, action: 'extend' },
  })
}

export function getInventoryStock(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendInventoryItem[]>(`/inventory/stock${query}`, { token })
}

export function createInventoryMovement(
  token: string,
  payload: { inventoryItemId: number; movementType: 'in' | 'out'; quantity: number; reason: string },
) {
  return apiRequest<{ movement: Record<string, unknown>; nextStock: number }>('/inventory/movements', { method: 'POST', token, body: payload })
}

export function getInventoryReports(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendInventoryReport[]>(`/inventory/reports${query}`, { token })
}

export function createInventoryReport(token: string, payload: { itemCategory: BackendInventoryReport['ItemCategory']; title: string; detail: string }) {
  return apiRequest<BackendInventoryReport>('/inventory/reports', { method: 'POST', token, body: payload })
}

export function updateInventoryReportStatus(token: string, payload: { inventoryReportId: number; status: 'pendiente' | 'atendido' }) {
  return apiRequest<BackendInventoryReport>('/inventory/reports', { method: 'PATCH', token, body: payload })
}

export function getCommunityPosts(token: string) {
  return apiRequest<Array<{ CommunityPostId: number; AuthorAlias: string; Message: string; CreatedAt: string }>>('/community/posts', { token })
}

export function createCommunityPostApi(token: string, message: string, authorAlias?: string) {
  return apiRequest<{ CommunityPostId: number; AuthorAlias: string; Message: string; CreatedAt: string }>('/community/posts', {
    method: 'POST',
    token,
    body: { message, authorAlias },
  })
}

export function getReturnPasses(token: string, familyId?: number | null) {
  const query = familyId ? `?familyId=${familyId}` : ''
  return apiRequest<Array<{ ReturnPassId: number; FamilyId: number; SiteId: number; RequestedDate: string; CompanionCount: number; LogisticsNote: string | null; Status: 'borrador' | 'enviado'; CreatedAt: string }>>(`/return-passes${query}`, { token })
}

export function createReturnPassApi(token: string, payload: { familyId: number; requestedDate: string; companionCount: number; logisticsNote?: string }) {
  return apiRequest<{ ReturnPassId: number; FamilyId: number; SiteId: number; RequestedDate: string; CompanionCount: number; LogisticsNote: string | null; Status: 'borrador' | 'enviado'; CreatedAt: string }>('/return-passes', {
    method: 'POST',
    token,
    body: payload,
  })
}

