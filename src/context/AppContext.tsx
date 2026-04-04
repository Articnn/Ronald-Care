import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  assignRequest,
  createRequest as createRequestApi,
  createTrip as createTripApi,
  finishTrip as finishTripApi,
  getDonorImpact,
  getFamilies,
  getFamilyStatus,
  getKioskStatus,
  getReferrals,
  getRequests,
  getTrips,
  loginFamily,
  loginInternal,
  resolveRequest,
  startTrip as startTripApi,
  updateRequestWorkflowStatus,
  type BackendFamily,
  type BackendFamilyStatusResponse,
  type BackendKioskStatusResponse,
  type BackendReferral,
  type BackendRequest,
  type BackendTrip,
} from '../lib/api'
import {
  guideSteps,
  initialCommunityPosts,
  initialFamilies,
  initialImpactFeed,
  initialInventory,
  initialReferrals,
  initialRequests,
  initialReturnPasses,
  initialRooms,
  initialStories,
  initialTrips,
  initialVolunteerShifts,
  sites,
  supportMessages,
} from '../data/mockData'
import type {
  CommunityPost,
  FamilyProfile,
  GuideStep,
  ImpactFeedItem,
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
  VolunteerShift,
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
  currentFamily: FamilyProfile | null
  kioskStatus: KioskStatus | null
  referrals: Referral[]
  families: FamilyProfile[]
  rooms: Room[]
  requests: SupportRequest[]
  trips: Trip[]
  volunteerShifts: VolunteerShift[]
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
  loginInternalUser: (email: string, password: string) => Promise<void>
  loginFamilyUser: (code: string, pin: string) => Promise<void>
  logout: () => void
  lookupFamilyStatus: (code: string) => Promise<void>
  clearKioskStatus: () => void
  refreshConnectedData: () => Promise<void>
  createReferral: (payload: Omit<Referral, 'id' | 'status' | 'familyCode' | 'ticketCode' | 'createdAt'>) => string
  updateReferralStatus: (id: string, status: Referral['status']) => void
  completeCheckIn: (payload: Omit<FamilyProfile, 'id' | 'admissionStatus'>) => void
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
  createCommunityPost: (message: string) => void
  createReturnPass: (payload: Omit<ReturnPass, 'id' | 'status'>) => void
}

const ROLE_STORAGE_KEY = 'ops-role'
const SITE_STORAGE_KEY = 'ops-site'
const FAMILY_STORAGE_KEY = 'ops-family-id'
const TOKEN_STORAGE_KEY = 'ops-token'

const AppContext = createContext<AppContextValue | undefined>(undefined)

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeSite(site: string | null | undefined) {
  if (!site) return ''

  const map: Record<string, string> = {
    'Casa Ronald CDMX': 'Casa Ronald McDonald Ciudad de Mexico',
    Puebla: 'Casa Ronald McDonald Puebla',
    Tlalnepantla: 'Casa Ronald McDonald Tlalnepantla',
  }

  return map[site] || site
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
  }
}

function mapRequest(item: BackendRequest, familySite?: string): SupportRequest {
  return {
    id: String(item.RequestId),
    site: familySite || '',
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

function mapTrip(item: BackendTrip, familySite?: string): Trip {
  return {
    id: String(item.TripId),
    site: familySite || '',
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
  }

  return {
    family,
    requests: payload.requests.map((item) => mapRequest(item, family.site)),
    trips: payload.trips.map((item) => mapTrip(item, family.site)),
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem(ROLE_STORAGE_KEY) as Role) || null)
  const [site, setSiteState] = useState<string>(() => localStorage.getItem(SITE_STORAGE_KEY) || sites[0])
  const [easyRead, setEasyRead] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [isSyncing, setIsSyncing] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>(initialReferrals)
  const [families, setFamilies] = useState<FamilyProfile[]>(initialFamilies)
  const [currentFamily, setCurrentFamilyState] = useState<FamilyProfile | null>(() => {
    const savedId = localStorage.getItem(FAMILY_STORAGE_KEY)
    return initialFamilies.find((item) => item.id === savedId) || initialFamilies[0] || null
  })
  const [kioskStatus, setKioskStatus] = useState<KioskStatus | null>(null)
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [requests, setRequests] = useState<SupportRequest[]>(initialRequests)
  const [trips, setTrips] = useState<Trip[]>(initialTrips)
  const [volunteerShifts] = useState<VolunteerShift[]>(initialVolunteerShifts)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [impactFeed, setImpactFeed] = useState<ImpactFeedItem[]>(initialImpactFeed)
  const [donorImpactBySite, setDonorImpactBySite] = useState<DonorImpactSiteMetric[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(initialCommunityPosts)
  const [returnPasses, setReturnPasses] = useState<ReturnPass[]>(initialReturnPasses)

  useEffect(() => {
    if (role) {
      localStorage.setItem(ROLE_STORAGE_KEY, role)
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY)
    }
  }, [role])

  useEffect(() => {
    localStorage.setItem(SITE_STORAGE_KEY, site)
  }, [site])

  useEffect(() => {
    if (currentFamily) {
      localStorage.setItem(FAMILY_STORAGE_KEY, currentFamily.id)
    } else {
      localStorage.removeItem(FAMILY_STORAGE_KEY)
    }
  }, [currentFamily])

  useEffect(() => {
    if (authToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }, [authToken])

  useEffect(() => {
    void loadDonorImpact()
  }, [])

  useEffect(() => {
    if (!authToken || !role || role === 'donor') return
    void refreshConnectedData()
  }, [authToken, role])

  const setRole = (nextRole: Role) => {
    if (nextRole === null) {
      setRoleState(null)
      setAuthToken(null)
      setCurrentFamilyState(null)
      setAuthError(null)
      return
    }
    setRoleState(nextRole)
  }

  const setSite = (nextSite: string) => setSiteState(nextSite)
  const toggleEasyRead = () => setEasyRead((value) => !value)
  const setCurrentFamily = (family: FamilyProfile | null) => setCurrentFamilyState(family)
  const setCurrentFamilyById = (id: string) => {
    const family = families.find((item) => item.id === id) || null
    setCurrentFamilyState(family)
  }

  async function loadDonorImpact() {
    try {
      const payload = await getDonorImpact()
      setDonorImpactBySite(
        payload.bySite.map((item) => ({
          name: normalizeSite(item.Name),
          impactEvents: item.impactEvents,
          familiesSupported: item.familiesSupported,
          totalTrips: item.totalTrips,
          totalRequests: item.totalRequests,
        })),
      )
      setImpactFeed(payload.feed.map(mapImpactFeed))
    } catch {
      // keep mock feed if public API is unavailable
    }
  }

  async function loadStaffData(token: string) {
    const [backendFamilies, backendRequests, backendTrips] = await Promise.all([getFamilies(token), getRequests(token), getTrips(token)])
    const mappedFamilies = backendFamilies.map(mapFamily)
    const familySiteById = new Map(mappedFamilies.map((family) => [family.id, family.site]))
    setFamilies(mappedFamilies)
    setRequests(backendRequests.map((item) => mapRequest(item, familySiteById.get(String(item.FamilyId)))))
    setTrips(backendTrips.map((item) => mapTrip(item, familySiteById.get(String(item.FamilyId)))))
  }

  async function loadHospitalData(token: string) {
    const backendReferrals = await getReferrals(token)
    setReferrals(backendReferrals.map(mapReferral))
  }

  async function loadFamilyData(token: string) {
    const payload = await getFamilyStatus(token)
    const mapped = mapFamilyStatusPayload(payload)
    setCurrentFamilyState(mapped.family)
    setRequests(mapped.requests)
    setTrips(mapped.trips)
    setReturnPasses(
      payload.returnPasses.map((item) => ({
        id: String(item.ReturnPassId),
        familyId: mapped.family.id,
        site: mapped.family.site,
        date: item.RequestedDate,
        companions: item.CompanionCount,
        note: item.LogisticsNote || '',
        status: item.Status === 'enviado' ? 'Enviado' : 'Borrador',
      })),
    )
  }

  async function refreshConnectedData() {
    if (!authToken || !role) return

    setIsSyncing(true)
    setAuthError(null)

    try {
      if (role === 'staff') {
        await Promise.all([loadHospitalData(authToken), loadStaffData(authToken), loadDonorImpact()])
        return
      }

      if (role === 'hospital') {
        await Promise.all([loadHospitalData(authToken), loadDonorImpact()])
        return
      }

      if (role === 'volunteer') {
        const backendRequests = await getRequests(authToken)
        const backendTrips = await getTrips(authToken)
        setRequests(backendRequests.map((item) => mapRequest(item)))
        setTrips(backendTrips.map((item) => mapTrip(item)))
        await loadDonorImpact()
        return
      }

      if (role === 'family') {
        await Promise.all([loadFamilyData(authToken), loadDonorImpact()])
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo sincronizar la informacion')
    } finally {
      setIsSyncing(false)
    }
  }

  const logout = () => {
    setRoleState(null)
    setAuthToken(null)
    setCurrentFamilyState(null)
    setKioskStatus(null)
    setAuthError(null)
  }

  const loginInternalUser = async (email: string, password: string) => {
    setIsSyncing(true)
    setAuthError(null)
    try {
      const payload = await loginInternal(email, password)
      setAuthToken(payload.token)
      setRoleState(payload.user.role)
      const resolvedSite = normalizeSite(payload.user.siteName)
      if (resolvedSite) setSiteState(resolvedSite)
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
      const payload = await getKioskStatus(code)
      const mapped = mapFamilyStatusPayload(payload)
      setKioskStatus(mapped)
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

  const createReferral: AppContextValue['createReferral'] = (payload) => {
    const id = makeId('ref')
    const familyCode = `FAM-${Math.floor(Math.random() * 9000 + 1000)}`
    const ticketCode = `TKT-${familyCode.slice(4)}`
    const next: Referral = {
      ...payload,
      id,
      status: 'Enviada',
      familyCode,
      ticketCode,
      createdAt: new Date().toISOString(),
    }
    setReferrals((current) => [next, ...current])
    return id
  }

  const updateReferralStatus = (id: string, status: Referral['status']) => {
    setReferrals((current) => current.map((referral) => (referral.id === id ? { ...referral, status } : referral)))
  }

  const completeCheckIn: AppContextValue['completeCheckIn'] = (payload) => {
    const nextFamily: FamilyProfile = {
      ...payload,
      id: makeId('family'),
      admissionStatus: 'Check-in completado',
    }
    setFamilies((current) => [nextFamily, ...current])
    setCurrentFamilyState(nextFamily)
    setRooms((current) =>
      current.map((room) => (room.label === payload.room ? { ...room, occupied: Math.min(room.capacity, room.occupied + 1) } : room)),
    )
    setImpactFeed((current) => [
      {
        id: makeId('impact'),
        site: payload.site,
        title: 'Nueva familia recibida',
        detail: `Check-in operativo completado y ficha familia emitida en ${payload.site}.`,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ])
  }

  const createRequest: AppContextValue['createRequest'] = async (payload) => {
    if (!authToken || !role || !['staff', 'family'].includes(role)) {
      const nextRequest: SupportRequest = {
        id: makeId('req'),
        site: payload.site,
        familyId: payload.familyId,
        title: payload.title,
        type: payload.type,
        urgency: payload.urgency,
        optionalWindow: payload.optionalWindow,
        waitingMinutes: 0,
        status: 'Nueva',
        assignedRole: payload.assignedRole,
        assignedTo: payload.assignedTo,
        createdAt: new Date().toISOString(),
      }
      setRequests((current) => [nextRequest, ...current])
      return
    }

    await createRequestApi(authToken, {
      familyId: Number(payload.familyId),
      title: payload.title,
      requestType:
        payload.type === 'Transporte'
          ? 'transporte'
          : payload.type === 'Kit'
            ? 'kit'
            : payload.type === 'Alimento'
              ? 'alimento'
              : 'recepcion',
      urgency:
        payload.urgency === 'Alta' ? 'alta' : payload.urgency === 'Media' ? 'media' : 'baja',
      optionalWindow: payload.optionalWindow,
    })

    await refreshConnectedData()
  }

  const updateRequestStatus: AppContextValue['updateRequestStatus'] = async (id, status) => {
    const request = requests.find((item) => item.id === id)
    if (!request || !authToken) {
      let nextRequest: SupportRequest | undefined
      setRequests((current) =>
        current.map((item) => {
          if (item.id !== id) return item
          nextRequest = { ...item, status }
          return nextRequest
        }),
      )
      return
    }

    if (status === 'Asignada') {
      await assignRequest(authToken, {
        requestId: Number(id),
        assignedRole: request.assignedRole,
        assignedDisplayName: request.assignedTo,
      })
    } else if (status === 'En proceso') {
      await updateRequestWorkflowStatus(authToken, Number(id), 'en_proceso')
    } else if (status === 'Resuelta') {
      await resolveRequest(authToken, Number(id))
    }

    await refreshConnectedData()
  }

  const createTrip: AppContextValue['createTrip'] = async (payload) => {
    if (!authToken || role !== 'staff') {
      const next: Trip = {
        ...payload,
        id: makeId('trip'),
        status: 'Pendiente',
        startedAt: null,
        endedAt: null,
        durationMinutes: null,
      }
      setTrips((current) => [next, ...current])
      return
    }

    await createTripApi(authToken, {
      familyId: Number(payload.familyId),
      destination: payload.destination,
      shift: payload.shift,
      assignedDisplayName: payload.assignedTo,
    })

    await refreshConnectedData()
  }

  const startTrip: AppContextValue['startTrip'] = async (id) => {
    if (!authToken) {
      setTrips((current) =>
        current.map((trip) => (trip.id === id ? { ...trip, status: 'En curso', startedAt: new Date().toISOString() } : trip)),
      )
      return
    }

    await startTripApi(authToken, Number(id))
    await refreshConnectedData()
  }

  const finishTrip: AppContextValue['finishTrip'] = async (id) => {
    if (!authToken) {
      setTrips((current) =>
        current.map((trip) => {
          if (trip.id !== id || !trip.startedAt) return trip
          const endedAt = new Date().toISOString()
          const durationMinutes = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(trip.startedAt).getTime()) / 60000))
          return { ...trip, status: 'Finalizado', endedAt, durationMinutes }
        }),
      )
      return
    }

    await finishTripApi(authToken, Number(id))
    await refreshConnectedData()
  }

  const updateInventory = (id: string, delta: number, label: string) => {
    setInventory((current) =>
      current.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + delta), lastMovement: label } : item)),
    )
  }

  const createCommunityPost = (message: string) => {
    const nextPost: CommunityPost = {
      id: makeId('post'),
      authorAlias: currentFamily ? `Familia ${currentFamily.familyLastName}` : 'Familia anonima',
      message,
      createdAt: new Date().toISOString(),
    }
    setCommunityPosts((current) => [nextPost, ...current])
  }

  const createReturnPass: AppContextValue['createReturnPass'] = (payload) => {
    const nextPass: ReturnPass = {
      ...payload,
      id: makeId('rp'),
      status: 'Enviado',
    }
    setReturnPasses((current) => [nextPass, ...current])
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
        currentFamily,
        kioskStatus,
        referrals,
        families,
        rooms,
        requests,
        trips,
        volunteerShifts,
        inventory,
        guideSteps,
        supportMessages,
        communityPosts,
        returnPasses,
        donorStories: initialStories,
        impactFeed,
        donorImpactBySite,
        availableSites: sites,
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
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppState must be used within AppProvider')
  }
  return context
}
