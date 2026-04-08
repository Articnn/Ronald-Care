import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  activateFamily,
  assignRequest,
  changePassword,
  changePin,
  checkInFamily,
  createAdminUser,
  createCommunityPostApi,
  createInventoryMovement,
  createInventoryReport,
  createReferral as createReferralApi,
  createRequest as createRequestApi,
  createReturnPassApi,
  createTrip as createTripApi,
  createDetailedVolunteerChangeRequest,
  createVolunteerTask,
  deleteAdminUser,
  finishTrip as finishTripApi,
  getAdminUsers,
  getCommunityPosts,
  getDonorImpact,
  getFamilyStayAutomation,
  getFamilies,
  getFamilyStatus,
  getFamilyStatusByCode,
  getInventoryReports,
  getInventoryStock,
  getMe,
  markNotificationRead,
  getNotifications,
  getPendingReferrals,
  getReferrals,
  getRequests,
  getReturnPasses,
  getStaffDashboard,
  getStaffRoster,
  getTrips,
  getVolunteerChangeRequests,
  getVolunteerRoster,
  getVolunteerShifts,
  getVolunteerTasks,
  loginFamily,
  loginInternal,
  resolveRequest,
  reviewVolunteerChangeRequest,
  sendStaffAlert,
  sendVolunteerAlert as sendVolunteerAlertApi,
  startTrip as startTripApi,
  updateAdminUser,
  extendFamilyStayApi,
  updateFamilyAccess,
  updateInventoryReportStatus,
  updateReferralStatus as updateReferralStatusApi,
  updateRequestWorkflowStatus,
  updateVolunteerTask,
  type ActivationResponse,
  type BackendFamily,
  type BackendFamilyStatusResponse,
  type BackendInventoryItem,
  type BackendInventoryReport,
  type BackendKioskStatusResponse,
  type BackendReferral,
  type BackendRequest,
  type BackendStaffRosterItem,
  type BackendTrip,
  type BackendUser,
  type PendingReferral,
  type BackendVolunteerNotification,
  type BackendVolunteerRosterItem,
  type FamilyStayAutomationRecord,
  type StaffDashboardResponse,
  type VolunteerChangeRequest as BackendVolunteerChangeRequest,
  type VolunteerTask as BackendVolunteerTask,
} from '../lib/api'
import {
  guideSteps,
  initialCommunityPosts,
  initialImpactFeed,
  initialInventory,
  initialReturnPasses,
  initialRooms,
  initialStories,
  sites,
  supportMessages,
} from '../data/mockData'
import type {
  CommunityPost,
  CurrentUser,
  FamilyProfile,
  FamilyStayAutomation,
  GuideStep,
  ImpactFeedItem,
  InternalUserRecord,
  InventoryItem,
  InventoryReport,
  Referral,
  RequestStatus,
  RequestType,
  ReturnPass,
  Role,
  Room,
  SupportMessage,
  SupportRequest,
  StaffDashboardSummary,
  StaffRosterItem,
  Trip,
  VolunteerNotification,
  VolunteerRosterItem,
  VolunteerChangeRequest,
  VolunteerShift,
  VolunteerTask,
} from '../types'

interface KioskStatus {
  family: FamilyProfile
  requests: SupportRequest[]
  trips: Trip[]
}

interface DonorImpactSiteMetric {
  name: string
  impactEvents: number
  familiesSupported: number
  totalTrips: number
  totalRequests: number
}

const emptyStaffDashboard: StaffDashboardSummary = {
  pendingRequestsToday: 0,
  availableVolunteersNow: 0,
  familiesInHouse: 0,
  unassignedTasks: 0,
}

interface AppContextValue {
  role: Role
  site: string
  easyRead: boolean
  authToken: string | null
  isSyncing: boolean
  authError: string | null
  currentUser: CurrentUser | null
  currentFamily: FamilyProfile | null
  kioskStatus: KioskStatus | null
  referrals: Referral[]
  pendingReferrals: Referral[]
  families: FamilyProfile[]
  familyStayAutomation: FamilyStayAutomation[]
  rooms: Room[]
  requests: SupportRequest[]
  trips: Trip[]
  volunteerShifts: VolunteerShift[]
  volunteerRoster: VolunteerRosterItem[]
  staffRoster: StaffRosterItem[]
  volunteerTasks: VolunteerTask[]
  volunteerChangeRequests: VolunteerChangeRequest[]
  internalUsers: InternalUserRecord[]
  inventory: InventoryItem[]
  inventoryReports: InventoryReport[]
  guideSteps: GuideStep[]
  supportMessages: SupportMessage[]
  communityPosts: CommunityPost[]
  returnPasses: ReturnPass[]
  donorStories: typeof initialStories
  impactFeed: ImpactFeedItem[]
  donorImpactBySite: DonorImpactSiteMetric[]
  staffDashboard: StaffDashboardSummary
  notifications: VolunteerNotification[]
  unreadNotifications: number
  availableSites: string[]
  setRole: (role: Role) => void
  setSite: (site: string) => void
  setCurrentFamily: (family: FamilyProfile | null) => void
  setCurrentFamilyById: (id: string) => void
  toggleEasyRead: () => void
  loginInternalUser: (email: string, password: string) => Promise<Role>
  loginFamilyUser: (code: string, pin: string) => Promise<void>
  logout: () => void
  lookupFamilyStatus: (code: string) => Promise<void>
  clearKioskStatus: () => void
  refreshConnectedData: () => Promise<void>
  createReferral: (payload: Omit<Referral, 'id' | 'status' | 'familyCode' | 'ticketCode' | 'createdAt'>) => Promise<string>
  updateReferralStatus: (id: string, status: Referral['status']) => Promise<void>
  completeCheckIn: (payload: Omit<FamilyProfile, 'id' | 'admissionStatus' | 'isActive'>) => Promise<void>
  createRequest: (payload: {
    site: string
    familyId: string
    title: string
    type: RequestType
    urgency: 'Baja' | 'Media' | 'Alta'
    optionalWindow?: string
    assignedRole: 'staff' | 'volunteer'
    assignedTo: string
  }) => Promise<void>
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<void>
  createTrip: (payload: Omit<Trip, 'id' | 'status' | 'startedAt' | 'endedAt' | 'durationMinutes'>) => Promise<void>
  startTrip: (id: string) => Promise<void>
  finishTrip: (id: string) => Promise<void>
  updateInventory: (payload: { inventoryItemId: number; movementType: 'in' | 'out'; quantity: number; reason: string }) => Promise<void>
  createInventoryNeedReport: (payload: { itemCategory: 'kit' | 'cocina' | 'limpieza' | 'lavanderia' | 'recepcion'; title: string; detail: string }) => Promise<void>
  resolveInventoryNeedReport: (inventoryReportId: number) => Promise<void>
  createCommunityPost: (message: string) => Promise<void>
  createReturnPass: (payload: Omit<ReturnPass, 'id' | 'status'>) => Promise<void>
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<void>
  changeOwnPin: (currentPin: string, newPin: string) => Promise<void>
  createInternalUser: (payload: {
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
      shiftPeriod: 'AM' | 'PM'
      shiftLabel: 'manana' | 'tarde' | 'noche'
      availabilityStatus: 'disponible' | 'cupo_limitado' | 'no_disponible'
      hoursLogged: number
    }
    staffProfile?: {
      workArea: 'recepcion' | 'checkin' | 'habitaciones' | 'inventario' | 'coordinacion' | 'analitica' | 'apoyo_familiar'
      workDays: string[]
      startTime: string
      endTime: string
      shiftLabel: 'manana' | 'tarde' | 'noche'
    }
  }) => Promise<void>
  updateInternalUser: (payload: { userId: number; fullName?: string; role?: 'admin' | 'staff' | 'volunteer'; siteId?: number; isActive?: boolean }) => Promise<void>
  deleteInternalUser: (userId: number) => Promise<void>
  activateReferralFamily: (referralId: number, stayDays?: number) => Promise<ActivationResponse>
  setFamilyAccessState: (familyId: number, action: 'pause' | 'reactivate' | 'reset-pin') => Promise<{ newPin?: string }>
  refreshFamilyStayAutomation: () => Promise<void>
  extendFamilyStay: (familyId: number, extraDays: number) => Promise<void>
  createVolunteerTaskForUser: (payload: { volunteerUserId: number; title: string; taskType: 'cocina' | 'lavanderia' | 'traslados' | 'acompanamiento' | 'recepcion' | 'limpieza' | 'inventario'; shiftPeriod: 'AM' | 'PM'; taskDay: string; notes?: string; relatedRoomId?: number }) => Promise<void>
  updateVolunteerTaskForUser: (payload: {
    volunteerTaskId: number
    volunteerUserId?: number
    title?: string
    taskType?: BackendVolunteerTask['TaskType']
    shiftPeriod?: 'AM' | 'PM'
    status?: BackendVolunteerTask['Status']
    notes?: string | null
    relatedRoomId?: number | null
  }) => Promise<void>
  requestVolunteerChange: (payload: {
    requestedShiftPeriod?: 'AM' | 'PM'
    requestedTaskType?: BackendVolunteerTask['TaskType']
    requestedRoleName?: 'traslados' | 'recepcion' | 'acompanamiento' | 'cocina' | 'lavanderia' | 'limpieza'
    requestedWorkDays?: string[]
    requestedStartTime?: string
    requestedEndTime?: string
    requestedShiftLabel?: 'manana' | 'tarde' | 'noche'
    reason: string
  }) => Promise<void>
  reviewVolunteerChange: (id: number, status: 'aprobada' | 'rechazada') => Promise<void>
  sendVolunteerAlertToPeer: (toVolunteerUserId: number, alertType: 'need_help' | 'running_late' | 'task_completed' | 'cover_me') => Promise<void>
  sendStaffAlertToUser: (toStaffUserId: number, alertType: 'incoming_families' | 'prepare_kits' | 'reception_help' | 'checkin_pending') => Promise<void>
  markNotificationAsRead: (notificationId: number) => Promise<void>
}

const ROLE_STORAGE_KEY = 'ops-role'
const SITE_STORAGE_KEY = 'ops-site'
const FAMILY_STORAGE_KEY = 'ops-family-id'
const TOKEN_STORAGE_KEY = 'ops-token'
const ALL_SITES_LABEL = 'Todas las sedes'

const AppContext = createContext<AppContextValue | undefined>(undefined)

function normalizeSite(site: string | null | undefined) {
  if (!site) return ''
  const map: Record<string, string> = {
    'Casa Ronald CDMX': 'Casa Ronald McDonald Ciudad de Mexico',
    Puebla: 'Casa Ronald McDonald Puebla',
    Tlalnepantla: 'Casa Ronald McDonald Tlalnepantla',
  }
  return map[site] || site
}

function isGlobalRole(role: Role) {
  return role === 'superadmin' || role === 'admin'
}

function mapReferralStatus(status: BackendReferral['Status']): Referral['status'] {
  if (status === 'en_revision') return 'En revision'
  if (status === 'aceptada') return 'Aceptada'
  return 'Enviada'
}

function mapRequestStatus(status: BackendRequest['Status']): SupportRequest['status'] {
  if (status === 'asignada') return 'Asignada'
  if (status === 'en_proceso') return 'En proceso'
  if (status === 'resuelta') return 'Resuelta'
  return 'Nueva'
}

function mapRequestType(type: BackendRequest['RequestType']): SupportRequest['type'] {
  if (type === 'transporte') return 'Transporte'
  if (type === 'kit') return 'Kit'
  if (type === 'alimento') return 'Alimento'
  return 'Recepcion'
}

function mapUrgency(urgency: BackendRequest['Urgency']): SupportRequest['urgency'] {
  if (urgency === 'alta') return 'Alta'
  if (urgency === 'media') return 'Media'
  return 'Baja'
}

function mapTripStatus(status: BackendTrip['Status']): Trip['status'] {
  if (status === 'en_curso') return 'En curso'
  if (status === 'finalizado') return 'Finalizado'
  return 'Pendiente'
}
function mapReferral(item: BackendReferral): Referral {
  return {
    id: String(item.ReferralId),
    hospitalWorker: 'Trabajo Social',
    site: normalizeSite(item.SiteName),
    caregiverName: item.CaregiverName,
    familyLastName: item.FamilyLastName,
    arrivalDate: item.ArrivalDate,
    companions: item.CompanionCount,
    logisticsNote: item.LogisticsNote || '',
    eligible: Boolean(item.EligibilityConfirmed),
    status: mapReferralStatus(item.Status),
    familyCode: item.FamilyCode,
    ticketCode: `TKT-${item.FamilyCode.replace(/^FAM-/, '')}`,
    createdAt: item.CreatedAt,
  }
}

function mapFamily(item: BackendFamily): FamilyProfile {
  const automationMap: Record<string, FamilyProfile['automationStatus']> = {
    pendiente: 'Pendiente',
    sin_cupo: 'Sin cupo',
    preparacion: 'Preparacion',
    reservada: 'Reservada',
    ocupada: 'Ocupada',
    checkout_completado: 'Checkout completado',
  }

  return {
    id: String(item.FamilyId),
    referralId: item.ReferralId ? String(item.ReferralId) : '',
    caregiverName: item.CaregiverName,
    familyLastName: item.FamilyLastName,
    site: normalizeSite(item.SiteName),
    room: item.RoomCode || 'Por asignar',
    plannedRoom: item.RoomCode || 'Por asignar',
    stayDays: item.StayDays || 3,
    plannedCheckoutDate: item.PlannedCheckoutDate || null,
    automationStatus: automationMap[item.AutomationStatus || 'pendiente'] || 'Pendiente',
    idVerified: Boolean(item.IdVerified),
    regulationAccepted: Boolean(item.RegulationAccepted),
    simpleSignature: item.SimpleSignature || '',
    kioskCode: item.TicketCode || '',
    qrCode: item.QrCode || '',
    pin: '',
    admissionStatus: item.AdmissionStatus === 'checkin_completado' ? 'Check-in completado' : 'Pendiente',
    isActive: item.IsActive ?? true,
  }
}

function mapFamilyStayAutomation(item: FamilyStayAutomationRecord): FamilyStayAutomation {
  const automationMap: Record<FamilyStayAutomationRecord['AutomationStatus'], FamilyStayAutomation['automationStatus']> = {
    pendiente: 'Pendiente',
    sin_cupo: 'Sin cupo',
    preparacion: 'Preparacion',
    reservada: 'Reservada',
    ocupada: 'Ocupada',
    checkout_completado: 'Checkout completado',
  }

  return {
    familyId: item.FamilyId,
    caregiverName: item.CaregiverName,
    familyLastName: item.FamilyLastName,
    site: normalizeSite(item.SiteName),
    arrivalDate: item.ArrivalDate,
    stayDays: item.StayDays,
    plannedCheckoutDate: item.PlannedCheckoutDate || null,
    automationStatus: automationMap[item.AutomationStatus],
    plannedRoomCode: item.PlannedRoomCode || null,
    assignedVolunteerName: item.AssignedVolunteerName || null,
    message: item.Message,
  }
}

function mapRequest(item: BackendRequest, familySite = ''): SupportRequest {
  return {
    id: String(item.RequestId),
    site: familySite,
    familyId: String(item.FamilyId),
    title: item.Title,
    type: mapRequestType(item.RequestType),
    urgency: mapUrgency(item.Urgency),
    optionalWindow: item.OptionalWindow || undefined,
    waitingMinutes: 0,
    status: mapRequestStatus(item.Status),
    assignedRole: item.AssignedRole,
    assignedTo: item.AssignedDisplayName || 'Pendiente',
    createdAt: item.CreatedAt,
  }
}

function mapTrip(item: BackendTrip, familySite = ''): Trip {
  return {
    id: String(item.TripId),
    site: familySite,
    familyId: String(item.FamilyId),
    destination: item.Destination,
    assignedTo: item.AssignedDisplayName || 'Pendiente',
    shift: item.Shift,
    status: mapTripStatus(item.Status),
    startedAt: item.StartedAt,
    endedAt: item.EndedAt,
    durationMinutes: item.DurationMinutes,
  }
}

function mapImpactFeed(item: { ImpactEventId: number; SiteName: string; PublicTitle: string; PublicDetail: string; CreatedAt: string }): ImpactFeedItem {
  return {
    id: String(item.ImpactEventId),
    site: normalizeSite(item.SiteName),
    title: item.PublicTitle,
    detail: item.PublicDetail,
    createdAt: item.CreatedAt,
  }
}

function mapFamilyStatusPayload(payload: BackendFamilyStatusResponse | BackendKioskStatusResponse): KioskStatus {
  const family: FamilyProfile = {
    id: String(payload.family.FamilyId),
    referralId: '',
    caregiverName: payload.family.CaregiverName,
    familyLastName: payload.family.FamilyLastName,
    site: normalizeSite(payload.family.SiteName),
    room: payload.family.RoomCode || 'Por asignar',
    idVerified: false,
    regulationAccepted: false,
    simpleSignature: '',
    kioskCode: '',
    qrCode: '',
    pin: '',
    admissionStatus: payload.family.AdmissionStatus === 'checkin_completado' ? 'Check-in completado' : 'Pendiente',
    isActive: true,
  }

  return {
    family,
    requests: payload.requests.map((item) => mapRequest(item, family.site)),
    trips: payload.trips.map((item) => mapTrip(item, family.site)),
  }
}

function mapVolunteerShift(item: Record<string, unknown>): VolunteerShift {
  const rawRole = String(item.RoleName || item.RoleLabel || 'recepcion')
  const roleMap: Record<string, VolunteerShift['role']> = {
    traslados: 'Traslados',
    recepcion: 'Recepcion',
    acompanamiento: 'Acompanamiento',
    cocina: 'Cocina',
    lavanderia: 'Lavanderia',
    limpieza: 'Limpieza',
  }
  const kindMap: Record<string, VolunteerShift['kind']> = {
    individual: 'Individual',
    escolar: 'Escolar',
    empresarial: 'Empresarial',
  }

  return {
    id: String(item.VolunteerShiftId || item.volunteershiftid),
    kind: kindMap[String(item.VolunteerType || 'individual')] || 'Individual',
    role: roleMap[rawRole] || 'Recepcion',
    day: String(item.ShiftDay || ''),
    volunteerName: String(item.VolunteerName || 'Voluntariado'),
    hours: Number(item.HoursLogged || 0),
    workDays: String(item.WorkDays || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    startTime: String(item.StartTime || '08:00'),
    endTime: String(item.EndTime || '14:00'),
    shiftLabel:
      String(item.ShiftLabel || 'manana') === 'tarde'
        ? 'Tarde'
        : String(item.ShiftLabel || 'manana') === 'noche'
          ? 'Noche'
          : 'Manana',
    availability:
      String(item.AvailabilityStatus || 'disponible') === 'cupo_limitado'
        ? 'Cupo limitado'
        : String(item.AvailabilityStatus || 'disponible') === 'no_disponible'
          ? 'No disponible'
          : 'Disponible',
    volunteerUserId: item.UserId ? Number(item.UserId) : undefined,
  }
}

function mapVolunteerRoster(item: BackendVolunteerRosterItem): VolunteerRosterItem {
  const typeMap: Record<string, VolunteerRosterItem['volunteerType']> = {
    individual: 'Individual',
    escolar: 'Escolar',
    empresarial: 'Empresarial',
  }
  const roleMap: Record<string, VolunteerRosterItem['role']> = {
    traslados: 'Traslados',
    recepcion: 'Recepcion',
    acompanamiento: 'Acompanamiento',
    cocina: 'Cocina',
    lavanderia: 'Lavanderia',
    limpieza: 'Limpieza',
  }
  return {
    userId: item.UserId,
    fullName: item.FullName,
    email: item.Email,
    site: normalizeSite(item.SiteName),
    volunteerType: typeMap[item.VolunteerType] || 'Individual',
    role: roleMap[item.RoleName] || 'Recepcion',
    workDays: String(item.WorkDays || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    startTime: item.StartTime,
    endTime: item.EndTime,
    shiftLabel: item.ShiftLabel === 'tarde' ? 'Tarde' : item.ShiftLabel === 'noche' ? 'Noche' : 'Manana',
    availability:
      item.AvailabilityStatus === 'cupo_limitado' ? 'Cupo limitado' : item.AvailabilityStatus === 'no_disponible' ? 'No disponible' : 'Disponible',
    currentTasks: Number(item.CurrentTasks || 0),
  }
}

function mapVolunteerTask(item: BackendVolunteerTask): VolunteerTask {
  const taskMap: Record<BackendVolunteerTask['TaskType'], VolunteerTask['type']> = {
    cocina: 'Cocina',
    lavanderia: 'Lavanderia',
    traslados: 'Traslados',
    acompanamiento: 'Acompanamiento',
    recepcion: 'Recepcion',
    limpieza: 'Limpieza',
    inventario: 'Inventario',
  }
  return {
    id: String(item.VolunteerTaskId),
    volunteerUserId: item.VolunteerUserId,
    volunteerName: item.VolunteerName || 'Voluntariado',
    title: item.Title,
    type: taskMap[item.TaskType],
    shift: item.ShiftPeriod,
    day: item.TaskDay,
    status: item.Status === 'en_proceso' ? 'En proceso' : item.Status === 'completada' ? 'Completada' : 'Pendiente',
    notes: item.Notes || '',
  }
}

function mapVolunteerChange(item: BackendVolunteerChangeRequest): VolunteerChangeRequest {
  const taskMap: Record<string, VolunteerChangeRequest['requestedTask']> = {
    cocina: 'Cocina',
    lavanderia: 'Lavanderia',
    traslados: 'Traslados',
    acompanamiento: 'Acompanamiento',
    recepcion: 'Recepcion',
    limpieza: 'Limpieza',
    inventario: 'Inventario',
  }
  return {
    id: String(item.VolunteerChangeRequestId),
    volunteerUserId: item.VolunteerUserId,
    volunteerName: item.VolunteerName || 'Voluntariado',
    requestedShift: item.RequestedShiftPeriod || '',
    requestedTask: item.RequestedTaskType ? taskMap[item.RequestedTaskType] || '' : '',
    reason: item.Reason,
    status: item.Status === 'aprobada' ? 'Aprobada' : item.Status === 'rechazada' ? 'Rechazada' : 'Pendiente',
  }
}

function mapInternalUser(item: BackendUser): InternalUserRecord {
  const roleLabelMap: Record<string, InternalUserRecord['role']> = {
    admin: 'Admin',
    staff: 'Staff',
    volunteer: 'Voluntario',
    hospital: 'Hospital',
    superadmin: 'Admin',
  }
  return {
    id: String(item.UserId),
    fullName: item.FullName,
    email: item.Email,
    role: roleLabelMap[item.RoleCode] || 'Staff',
    site: item.SiteName ? normalizeSite(item.SiteName) : null,
    siteId: item.SiteId ?? null,
    isActive: Boolean(item.IsActive),
  }
}

function mapStaffRoster(item: BackendStaffRosterItem): StaffRosterItem {
  const areaMap: Record<string, StaffRosterItem['workArea']> = {
    recepcion: 'Recepcion',
    checkin: 'Check-in',
    habitaciones: 'Habitaciones',
    inventario: 'Inventario',
    coordinacion: 'Coordinacion',
    analitica: 'Analitica',
    apoyo_familiar: 'Apoyo familiar',
  }
  return {
    userId: item.UserId,
    fullName: item.FullName,
    email: item.Email,
    siteId: item.SiteId,
    site: normalizeSite(item.SiteName),
    workArea: areaMap[item.WorkArea] || 'Recepcion',
    workDays: String(item.WorkDays || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    startTime: item.StartTime,
    endTime: item.EndTime,
    shiftLabel: item.ShiftLabel === 'tarde' ? 'Tarde' : item.ShiftLabel === 'noche' ? 'Noche' : 'Manana',
    availability:
      item.AvailabilityStatus === 'cupo_limitado' ? 'Cupo limitado' : item.AvailabilityStatus === 'no_disponible' ? 'No disponible' : 'Disponible',
    currentLoad: Number(item.CurrentLoad || 0),
  }
}

function formatInventoryMovement(item: BackendInventoryItem) {
  if (item.LastMovementReason && item.LastMovementAt) {
    const date = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit' }).format(new Date(item.LastMovementAt))
    return `${item.LastMovementReason} · ${date}`
  }
  return item.Stock <= item.MinStock ? 'Stock bajo' : 'Sin movimiento reciente'
}

function mapInventoryItem(item: BackendInventoryItem): InventoryItem {
  const categoryMap: Record<BackendInventoryItem['ItemCategory'], InventoryItem['category']> = {
    kit: 'Kit',
    cocina: 'Cocina',
    limpieza: 'Limpieza',
    otro: 'Otro',
  }
  return {
    id: String(item.InventoryItemId),
    itemCode: item.ItemCode,
    name: item.Name,
    category: categoryMap[item.ItemCategory] || 'Otro',
    unit: item.Unit,
    stock: item.Stock,
    minStock: item.MinStock,
    lowStock: Boolean(item.LowStock),
    expiryDate: item.ExpiryDate,
    expiringSoon: Boolean(item.ExpiringSoon),
    lastMovement: formatInventoryMovement(item),
  }
}

function mapInventoryReport(item: BackendInventoryReport): InventoryReport {
  const categoryMap: Record<BackendInventoryReport['ItemCategory'], InventoryReport['category']> = {
    kit: 'Kit',
    cocina: 'Cocina',
    limpieza: 'Limpieza',
    lavanderia: 'Lavanderia',
    recepcion: 'Recepcion',
  }
  return {
    id: String(item.InventoryReportId),
    volunteerUserId: item.VolunteerUserId,
    volunteerName: item.VolunteerName || 'Voluntariado',
    site: normalizeSite(item.SiteName || ''),
    category: categoryMap[item.ItemCategory] || 'Kit',
    title: item.Title,
    detail: item.Detail,
    status: item.Status === 'atendido' ? 'Atendido' : 'Pendiente',
    createdAt: item.CreatedAt,
  }
}

function mapVolunteerNotification(item: BackendVolunteerNotification): VolunteerNotification {
  return {
    id: String(item.NotificationId),
    volunteerTaskId: Number(item.VolunteerTaskId || 0),
    title: item.Title,
    message: item.Message,
    day: item.TaskDay,
    shift: item.ShiftPeriod,
    isRead: Boolean(item.IsRead),
    createdAt: item.CreatedAt,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem(ROLE_STORAGE_KEY) as Role) || null)
  const [site, setSiteState] = useState<string>(() => localStorage.getItem(SITE_STORAGE_KEY) || sites[0])
  const [easyRead, setEasyRead] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [isSyncing, setIsSyncing] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [currentFamily, setCurrentFamilyState] = useState<FamilyProfile | null>(null)
  const [kioskStatus, setKioskStatus] = useState<KioskStatus | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [pendingReferrals, setPendingReferrals] = useState<Referral[]>([])
  const [families, setFamilies] = useState<FamilyProfile[]>([])
  const [familyStayAutomation, setFamilyStayAutomation] = useState<FamilyStayAutomation[]>([])
  const [rooms] = useState<Room[]>(initialRooms)
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [volunteerShifts, setVolunteerShifts] = useState<VolunteerShift[]>([])
  const [volunteerRoster, setVolunteerRoster] = useState<VolunteerRosterItem[]>([])
  const [staffRoster, setStaffRoster] = useState<StaffRosterItem[]>([])
  const [volunteerTasks, setVolunteerTasks] = useState<VolunteerTask[]>([])
  const [volunteerChangeRequests, setVolunteerChangeRequests] = useState<VolunteerChangeRequest[]>([])
  const [internalUsers, setInternalUsers] = useState<InternalUserRecord[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [inventoryReports, setInventoryReports] = useState<InventoryReport[]>([])
  const [impactFeed, setImpactFeed] = useState<ImpactFeedItem[]>(initialImpactFeed)
  const [donorImpactBySite, setDonorImpactBySite] = useState<DonorImpactSiteMetric[]>([])
  const [staffDashboard, setStaffDashboard] = useState<StaffDashboardSummary>(emptyStaffDashboard)
  const [notifications, setNotifications] = useState<VolunteerNotification[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(initialCommunityPosts)
  const [returnPasses, setReturnPasses] = useState<ReturnPass[]>(initialReturnPasses)

  const availableSites = useMemo(() => (isGlobalRole(role) ? [ALL_SITES_LABEL, ...sites] : sites), [role])
  useEffect(() => {
    if (role) localStorage.setItem(ROLE_STORAGE_KEY, role)
    else localStorage.removeItem(ROLE_STORAGE_KEY)
  }, [role])

  useEffect(() => {
    localStorage.setItem(SITE_STORAGE_KEY, site)
  }, [site])

  useEffect(() => {
    if (currentFamily) localStorage.setItem(FAMILY_STORAGE_KEY, currentFamily.id)
    else localStorage.removeItem(FAMILY_STORAGE_KEY)
  }, [currentFamily])

  useEffect(() => {
    if (authToken) localStorage.setItem(TOKEN_STORAGE_KEY, authToken)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  }, [authToken])

  useEffect(() => {
    void loadDonorImpact(site)
  }, [site])

  useEffect(() => {
    if (authToken && role) void refreshConnectedData()
  }, [authToken, role, site])

  useEffect(() => {
    if (!authToken || !role || role === 'family') {
      setNotifications([])
      setUnreadNotifications(0)
      return
    }

    let cancelled = false
    const loadNotifications = async () => {
      try {
        const payload = await getNotifications(authToken)
        if (!cancelled) {
          setNotifications(payload.notifications.map(mapVolunteerNotification))
          setUnreadNotifications(payload.unreadCount)
        }
      } catch {
        if (!cancelled) {
          setNotifications([])
          setUnreadNotifications(0)
        }
      }
    }

    void loadNotifications()
    const intervalId = window.setInterval(() => {
      void loadNotifications()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [authToken, role])

  async function loadDonorImpact(selectedSite: string) {
    try {
      const payload = await getDonorImpact(selectedSite === ALL_SITES_LABEL ? undefined : selectedSite)
      setDonorImpactBySite(payload.bySite.map((item) => ({
        name: normalizeSite(item.Name),
        impactEvents: item.impactEvents,
        familiesSupported: item.familiesSupported,
        totalTrips: item.totalTrips,
        totalRequests: item.totalRequests,
      })))
      setImpactFeed(payload.feed.map(mapImpactFeed))
    } catch {
      setDonorImpactBySite([])
    }
  }

  const setRole = (nextRole: Role) => {
    if (nextRole === null) {
      setRoleState(null)
      setCurrentUser(null)
      setCurrentFamilyState(null)
      setAuthToken(null)
      setAuthError(null)
      return
    }
    setRoleState(nextRole)
  }

  const setSite = (nextSite: string) => {
    if (role && !isGlobalRole(role) && currentUser?.siteName) {
      setSiteState(normalizeSite(currentUser.siteName))
      return
    }
    setSiteState(nextSite)
  }

  const toggleEasyRead = () => setEasyRead((value) => !value)
  const setCurrentFamily = (family: FamilyProfile | null) => setCurrentFamilyState(family)
  const setCurrentFamilyById = (id: string) => setCurrentFamilyState(families.find((item) => item.id === id) || null)

  async function refreshConnectedData() {
    if (!authToken || !role) return
    setIsSyncing(true)
    setAuthError(null)

    try {
      if (role === 'family') {
        const payload = await getFamilyStatus(authToken)
        const mapped = mapFamilyStatusPayload(payload)
        setCurrentFamilyState(mapped.family)
        setRequests(mapped.requests)
        setTrips(mapped.trips)
        setReturnPasses(payload.returnPasses.map((item) => ({
          id: String(item.ReturnPassId),
          familyId: mapped.family.id,
          site: mapped.family.site,
          date: item.RequestedDate,
          companions: item.CompanionCount,
          note: item.LogisticsNote || '',
          status: item.Status === 'enviado' ? 'Enviado' : 'Borrador',
        })))
        setCurrentUser({
          userId: Number(mapped.family.id),
          fullName: `${mapped.family.caregiverName} ${mapped.family.familyLastName}`,
          email: '',
          role: 'family',
          siteId: null,
          siteName: mapped.family.site,
        })
        return
      }

      const me = await getMe(authToken)
      const profile = me.profile
      const resolvedUser: CurrentUser = {
        userId: Number(profile.UserId || 0),
        fullName: String(profile.FullName || ''),
        email: String(profile.Email || ''),
        role: me.role as CurrentUser['role'],
        siteId: profile.SiteId ? Number(profile.SiteId) : null,
        siteName: profile.SiteName ? normalizeSite(String(profile.SiteName)) : null,
      }
      setCurrentUser(resolvedUser)

      if (!isGlobalRole(role) && resolvedUser.siteName) {
        setSiteState(resolvedUser.siteName)
      }

      const selectedSiteId =
        isGlobalRole(role)
          ? site === ALL_SITES_LABEL
            ? null
            : sites.findIndex((item) => item === site) + 1
          : resolvedUser.siteId

      const [backendReferrals, backendFamilies, backendRequests, backendTrips, backendShifts, backendRoster, backendStaffRoster, backendTasks, backendChangeRequests, backendInventory, backendInventoryReports, backendPosts] = await Promise.all([
        role === 'hospital' || role === 'staff' || role === 'admin' || role === 'superadmin' ? getReferrals(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' ? getFamilies(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getRequests(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getTrips(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getVolunteerShifts(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getVolunteerRoster(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' ? getStaffRoster(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getVolunteerTasks(authToken, { siteId: selectedSiteId ?? undefined, volunteerUserId: role === 'volunteer' ? resolvedUser.userId : undefined }) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getVolunteerChangeRequests(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' ? getInventoryStock(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getInventoryReports(authToken, selectedSiteId) : Promise.resolve([]),
        role ? getCommunityPosts(authToken).catch(() => []) : Promise.resolve([]),
      ])

      const mappedFamilies = (backendFamilies as BackendFamily[]).map(mapFamily)
      const familySiteById = new Map(mappedFamilies.map((family) => [family.id, family.site]))

      setReferrals((backendReferrals as BackendReferral[]).map(mapReferral))
      setFamilies(mappedFamilies)
      setRequests((backendRequests as BackendRequest[]).map((item) => mapRequest(item, familySiteById.get(String(item.FamilyId)) || resolvedUser.siteName || '')))
      setTrips((backendTrips as BackendTrip[]).map((item) => mapTrip(item, familySiteById.get(String(item.FamilyId)) || resolvedUser.siteName || '')))
      setVolunteerShifts((backendShifts as Array<Record<string, unknown>>).map(mapVolunteerShift))
      setVolunteerRoster((backendRoster as BackendVolunteerRosterItem[]).map(mapVolunteerRoster))
      setStaffRoster((backendStaffRoster as BackendStaffRosterItem[]).map(mapStaffRoster))
      setVolunteerTasks((backendTasks as BackendVolunteerTask[]).map(mapVolunteerTask))
      setVolunteerChangeRequests((backendChangeRequests as BackendVolunteerChangeRequest[]).map(mapVolunteerChange))
      setInventory((backendInventory as BackendInventoryItem[]).map(mapInventoryItem))
      setInventoryReports((backendInventoryReports as BackendInventoryReport[]).map(mapInventoryReport))
      setCommunityPosts((backendPosts as Array<{ CommunityPostId: number; AuthorAlias: string; Message: string; CreatedAt: string }>).map((item) => ({
        id: String(item.CommunityPostId),
        authorAlias: item.AuthorAlias,
        message: item.Message,
        createdAt: item.CreatedAt,
      })))

        if (role === 'admin' || role === 'superadmin') {
          const [users, pending, stays] = await Promise.all([
            getAdminUsers(authToken, selectedSiteId),
            getPendingReferrals(authToken, selectedSiteId),
            getFamilyStayAutomation(authToken, selectedSiteId),
          ])
          setInternalUsers(users.map(mapInternalUser))
          setPendingReferrals((pending as PendingReferral[]).map(mapReferral))
          setFamilyStayAutomation((stays as FamilyStayAutomationRecord[]).map(mapFamilyStayAutomation))
        } else if (role === 'staff') {
          const users = await getAdminUsers(authToken, selectedSiteId)
          setInternalUsers(users.map(mapInternalUser))
          setPendingReferrals([])
          const stays = await getFamilyStayAutomation(authToken, selectedSiteId)
          setFamilyStayAutomation((stays as FamilyStayAutomationRecord[]).map(mapFamilyStayAutomation))
        } else {
          setInternalUsers([])
          setPendingReferrals([])
          setFamilyStayAutomation([])
        }

      if (role === 'staff' || role === 'admin' || role === 'superadmin') {
        const dashboard = await getStaffDashboard(authToken, selectedSiteId)
        setStaffDashboard(dashboard as StaffDashboardResponse)
      } else {
        setStaffDashboard(emptyStaffDashboard)
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo sincronizar la informacion')
    } finally {
      setIsSyncing(false)
    }
  }

  const logout = () => {
    setRoleState(null)
    setCurrentUser(null)
    setCurrentFamilyState(null)
    setAuthToken(null)
    setKioskStatus(null)
    setAuthError(null)
    setNotifications([])
    setUnreadNotifications(0)
    setStaffDashboard(emptyStaffDashboard)
    setStaffRoster([])
    setInventoryReports([])
  }

  const loginInternalUser = async (email: string, password: string) => {
    setIsSyncing(true)
    setAuthError(null)
    try {
      const payload = await loginInternal(email, password)
      const nextRole = payload.user.role as Role
      setAuthToken(payload.token)
      setRoleState(nextRole)
      setCurrentUser({
        userId: payload.user.userId,
        fullName: payload.user.fullName,
        email: payload.user.email,
        role: payload.user.role,
        siteId: payload.user.siteId,
        siteName: payload.user.siteName ? normalizeSite(payload.user.siteName) : null,
      })
      if (payload.user.siteName) setSiteState(normalizeSite(payload.user.siteName))
      else if (nextRole === 'admin' || nextRole === 'superadmin') setSiteState(ALL_SITES_LABEL)
      return nextRole
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion'
      setAuthError(message)
      throw error
    } finally {
      setIsSyncing(false)
    }
  }

  const loginFamilyUser = async (code: string, pin: string) => {
    setIsSyncing(true)
    setAuthError(null)
    try {
      const payload = await loginFamily(code, pin)
      setAuthToken(payload.token)
      setRoleState('family')
      if (payload.family.siteId) setSiteState(sites[Math.max(0, payload.family.siteId - 1)] || sites[0])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion'
      setAuthError(message)
      throw error
    } finally {
      setIsSyncing(false)
    }
  }
  const lookupFamilyStatus = async (code: string) => {
    setIsSyncing(true)
    setAuthError(null)
    try {
      const payload = await getFamilyStatusByCode(authToken || '', code)
      setKioskStatus(mapFamilyStatusPayload(payload))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se encontro el codigo'
      setAuthError(message)
      setKioskStatus(null)
      throw error
    } finally {
      setIsSyncing(false)
    }
  }

  const clearKioskStatus = () => {
    setKioskStatus(null)
    setAuthError(null)
  }

  const createReferral: AppContextValue['createReferral'] = async (payload) => {
    if (!authToken) throw new Error('Se requiere sesion')
    const siteId = sites.findIndex((item) => item === payload.site) + 1
    const referral = await createReferralApi(authToken, {
      siteId,
      caregiverName: payload.caregiverName,
      familyLastName: payload.familyLastName,
      arrivalDate: payload.arrivalDate,
      companionCount: payload.companions,
      logisticsNote: payload.logisticsNote,
      eligibilityConfirmed: payload.eligible,
    })
    await refreshConnectedData()
    return String(referral.ReferralId)
  }

  const updateReferralStatus: AppContextValue['updateReferralStatus'] = async (id, status) => {
    if (!authToken) return
    const statusMap = { Enviada: 'enviada', 'En revision': 'en_revision', Aceptada: 'aceptada' } as const
    await updateReferralStatusApi(authToken, Number(id), statusMap[status])
    await refreshConnectedData()
  }

  const completeCheckIn: AppContextValue['completeCheckIn'] = async (payload) => {
    if (!authToken) return
    const roomRecord = rooms.find((room) => room.label === payload.room)
    await checkInFamily(authToken, {
      familyId: Number(payload.referralId || 0),
      roomId: roomRecord ? Number(roomRecord.id.replace(/\D/g, '')) : null,
      idVerified: payload.idVerified,
      regulationAccepted: payload.regulationAccepted,
      simpleSignature: payload.simpleSignature,
    })
    await refreshConnectedData()
  }

  const createRequest: AppContextValue['createRequest'] = async (payload) => {
    if (!authToken) throw new Error('Se requiere sesion')
    await createRequestApi(authToken, {
      familyId: Number(payload.familyId),
      title: payload.title,
      requestType: payload.type === 'Transporte' ? 'transporte' : payload.type === 'Kit' ? 'kit' : payload.type === 'Alimento' ? 'alimento' : 'recepcion',
      urgency: payload.urgency === 'Alta' ? 'alta' : payload.urgency === 'Media' ? 'media' : 'baja',
      optionalWindow: payload.optionalWindow,
    })
    await refreshConnectedData()
  }

  const updateRequestStatus: AppContextValue['updateRequestStatus'] = async (id, status) => {
    if (!authToken) return
    const request = requests.find((item) => item.id === id)
    if (!request) return
    if (status === 'Asignada') {
      await assignRequest(authToken, { requestId: Number(id), assignedRole: request.assignedRole, assignedDisplayName: request.assignedTo })
    } else if (status === 'En proceso') {
      await updateRequestWorkflowStatus(authToken, Number(id), 'en_proceso')
    } else if (status === 'Resuelta') {
      await resolveRequest(authToken, Number(id))
    }
    await refreshConnectedData()
  }

  const createTrip: AppContextValue['createTrip'] = async (payload) => {
    if (!authToken) return
    await createTripApi(authToken, { familyId: Number(payload.familyId), destination: payload.destination, shift: payload.shift, assignedDisplayName: payload.assignedTo })
    await refreshConnectedData()
  }

  const startTrip: AppContextValue['startTrip'] = async (id) => {
    if (!authToken) return
    await startTripApi(authToken, Number(id))
    await refreshConnectedData()
  }

  const finishTrip: AppContextValue['finishTrip'] = async (id) => {
    if (!authToken) return
    await finishTripApi(authToken, Number(id))
    await refreshConnectedData()
  }

  const updateInventory = async (payload: { inventoryItemId: number; movementType: 'in' | 'out'; quantity: number; reason: string }) => {
    if (!authToken) return
    await createInventoryMovement(authToken, payload)
    await refreshConnectedData()
  }

  const createInventoryNeedReport = async (payload: { itemCategory: 'kit' | 'cocina' | 'limpieza' | 'lavanderia' | 'recepcion'; title: string; detail: string }) => {
    if (!authToken) return
    await createInventoryReport(authToken, payload)
    await refreshConnectedData()
  }

  const resolveInventoryNeedReport = async (inventoryReportId: number) => {
    if (!authToken) return
    await updateInventoryReportStatus(authToken, { inventoryReportId, status: 'atendido' })
    await refreshConnectedData()
  }

  const createCommunityPost = async (message: string) => {
    if (!authToken) return
    const authorAlias = currentFamily ? `Familia ${currentFamily.familyLastName}` : currentUser?.fullName
    await createCommunityPostApi(authToken, message, authorAlias)
    const posts = await getCommunityPosts(authToken)
    setCommunityPosts(posts.map((item) => ({ id: String(item.CommunityPostId), authorAlias: item.AuthorAlias, message: item.Message, createdAt: item.CreatedAt })))
  }

  const createReturnPass: AppContextValue['createReturnPass'] = async (payload) => {
    if (!authToken) return
    await createReturnPassApi(authToken, {
      familyId: Number(payload.familyId),
      requestedDate: payload.date,
      companionCount: payload.companions,
      logisticsNote: payload.note,
    })
    const backendReturnPasses = await getReturnPasses(authToken, Number(payload.familyId))
    setReturnPasses(backendReturnPasses.map((item) => ({
      id: String(item.ReturnPassId),
      familyId: String(item.FamilyId),
      site: payload.site,
      date: item.RequestedDate,
      companions: item.CompanionCount,
      note: item.LogisticsNote || '',
      status: item.Status === 'enviado' ? 'Enviado' : 'Borrador',
    })))
  }

  const changeOwnPassword = async (currentPassword: string, newPassword: string) => {
    if (!authToken) throw new Error('Se requiere sesion')
    await changePassword(authToken, currentPassword, newPassword)
  }

  const changeOwnPin = async (currentPin: string, newPin: string) => {
    if (!authToken) throw new Error('Se requiere sesion')
    await changePin(authToken, currentPin, newPin)
  }

  const createInternalUserHandler: AppContextValue['createInternalUser'] = async (payload) => {
    if (!authToken) return
    await createAdminUser(authToken, {
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role,
      siteId: payload.siteId,
      password: payload.password,
      volunteerShift: payload.volunteerShift
        ? {
            volunteerType: payload.volunteerShift.volunteerType,
            roleName: payload.volunteerShift.roleName,
            shiftDay: payload.volunteerShift.shiftDay,
            workDays: payload.volunteerShift.workDays,
            startTime: payload.volunteerShift.startTime,
            endTime: payload.volunteerShift.endTime,
            shiftLabel: payload.volunteerShift.shiftLabel,
          }
        : undefined,
      staffProfile: payload.staffProfile,
    })

    await refreshConnectedData()
  }

  const updateInternalUserHandler: AppContextValue['updateInternalUser'] = async (payload) => {
    if (!authToken) return
    await updateAdminUser(authToken, payload)
    await refreshConnectedData()
  }

  const deleteInternalUserHandler = async (userId: number) => {
    if (!authToken) return
    await deleteAdminUser(authToken, userId)
    await refreshConnectedData()
  }

  const activateReferralFamily = async (referralId: number, stayDays?: number) => {
    if (!authToken) throw new Error('Se requiere sesion')
    const response = await activateFamily(authToken, referralId, stayDays)
    await refreshConnectedData()
    return response
  }

  const setFamilyAccessState = async (familyId: number, action: 'pause' | 'reactivate' | 'reset-pin') => {
    if (!authToken) throw new Error('Se requiere sesion')
    const response = await updateFamilyAccess(authToken, familyId, action)
    await refreshConnectedData()
    return { newPin: response.newPin }
  }

  const refreshFamilyStayAutomation = async () => {
    if (!authToken || !role || !['admin', 'superadmin', 'staff'].includes(role)) return
    const selectedSiteId =
      role === 'admin' || role === 'superadmin'
        ? site === ALL_SITES_LABEL
          ? null
          : sites.findIndex((item) => item === site) + 1
        : currentUser?.siteId || null
    const stays = await getFamilyStayAutomation(authToken, selectedSiteId)
    setFamilyStayAutomation((stays as FamilyStayAutomationRecord[]).map(mapFamilyStayAutomation))
  }

  const extendFamilyStay = async (familyId: number, extraDays: number) => {
    if (!authToken) throw new Error('Se requiere sesion')
    const stays = await extendFamilyStayApi(authToken, { familyId, extraDays })
    setFamilyStayAutomation((stays as FamilyStayAutomationRecord[]).map(mapFamilyStayAutomation))
    await refreshConnectedData()
  }

  const createVolunteerTaskForUser = async (payload: Parameters<AppContextValue['createVolunteerTaskForUser']>[0]) => {
    if (!authToken) return
    await createVolunteerTask(authToken, payload)
    await refreshConnectedData()
  }

  const updateVolunteerTaskForUser = async (payload: {
    volunteerTaskId: number
    volunteerUserId?: number
    title?: string
    taskType?: BackendVolunteerTask['TaskType']
    shiftPeriod?: 'AM' | 'PM'
    status?: BackendVolunteerTask['Status']
    notes?: string | null
    relatedRoomId?: number | null
  }) => {
    if (!authToken) return
    await updateVolunteerTask(authToken, payload)
    await refreshConnectedData()
  }

  const requestVolunteerChange = async (payload: {
    requestedShiftPeriod?: 'AM' | 'PM'
    requestedTaskType?: BackendVolunteerTask['TaskType']
    requestedRoleName?: 'traslados' | 'recepcion' | 'acompanamiento' | 'cocina' | 'lavanderia' | 'limpieza'
    requestedWorkDays?: string[]
    requestedStartTime?: string
    requestedEndTime?: string
    requestedShiftLabel?: 'manana' | 'tarde' | 'noche'
    reason: string
  }) => {
    if (!authToken) return
    await createDetailedVolunteerChangeRequest(authToken, payload)
    await refreshConnectedData()
  }

  const reviewVolunteerChange = async (id: number, status: 'aprobada' | 'rechazada') => {
    if (!authToken) return
    await reviewVolunteerChangeRequest(authToken, id, status)
    await refreshConnectedData()
  }

  const sendVolunteerAlertToPeer = async (toVolunteerUserId: number, alertType: 'need_help' | 'running_late' | 'task_completed' | 'cover_me') => {
    if (!authToken || role !== 'volunteer') return
    await sendVolunteerAlertApi(authToken, { toVolunteerUserId, alertType })
    const payload = await getNotifications(authToken)
    setNotifications(payload.notifications.map(mapVolunteerNotification))
    setUnreadNotifications(payload.unreadCount)
  }

  const markNotificationAsRead = async (notificationId: number) => {
    if (!authToken || !role || role === 'family') return
    await markNotificationRead(authToken, notificationId)
    const payload = await getNotifications(authToken)
    setNotifications(payload.notifications.map(mapVolunteerNotification))
    setUnreadNotifications(payload.unreadCount)
  }

  const sendStaffAlertToUser = async (
    toStaffUserId: number,
    alertType: 'incoming_families' | 'prepare_kits' | 'reception_help' | 'checkin_pending',
  ) => {
    if (!authToken || !role || !['staff', 'admin', 'superadmin'].includes(role)) return
    await sendStaffAlert(authToken, { toStaffUserId, alertType })
  }
  return (
    <AppContext.Provider
      value={{
        role,
        site,
        easyRead,
        authToken,
        isSyncing,
        authError,
        currentUser,
        currentFamily,
        kioskStatus,
        referrals,
        pendingReferrals,
        families,
        familyStayAutomation,
        rooms,
        requests,
        trips,
        volunteerShifts,
        volunteerRoster,
        staffRoster,
        volunteerTasks,
        volunteerChangeRequests,
        internalUsers,
        inventory,
        inventoryReports,
        guideSteps,
        supportMessages,
        communityPosts,
        returnPasses,
        donorStories: initialStories,
        impactFeed,
        donorImpactBySite,
        staffDashboard,
        notifications,
        unreadNotifications,
        availableSites,
        setRole,
        setSite,
        setCurrentFamily,
        setCurrentFamilyById,
        toggleEasyRead,
        loginInternalUser,
        loginFamilyUser,
        logout,
        lookupFamilyStatus,
        clearKioskStatus,
        refreshConnectedData,
        createReferral,
        updateReferralStatus,
        completeCheckIn,
        createRequest,
        updateRequestStatus,
        createTrip,
        startTrip,
        finishTrip,
        updateInventory,
        createInventoryNeedReport,
        resolveInventoryNeedReport,
        createCommunityPost,
        createReturnPass,
        changeOwnPassword,
        changeOwnPin,
        createInternalUser: createInternalUserHandler,
        updateInternalUser: updateInternalUserHandler,
        deleteInternalUser: deleteInternalUserHandler,
        activateReferralFamily,
        setFamilyAccessState,
        refreshFamilyStayAutomation,
        extendFamilyStay,
        createVolunteerTaskForUser,
        updateVolunteerTaskForUser,
        requestVolunteerChange,
        reviewVolunteerChange,
        sendVolunteerAlertToPeer,
        sendStaffAlertToUser,
        markNotificationAsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppState must be used within AppProvider')
  return context
}

