export type InternalRole = 'superadmin' | 'admin' | 'hospital' | 'staff' | 'volunteer'
export type Role = InternalRole | 'family' | null

export type ReferralStatus = 'Enviada' | 'En revision' | 'Aceptada'
export type RequestStatus = 'Nueva' | 'Asignada' | 'En proceso' | 'Resuelta'
export type RequestUrgency = 'Baja' | 'Media' | 'Alta'
export type RequestPriorityLabel = 'Alta' | 'Media' | 'Baja'
export type TripStatus = 'Pendiente' | 'En curso' | 'Finalizado'
export type RequestType = 'Transporte' | 'Kit' | 'Alimento' | 'Recepción'
export type TripShift = 'AM' | 'PM'
export type VolunteerTaskType = 'Cocina' | 'Lavanderia' | 'Traslados' | 'Acompanamiento' | 'Recepción' | 'Limpieza' | 'Inventario'

export interface CurrentUser {
  userId: number
  fullName: string
  email: string
  role: InternalRole | 'family'
  siteId: number | null
  siteName: string | null
}

export interface Referral {
  id: string
  hospitalWorker: string
  site: string
  caregiverName: string
  familyLastName: string
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
  isActive?: boolean
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
  role: 'Traslados' | 'Recepcion' | 'Acompanamiento' | 'Cocina' | 'Lavanderia'
  day: string
  volunteerName: string
  hours: number
  availability: 'Disponible' | 'Cupo limitado' | 'No disponible'
  volunteerUserId?: number
  workDays?: string[]
  startTime?: string
  endTime?: string
  shiftLabel?: 'Manana' | 'Tarde' | 'Noche'
}

export interface VolunteerTask {
  id: string
  volunteerUserId: number
  volunteerName: string
  title: string
  type: VolunteerTaskType
  shift: 'AM' | 'PM'
  day: string
  status: 'Pendiente' | 'En proceso' | 'Completada'
  notes: string
}

export interface VolunteerNotification {
  id: string
  volunteerTaskId: number
  title: string
  message: string
  day: string
  shift: 'AM' | 'PM'
  isRead: boolean
  createdAt: string
}

export interface VolunteerRosterItem {
  userId: number
  fullName: string
  site: string
  email: string
  volunteerType: 'Individual' | 'Escolar' | 'Empresarial'
  role: 'Traslados' | 'Recepcion' | 'Acompanamiento' | 'Cocina' | 'Lavanderia'
  workDays: string[]
  startTime: string
  endTime: string
  shiftLabel: 'Manana' | 'Tarde' | 'Noche'
  availability: 'Disponible' | 'Cupo limitado' | 'No disponible'
  currentTasks: number
}

export interface VolunteerChangeRequest {
  id: string
  volunteerUserId: number
  volunteerName: string
  requestedShift: 'AM' | 'PM' | ''
  requestedTask: VolunteerTaskType | ''
  reason: string
  status: 'Pendiente' | 'Aprobada' | 'Rechazada'
}

export interface InternalUserRecord {
  id: string
  fullName: string
  email: string
  role: 'Admin' | 'Staff' | 'Voluntario' | 'Hospital'
  site: string | null
  isActive: boolean
}

export interface StaffDashboardSummary {
  pendingRequestsToday: number
  availableVolunteersNow: number
  familiesInHouse: number
  unassignedTasks: number
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
