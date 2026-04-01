import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  guideSteps,
  initialFamilies,
  initialCommunityPosts,
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
  RequestType,
  RequestStatus,
  ReturnPass,
  Role,
  Room,
  SupportMessage,
  SupportRequest,
  Trip,
  VolunteerShift,
} from '../types'

interface AppContextValue {
  role: Role
  site: string
  easyRead: boolean
  currentFamily: FamilyProfile | null
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
  availableSites: string[]
  setRole: (role: Role) => void
  setSite: (site: string) => void
  setCurrentFamily: (family: FamilyProfile | null) => void
  setCurrentFamilyById: (id: string) => void
  toggleEasyRead: () => void
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
  }) => void
  updateRequestStatus: (id: string, status: RequestStatus) => void
  createTrip: (payload: Omit<Trip, 'id' | 'status' | 'startedAt' | 'endedAt' | 'durationMinutes'>) => void
  startTrip: (id: string) => void
  finishTrip: (id: string) => void
  updateInventory: (id: string, delta: number, label: string) => void
  createCommunityPost: (message: string) => void
  createReturnPass: (payload: Omit<ReturnPass, 'id' | 'status'>) => void
}

const ROLE_STORAGE_KEY = 'ops-role'
const SITE_STORAGE_KEY = 'ops-site'
const FAMILY_STORAGE_KEY = 'ops-family-id'

const AppContext = createContext<AppContextValue | undefined>(undefined)

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem(ROLE_STORAGE_KEY) as Role) || null)
  const [site, setSiteState] = useState<string>(() => localStorage.getItem(SITE_STORAGE_KEY) || sites[0])
  const [easyRead, setEasyRead] = useState(false)
  const [referrals, setReferrals] = useState<Referral[]>(initialReferrals)
  const [families, setFamilies] = useState<FamilyProfile[]>(initialFamilies)
  const [currentFamily, setCurrentFamilyState] = useState<FamilyProfile | null>(() => {
    const savedId = localStorage.getItem(FAMILY_STORAGE_KEY)
    return initialFamilies.find((item) => item.id === savedId) || initialFamilies[0] || null
  })
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [requests, setRequests] = useState<SupportRequest[]>(initialRequests)
  const [trips, setTrips] = useState<Trip[]>(initialTrips)
  const [volunteerShifts] = useState<VolunteerShift[]>(initialVolunteerShifts)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [impactFeed, setImpactFeed] = useState<ImpactFeedItem[]>(initialImpactFeed)
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

  const setRole = (nextRole: Role) => setRoleState(nextRole)
  const setSite = (nextSite: string) => setSiteState(nextSite)
  const toggleEasyRead = () => setEasyRead((value) => !value)
  const setCurrentFamily = (family: FamilyProfile | null) => setCurrentFamilyState(family)
  const setCurrentFamilyById = (id: string) => {
    const family = families.find((item) => item.id === id) || null
    setCurrentFamilyState(family)
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

  const createRequest: AppContextValue['createRequest'] = (payload) => {
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
  }

  const updateRequestStatus = (id: string, status: RequestStatus) => {
    let nextRequest: SupportRequest | undefined
    setRequests((current) =>
      current.map((request) => {
        if (request.id !== id) return request
        nextRequest = { ...request, status }
        return nextRequest
      }),
    )

    if (status === 'Resuelta' && nextRequest !== undefined) {
      const resolvedRequest = nextRequest
      setImpactFeed((current) => [
        {
          id: makeId('impact'),
          site: resolvedRequest.site,
          title: 'Solicitud resuelta',
          detail: `${resolvedRequest.type} completado dentro del flujo operativo, sin datos personales.`,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ])
    }
  }

  const createTrip: AppContextValue['createTrip'] = (payload) => {
    const next: Trip = {
      ...payload,
      id: makeId('trip'),
      shift: payload.shift,
      status: 'Pendiente',
      startedAt: null,
      endedAt: null,
      durationMinutes: null,
    }
    setTrips((current) => [next, ...current])
  }

  const startTrip = (id: string) => {
    setTrips((current) =>
      current.map((trip) => (trip.id === id ? { ...trip, status: 'En curso', startedAt: new Date().toISOString() } : trip)),
    )
  }

  const finishTrip = (id: string) => {
    setTrips((current) =>
      current.map((trip) => {
        if (trip.id !== id || !trip.startedAt) return trip
        const endedAt = new Date().toISOString()
        const durationMinutes = Math.max(
          1,
          Math.round((new Date(endedAt).getTime() - new Date(trip.startedAt).getTime()) / 60000),
        )
        return { ...trip, status: 'Finalizado', endedAt, durationMinutes }
      }),
    )
  }

  const updateInventory = (id: string, delta: number, label: string) => {
    setInventory((current) =>
      current.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, item.stock + delta), lastMovement: label } : item,
      ),
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
        currentFamily,
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
        availableSites: sites,
        setRole,
        setSite,
        setCurrentFamily,
        setCurrentFamilyById,
        toggleEasyRead,
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
