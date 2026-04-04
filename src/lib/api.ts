const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787/api').replace(/\/$/, '')

interface ApiEnvelope<T> {
  success: boolean
  data: T
  error: { message: string; details?: string | null } | null
}

type HttpMethod = 'GET' | 'POST' | 'PATCH'

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

export interface InternalLoginResponse {
  token: string
  user: {
    userId: number
    fullName: string
    email: string
    role: 'hospital' | 'staff' | 'volunteer'
    siteId: number
    siteName: string
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

export interface BackendKioskStatusResponse {
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
}

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

export function loginInternal(email: string, password: string) {
  return apiRequest<InternalLoginResponse>('/auth/login', { method: 'POST', body: { email, password } })
}

export function loginFamily(code: string, pin: string) {
  return apiRequest<FamilyLoginResponse>('/auth/family-access', { method: 'POST', body: { code, pin } })
}

export function getReferrals(token: string) {
  return apiRequest<BackendReferral[]>('/referrals', { token })
}

export function createReferral(
  token: string,
  payload: { siteId: number; arrivalDate: string; companionCount: number; logisticsNote?: string; eligibilityConfirmed: boolean }
) {
  return apiRequest<BackendReferral>('/referrals', { method: 'POST', token, body: payload })
}

export function updateReferralStatus(token: string, referralId: number, status: 'enviada' | 'en_revision' | 'aceptada') {
  return apiRequest<BackendReferral>('/referrals/status', { method: 'PATCH', token, body: { referralId, status } })
}

export function getFamilies(token: string) {
  return apiRequest<BackendFamily[]>('/families', { token })
}

export function getFamilyStatus(token: string) {
  return apiRequest<BackendFamilyStatusResponse>('/families/status', { token })
}

export function getFamilyStatusByCode(token: string, code: string) {
  return apiRequest<BackendFamilyStatusResponse>(`/families/status?code=${encodeURIComponent(code)}`, { token })
}

export function getKioskStatus(code: string) {
  return apiRequest<BackendKioskStatusResponse>(`/kiosk/status?code=${encodeURIComponent(code)}`)
}

export function getRequests(token: string) {
  return apiRequest<BackendRequest[]>('/requests', { token })
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

export function getTrips(token: string) {
  return apiRequest<BackendTrip[]>('/trips', { token })
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

export function getDonorImpact() {
  return apiRequest<DonorImpactResponse>('/donor/impact')
}
