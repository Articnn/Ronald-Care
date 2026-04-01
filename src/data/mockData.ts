import type {
  CommunityPost,
  DonorStory,
  FamilyProfile,
  GuideStep,
  ImpactFeedItem,
  InventoryItem,
  Referral,
  ReturnPass,
  Room,
  SupportMessage,
  SupportRequest,
  Trip,
  VolunteerShift,
} from '../types'

const now = new Date().toISOString()

export const sites = [
  'Casa Ronald McDonald Ciudad de Mexico',
  'Casa Ronald McDonald Puebla',
  'Casa Ronald McDonald Tlalnepantla',
]

export const initialReferrals: Referral[] = [
  {
    id: 'ref-1001',
    hospitalWorker: 'Trabajo Social Norte',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    arrivalDate: '2026-03-11',
    companions: 2,
    logisticsNote: 'Llegada por autobus, requiere orientacion de acceso.',
    eligible: true,
    status: 'Aceptada',
    familyCode: 'FAM-3481',
    ticketCode: 'TKT-3481',
    createdAt: now,
  },
  {
    id: 'ref-1002',
    hospitalWorker: 'Trabajo Social Sur',
    site: 'Casa Ronald McDonald Puebla',
    arrivalDate: '2026-03-12',
    companions: 1,
    logisticsNote: 'Ingreso vespertino, confirmar espacio.',
    eligible: true,
    status: 'En revision',
    familyCode: 'FAM-5520',
    ticketCode: 'TKT-5520',
    createdAt: now,
  },
]

export const initialFamilies: FamilyProfile[] = [
  {
    id: 'family-1',
    referralId: 'ref-1001',
    caregiverName: 'Maria',
    familyLastName: 'Lopez',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    room: 'A-12',
    idVerified: true,
    regulationAccepted: true,
    simpleSignature: 'Maria Lopez',
    kioskCode: 'TKT-3481',
    qrCode: 'QR-FAM-3481',
    pin: '3481',
    admissionStatus: 'Check-in completado',
  },
]

export const initialRooms: Room[] = [
  { id: 'room-1', site: 'Casa Ronald McDonald Ciudad de Mexico', label: 'A-12', capacity: 4, occupied: 3 },
  { id: 'room-2', site: 'Casa Ronald McDonald Ciudad de Mexico', label: 'B-03', capacity: 3, occupied: 1 },
  { id: 'room-3', site: 'Casa Ronald McDonald Puebla', label: 'C-18', capacity: 4, occupied: 4 },
  { id: 'room-4', site: 'Casa Ronald McDonald Tlalnepantla', label: 'D-07', capacity: 2, occupied: 1 },
]

export const initialRequests: SupportRequest[] = [
  {
    id: 'req-1',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    familyId: 'family-1',
    title: 'Traslado a hospital',
    type: 'Transporte',
    urgency: 'Alta',
    optionalWindow: '07:30',
    waitingMinutes: 52,
    status: 'Nueva',
    assignedRole: 'volunteer',
    assignedTo: 'Carlos R.',
    createdAt: now,
  },
  {
    id: 'req-2',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    familyId: 'family-1',
    title: 'Kit de bienvenida',
    type: 'Kit',
    urgency: 'Media',
    waitingMinutes: 18,
    status: 'Asignada',
    assignedRole: 'staff',
    assignedTo: 'Lucia P.',
    createdAt: now,
  },
  {
    id: 'req-3',
    site: 'Casa Ronald McDonald Puebla',
    familyId: 'family-1',
    title: 'Apoyo de recepcion',
    type: 'Recepcion',
    urgency: 'Baja',
    waitingMinutes: 10,
    status: 'En proceso',
    assignedRole: 'staff',
    assignedTo: 'Miriam S.',
    createdAt: now,
  },
]

export const initialTrips: Trip[] = [
  {
    id: 'trip-1',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    familyId: 'family-1',
    destination: 'Hospital Infantil',
    assignedTo: 'Carlos R.',
    shift: 'AM',
    status: 'Pendiente',
    startedAt: null,
    endedAt: null,
    durationMinutes: null,
  },
  {
    id: 'trip-2',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    familyId: 'family-1',
    destination: 'Terminal Norte',
    assignedTo: 'Sara M.',
    shift: 'PM',
    status: 'Finalizado',
    startedAt: '2026-03-10T08:00:00.000Z',
    endedAt: '2026-03-10T08:38:00.000Z',
    durationMinutes: 38,
  },
]

export const initialVolunteerShifts: VolunteerShift[] = [
  { id: 'shift-1', kind: 'Individual', role: 'Traslados', day: 'Lunes', volunteerName: 'Carlos R.', hours: 4, availability: 'Disponible' },
  { id: 'shift-2', kind: 'Empresarial', role: 'Recepcion', day: 'Martes', volunteerName: 'Laura V.', hours: 3, availability: 'Cupo limitado' },
  { id: 'shift-3', kind: 'Escolar', role: 'Acompanamiento', day: 'Miercoles', volunteerName: 'Diego T.', hours: 5, availability: 'Disponible' },
]

export const initialInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Kit higiene', stock: 14, minStock: 10, lastMovement: 'Salida de 2 kits' },
  { id: 'inv-2', name: 'Kit bienvenida', stock: 7, minStock: 8, lastMovement: 'Salida de 1 kit' },
  { id: 'inv-3', name: 'Cobijas', stock: 21, minStock: 6, lastMovement: 'Entrada de 5 piezas' },
]

export const initialStories: DonorStory[] = [
  {
    id: 'story-1',
    title: 'Llegada mas simple',
    summary: 'Una familia pudo completar admision y traslado en menos de una hora gracias a coordinacion operativa.',
    image: 'https://placehold.co/800x500/f7b733/7a2a1d?text=RonaldCare+Ops',
  },
  {
    id: 'story-2',
    title: 'Kits listos a tiempo',
    summary: 'El inventario bien gestionado redujo esperas para primeras noches.',
    image: 'https://placehold.co/800x500/ffd86a/7a2a1d?text=Impacto+Anonimo',
  },
]

export const initialImpactFeed: ImpactFeedItem[] = [
  {
    id: 'impact-1',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    title: 'Recepcion agilizada',
    detail: '3 familias completaron check-in sin incidencias durante la manana.',
    createdAt: now,
  },
]

export const guideSteps: GuideStep[] = [
  { id: 'guide-1', title: 'Ubicate rapido', detail: 'Recepcion te comparte codigo, habitacion y horarios clave del dia.' },
  { id: 'guide-2', title: 'Solicita apoyo', detail: 'Puedes pedir transporte, kit o ayuda de recepcion desde tu codigo o con apoyo del staff.' },
  { id: 'guide-3', title: 'Revisa tus viajes', detail: 'Consulta si tu traslado esta pendiente, en curso o finalizado sin datos clinicos.' },
]

export const supportMessages: SupportMessage[] = [
  { id: 'msg-1', title: 'No estas sola', body: 'El equipo puede ayudarte con orientacion, traslados y necesidades basicas durante tu estancia.' },
  { id: 'msg-2', title: 'Pide ayuda a tiempo', body: 'Si algo cambia en tu horario, acude a recepcion o usa tu codigo para revisar el estatus.' },
]

export const initialCommunityPosts: CommunityPost[] = [
  { id: 'post-1', authorAlias: 'Familia Horizonte', message: 'Traer una carpeta pequeña para tickets y horarios nos ayudo mucho.', createdAt: now },
  { id: 'post-2', authorAlias: 'Familia Norte', message: 'La consulta asistida en recepcion fue rapidisima cuando no tuvimos bateria.', createdAt: now },
]

export const initialReturnPasses: ReturnPass[] = [
  {
    id: 'rp-1',
    familyId: 'family-1',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    date: '2026-04-04',
    companions: 2,
    note: 'Regreso para continuidad de hospedaje.',
    status: 'Enviado',
  },
]
