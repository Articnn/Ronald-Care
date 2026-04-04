import {
  Building2,
  ClipboardList,
  HeartHandshake,
  LayoutDashboard,
  MenuSquare,
  Package,
  Route,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react'
import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../../context/AppContext'
import type { Role } from '../../types'
import { Button } from '../ui/Button'

const navByRole: Record<Exclude<Role, null>, Array<{ label: string; to: string; icon: ReactElement }>> = {
  hospital: [
    { label: 'Login', to: '/hospital/login', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Referencias', to: '/hospital/referrals', icon: <ClipboardList className="h-4 w-4" /> },
  ],
  staff: [
    { label: 'Recepcion', to: '/staff/reception', icon: <MenuSquare className="h-4 w-4" /> },
    { label: 'Ayuda asistida', to: '/staff/family-status', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Habitaciones', to: '/staff/rooms', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Solicitudes', to: '/staff/requests', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Viajes', to: '/staff/trips', icon: <Route className="h-4 w-4" /> },
    { label: 'Voluntarios', to: '/staff/volunteers', icon: <Users className="h-4 w-4" /> },
    { label: 'Inventario', to: '/staff/inventory', icon: <Package className="h-4 w-4" /> },
    { label: 'Analitica', to: '/staff/analytics', icon: <LayoutDashboard className="h-4 w-4" /> },
  ],
  volunteer: [
    { label: 'Solicitudes', to: '/volunteer/requests', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Viajes', to: '/volunteer/trips', icon: <Route className="h-4 w-4" /> },
  ],
  family: [
    { label: 'Mi estatus', to: '/family/status', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Solicitar apoyo', to: '/family/request', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Guia Express', to: '/family/guide', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Pausa 60s', to: '/family/pause', icon: <HeartHandshake className="h-4 w-4" /> },
    { label: 'Return Pass', to: '/family/return-pass', icon: <Route className="h-4 w-4" /> },
    { label: 'Comunidad', to: '/family/community', icon: <Users className="h-4 w-4" /> },
  ],
  donor: [
    { label: 'Inicio', to: '/donor/home', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Galeria', to: '/donor/gallery', icon: <HeartHandshake className="h-4 w-4" /> },
    { label: 'Eventos', to: '/donor/impact', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Donar', to: '/donor/donate', icon: <HeartHandshake className="h-4 w-4" /> },
  ],
}

const publicNav = [
  { label: 'Inicio', to: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Acceso operativo', to: '/access', icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Kiosko familiar', to: '/kiosk', icon: <Ticket className="h-4 w-4" /> },
  { label: 'Donantes', to: '/donor/home', icon: <HeartHandshake className="h-4 w-4" /> },
]

const donorPublicNav = [
  { label: 'Inicio', to: '/donor/home', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Galeria', to: '/donor/gallery', icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Eventos', to: '/donor/impact', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Donar', to: '/donor/donate', icon: <HeartHandshake className="h-4 w-4" /> },
]

const roleLabels: Record<Exclude<Role, null>, string> = {
  hospital: 'hospital',
  staff: 'staff',
  volunteer: 'voluntario',
  family: 'familia',
  donor: 'donante',
}

export function AppShell() {
  const { role, site, easyRead, toggleEasyRead, logout } = useAppState()
  const location = useLocation()
  const isDonorPublicView = !role && location.pathname.startsWith('/donor')
  const links = role ? navByRole[role] : isDonorPublicView ? donorPublicNav : publicNav

  return (
    <div
      className={`min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(255,211,173,0.85),_transparent_35%),linear-gradient(180deg,_#fff8ef,_#fff4db)] ${
        easyRead ? 'text-xl' : ''
      }`}
    >
      <header className="sticky top-0 z-20 border-b border-warm-200 bg-warm-700 text-white shadow-soft">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <HeartHandshake className="h-8 w-8" />
            <div>
              <p className="text-xl font-extrabold">RonaldCare</p>
              <p className="text-sm text-warm-100">RonaldCare · no clínico</p>
            </div>
          </Link>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">Sede: {site}</span>
          {role ? (
            <span className="rounded-full bg-gold-300 px-3 py-1 text-sm font-bold text-warm-900">Rol: {roleLabels[role]}</span>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={toggleEasyRead} className="text-base">
              {easyRead ? 'Vista normal' : 'Lectura facil'}
            </Button>
            {role ? (
              <Button variant="ghost" onClick={logout} className="text-base">
                Salir
              </Button>
            ) : null}
          </div>
        </div>
        {links.length > 0 ? (
          <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-4">
            {links.map((link) => {
              const active = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    active ? 'bg-white text-warm-900' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              )
            })}
          </nav>
        ) : null}
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
