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
  createReferral as createReferralApi,
  createRequest as createRequestApi,
  createReturnPassApi,
  createTrip as createTripApi,
  createVolunteerChangeRequest,
  createVolunteerTask,
  deleteAdminUser,
  finishTrip as finishTripApi,
  getAdminUsers,
  getCommunityPosts,
  getDonorImpact,
  getFamilies,
  getFamilyStatus,
  getFamilyStatusByCode,
  getInventoryStock,
  getMe,
  getPendingReferrals,
  getReferrals,
  getRequests,
  getReturnPasses,
  getTrips,
  getVolunteerChangeRequests,
  getVolunteerShifts,
  getVolunteerTasks,
  loginFamily,
  loginInternal,
  resolveRequest,
  reviewVolunteerChangeRequest,
  startTrip as startTripApi,
  updateAdminUser,
  updateFamilyAccess,
  updateReferralStatus as updateReferralStatusApi,
  updateRequestWorkflowStatus,
  updateVolunteerTask,
  type ActivationResponse,
  type BackendFamily,
  type BackendFamilyStatusResponse,
  type BackendKioskStatusResponse,
  type BackendReferral,
  type BackendRequest,
  type BackendTrip,
  type BackendUser,
  type PendingReferral,
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
  initialVolunteerShifts,
  sites,
  supportMessages,
} from '../data/mockData'
import type {
  CommunityPost,
  CurrentUser,
  FamilyProfile,
  GuideStep,
  ImpactFeedItem,
  InternalUserRecord,
  InventoryItem,
  Referral,
  RequestStatus,
  RequestType,
  ReturnPass,
  Role,
  Room,
  SupportMessage,
  SupportRequest,
  Trip,
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
  rooms: Room[]
  requests: SupportRequest[]
  trips: Trip[]
  volunteerShifts: VolunteerShift[]
  volunteerTasks: VolunteerTask[]
  volunteerChangeRequests: VolunteerChangeRequest[]
  internalUsers: InternalUserRecord[]
  inventory: InventoryItem[]
  guideSteps: GuideStep[]
  supportMessages: SupportMessage[]
  communityPosts: CommunityPost[]
  returnPasses: ReturnPass[]
  donorStories: typeof initialStories
  impactFeed: ImpactFeedItem[]
  donorImpactBySite: DonorImpactSiteMetric[]
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
  updateInventory: (id: string, delta: number, label: string) => void
  createCommunityPost: (message: string) => Promise<void>
  createReturnPass: (payload: Omit<ReturnPass, 'id' | 'status'>) => Promise<void>
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<void>
  changeOwnPin: (currentPin: string, newPin: string) => Promise<void>
  createInternalUser: (payload: { fullName: string; email: string; role: 'admin' | 'staff' | 'volunteer'; siteId: number; password: string }) => Promise<void>
  updateInternalUser: (payload: { userId: number; fullName?: string; role?: 'admin' | 'staff' | 'volunteer'; siteId?: number; isActive?: boolean }) => Promise<void>
  deleteInternalUser: (userId: number) => Promise<void>
  activateReferralFamily: (referralId: number) => Promise<ActivationResponse>
  setFamilyAccessState: (familyId: number, action: 'pause' | 'reactivate' | 'reset-pin') => Promise<{ newPin?: string }>
  createVolunteerTaskForUser: (payload: { volunteerUserId: number; title: string; taskType: 'cocina' | 'lavanderia' | 'traslados' | 'acompanamiento' | 'recepcion' | 'limpieza' | 'inventario'; shiftPeriod: 'AM' | 'PM'; taskDay: string; notes?: string }) => Promise<void>
  updateVolunteerTaskForUser: (payload: Partial<BackendVolunteerTask> & { volunteerTaskId: number }) => Promise<void>
  requestVolunteerChange: (payload: { requestedShiftPeriod?: 'AM' | 'PM'; requestedTaskType?: BackendVolunteerTask['TaskType']; reason: string }) => Promise<void>
  reviewVolunteerChange: (id: number, status: 'aprobada' | 'rechazada') => Promise<void>
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
  return {
    id: String(item.FamilyId),
    referralId: item.ReferralId ? String(item.ReferralId) : '',
    caregiverName: item.CaregiverName,
    familyLastName: item.FamilyLastName,
    site: normalizeSite(item.SiteName),
    room: item.RoomCode || 'Por asignar',
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
    availability:
      String(item.AvailabilityStatus || 'disponible') === 'cupo_limitado'
        ? 'Cupo limitado'
        : String(item.AvailabilityStatus || 'disponible') === 'no_disponible'
          ? 'No disponible'
          : 'Disponible',
    volunteerUserId: item.UserId ? Number(item.UserId) : undefined,
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
    isActive: Boolean(item.IsActive),
  }
}

function mapInventoryItem(item: { InventoryItemId: number; Name: string; Stock: number; MinStock: number }): InventoryItem {
  return {
    id: String(item.InventoryItemId),
    name: item.Name,
    stock: item.Stock,
    minStock: item.MinStock,
    lastMovement: item.Stock <= item.MinStock ? 'Stock bajo' : 'Sin movimiento reciente',
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
  const [rooms] = useState<Room[]>(initialRooms)
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [volunteerShifts, setVolunteerShifts] = useState<VolunteerShift[]>(initialVolunteerShifts)
  const [volunteerTasks, setVolunteerTasks] = useState<VolunteerTask[]>([])
  const [volunteerChangeRequests, setVolunteerChangeRequests] = useState<VolunteerChangeRequest[]>([])
  const [internalUsers, setInternalUsers] = useState<InternalUserRecord[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [impactFeed, setImpactFeed] = useState<ImpactFeedItem[]>(initialImpactFeed)
  const [donorImpactBySite, setDonorImpactBySite] = useState<DonorImpactSiteMetric[]>([])
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

      const [backendReferrals, backendFamilies, backendRequests, backendTrips, backendShifts, backendTasks, backendChangeRequests, backendInventory, backendPosts] = await Promise.all([
        role === 'hospital' || role === 'staff' || role === 'admin' || role === 'superadmin' ? getReferrals(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' ? getFamilies(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getRequests(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getTrips(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getVolunteerShifts(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getVolunteerTasks(authToken, { siteId: selectedSiteId ?? undefined, volunteerUserId: role === 'volunteer' ? resolvedUser.userId : undefined }) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'volunteer' ? getVolunteerChangeRequests(authToken, selectedSiteId) : Promise.resolve([]),
        role === 'staff' || role === 'admin' || role === 'superadmin' ? getInventoryStock(authToken, selectedSiteId) : Promise.resolve([]),
        role ? getCommunityPosts(authToken) : Promise.resolve([]),
      ])

      const mappedFamilies = (backendFamilies as BackendFamily[]).map(mapFamily)
      const familySiteById = new Map(mappedFamilies.map((family) => [family.id, family.site]))

      setReferrals((backendReferrals as BackendReferral[]).map(mapReferral))
      setFamilies(mappedFamilies)
      setRequests((backendRequests as BackendRequest[]).map((item) => mapRequest(item, familySiteById.get(String(item.FamilyId)) || resolvedUser.siteName || '')))
      setTrips((backendTrips as BackendTrip[]).map((item) => mapTrip(item, familySiteById.get(String(item.FamilyId)) || resolvedUser.siteName || '')))
      setVolunteerShifts((backendShifts as Array<Record<string, unknown>>).map(mapVolunteerShift))
      setVolunteerTasks((backendTasks as BackendVolunteerTask[]).map(mapVolunteerTask))
      setVolunteerChangeRequests((backendChangeRequests as BackendVolunteerChangeRequest[]).map(mapVolunteerChange))
      setInventory((backendInventory as Array<{ InventoryItemId: number; Name: string; Stock: number; MinStock: number }>).map(mapInventoryItem))
      setCommunityPosts((backendPosts as Array<{ CommunityPostId: number; AuthorAlias: string; Message: string; CreatedAt: string }>).map((item) => ({
        id: String(item.CommunityPostId),
        authorAlias: item.AuthorAlias,
        message: item.Message,
        createdAt: item.CreatedAt,
      })))

      if (role === 'admin' || role === 'superadmin') {
        const [users, pending] = await Promise.all([getAdminUsers(authToken, selectedSiteId), getPendingReferrals(authToken, selectedSiteId)])
        setInternalUsers(users.map(mapInternalUser))
        setPendingReferrals((pending as PendingReferral[]).map(mapReferral))
      } else {
        setInternalUsers([])
        setPendingReferrals([])
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

  const updateInventory = (id: string, delta: number, label: string) => {
    setInventory((current) => current.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + delta), lastMovement: label } : item)))
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
    await createAdminUser(authToken, payload)
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

  const activateReferralFamily = async (referralId: number) => {
    if (!authToken) throw new Error('Se requiere sesion')
    const response = await activateFamily(authToken, referralId)
    await refreshConnectedData()
    return response
  }

  const setFamilyAccessState = async (familyId: number, action: 'pause' | 'reactivate' | 'reset-pin') => {
    if (!authToken) throw new Error('Se requiere sesion')
    const response = await updateFamilyAccess(authToken, familyId, action)
    await refreshConnectedData()
    return { newPin: response.newPin }
  }

  const createVolunteerTaskForUser = async (payload: Parameters<AppContextValue['createVolunteerTaskForUser']>[0]) => {
    if (!authToken) return
    await createVolunteerTask(authToken, payload)
    await refreshConnectedData()
  }

  const updateVolunteerTaskForUser = async (payload: Partial<BackendVolunteerTask> & { volunteerTaskId: number }) => {
    if (!authToken) return
    await updateVolunteerTask(authToken, payload)
    await refreshConnectedData()
  }

  const requestVolunteerChange = async (payload: { requestedShiftPeriod?: 'AM' | 'PM'; requestedTaskType?: BackendVolunteerTask['TaskType']; reason: string }) => {
    if (!authToken) return
    await createVolunteerChangeRequest(authToken, payload)
    await refreshConnectedData()
  }

  const reviewVolunteerChange = async (id: number, status: 'aprobada' | 'rechazada') => {
    if (!authToken) return
    await reviewVolunteerChangeRequest(authToken, id, status)
    await refreshConnectedData()
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
        rooms,
        requests,
        trips,
        volunteerShifts,
        volunteerTasks,
        volunteerChangeRequests,
        internalUsers,
        inventory,
        guideSteps,
        supportMessages,
        communityPosts,
        returnPasses,
        donorStories: initialStories,
        impactFeed,
        donorImpactBySite,
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
        createCommunityPost,
        createReturnPass,
        changeOwnPassword,
        changeOwnPin,
        createInternalUser: createInternalUserHandler,
        updateInternalUser: updateInternalUserHandler,
        deleteInternalUser: deleteInternalUserHandler,
        activateReferralFamily,
        setFamilyAccessState,
        createVolunteerTaskForUser,
        updateVolunteerTaskForUser,
        requestVolunteerChange,
        reviewVolunteerChange,
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
