export type Role = 'hospital' | 'staff' | 'volunteer' | 'family' | 'donor' | null

export type ReferralStatus = 'Enviada' | 'En revision' | 'Aceptada'
export type RequestStatus = 'Nueva' | 'Asignada' | 'En proceso' | 'Resuelta'
export type RequestUrgency = 'Baja' | 'Media' | 'Alta'
export type RequestPriorityLabel = 'Alta' | 'Media' | 'Baja'
export type TripStatus = 'Pendiente' | 'En curso' | 'Finalizado'
export type RequestType = 'Transporte' | 'Kit' | 'Alimento' | 'Recepcion'
export type TripShift = 'AM' | 'PM'

export interface Referral {
  id: string
  hospitalWorker: string
  site: string
  arrivalDate: string
  companions: number
  logisticsNote: string
  eligible: boolean
  status: ReferralStatus
  familyCode: string
  ticketCode: string
  createdAt: string
}

export interface FamilyProfile {
  id: string
  referralId: string
  caregiverName: string
  familyLastName: string
  site: string
  room: string
  idVerified: boolean
  regulationAccepted: boolean
  simpleSignature: string
  kioskCode: string
  qrCode: string
  pin: string
  admissionStatus: 'Pendiente' | 'Check-in completado'
}

export interface Room {
  id: string
  site: string
  label: string
  capacity: number
  occupied: number
}

export interface SupportRequest {
  id: string
  site: string
  familyId: string
  title: string
  type: RequestType
  urgency: RequestUrgency
  optionalWindow?: string
  waitingMinutes: number
  status: RequestStatus
  assignedRole: 'staff' | 'volunteer'
  assignedTo: string
  createdAt: string
}

export interface PriorityScore {
  score: number
  label: RequestPriorityLabel
  reason: string
}

export interface Trip {
  id: string
  site: string
  familyId: string
  destination: string
  assignedTo: string
  shift: TripShift
  status: TripStatus
  startedAt: string | null
  endedAt: string | null
  durationMinutes: number | null
}

export interface VolunteerShift {
  id: string
  kind: 'Individual' | 'Escolar' | 'Empresarial'
  role: 'Traslados' | 'Recepcion' | 'Acompanamiento'
  day: string
  volunteerName: string
  hours: number
  availability: 'Disponible' | 'Cupo limitado' | 'No disponible'
}

export interface InventoryItem {
  id: string
  name: string
  stock: number
  minStock: number
  lastMovement: string
}

export interface DonorStory {
  id: string
  title: string
  summary: string
  image: string
}

export interface ImpactFeedItem {
  id: string
  site: string
  title: string
  detail: string
  createdAt: string
}

export interface GuideStep {
  id: string
  title: string
  detail: string
}

export interface SupportMessage {
  id: string
  title: string
  body: string
}

export interface CommunityPost {
  id: string
  authorAlias: string
  message: string
  createdAt: string
}

export interface ReturnPass {
  id: string
  familyId: string
  site: string
  date: string
  companions: number
  note: string
  status: 'Borrador' | 'Enviado'
}
