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
  CaregiverName: string
  FamilyLastName: string
  ReferralCode: string
  FamilyCode: string
  Status: 'enviada' | 'en_revision' | 'aceptada'
  ArrivalDate: string
  CompanionCount: number
  LogisticsNote: string | null
  EligibilityConfirmed: boolean
  CreatedAt: string
  SiteName?: string
}

export interface BackendFamily {
  FamilyId: number
  ReferralId: number | null
  CaregiverName: string
  FamilyLastName: string
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
  FamilyId: number
  Title: string
  RequestType: 'transporte' | 'kit' | 'alimento' | 'recepcion'
  Urgency: 'baja' | 'media' | 'alta'
  OptionalWindow: string | null
  PriorityScore: number
  PriorityLabel: 'baja' | 'media' | 'alta'
  PriorityReason: string
  Status: 'nueva' | 'asignada' | 'en_proceso' | 'resuelta'
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

export interface ActivationResponse {
  family: BackendFamily
  access: {
    FamilyAccessId: number
    TicketCode: string
    QrCode: string
    IsActive: boolean
  }
  generatedPin: string
}

export interface VolunteerTask {
  VolunteerTaskId: number
  SiteId: number
  VolunteerUserId: number
  VolunteerName?: string
  AssignedByName?: string
  FamilyId: number | null
  RelatedRequestId: number | null
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
  RoleName: 'traslados' | 'recepcion' | 'acompanamiento' | 'cocina' | 'lavanderia'
  WorkDays: string
  StartTime: string
  EndTime: string
  ShiftLabel: 'manana' | 'tarde' | 'noche'
  AvailabilityStatus: 'disponible' | 'cupo_limitado' | 'no_disponible'
  HoursLogged: number
  CurrentTasks: number
}

export interface StaffDashboardResponse {
  pendingRequestsToday: number
  availableVolunteersNow: number
  familiesInHouse: number
  unassignedTasks: number
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
  payload: { siteId: number; caregiverName: string; familyLastName: string; arrivalDate: string; companionCount: number; logisticsNote?: string; eligibilityConfirmed: boolean }
) {
  return apiRequest<BackendReferral>('/referrals', { method: 'POST', token, body: payload })
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
    roleName: 'traslados' | 'recepcion' | 'acompanamiento' | 'cocina' | 'lavanderia'
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

export function createVolunteerTask(token: string, payload: { volunteerUserId: number; title: string; taskType: VolunteerTask['TaskType']; shiftPeriod: 'AM' | 'PM'; taskDay: string; familyId?: number; relatedRequestId?: number; notes?: string }) {
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

export function sendVolunteerAlert(token: string, payload: { toVolunteerUserId: number; alertType: 'need_help' | 'running_late' | 'task_completed' | 'cover_me' }) {
  return apiRequest<{ message: string }>('/volunteer-alerts', { method: 'POST', token, body: payload })
}

export function getDonorImpact(siteName?: string) {
  const query = siteName ? `?siteName=${encodeURIComponent(siteName)}` : ''
  return apiRequest<DonorImpactResponse>(`/donor/impact${query}`)
}

export function getAdminUsers(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<BackendUser[]>(`/admin/users${query}`, { token })
}

export function createAdminUser(token: string, payload: { fullName: string; email: string; role: 'admin' | 'staff' | 'volunteer'; siteId: number; password: string }) {
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

export function activateFamily(token: string, referralId: number) {
  return apiRequest<ActivationResponse>('/admin/activate-family', { method: 'POST', token, body: { referralId } })
}

export function updateFamilyAccess(token: string, familyId: number, action: 'pause' | 'reactivate' | 'reset-pin') {
  return apiRequest<{ message: string; newPin?: string; ticketCode?: string; qrCode?: string }>('/admin/family-access', { method: 'PATCH', token, body: { familyId, action } })
}

export function getInventoryStock(token: string, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : ''
  return apiRequest<Array<{ InventoryItemId: number; Name: string; Stock: number; MinStock: number; LowStock?: boolean }>>(`/inventory/stock${query}`, { token })
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
