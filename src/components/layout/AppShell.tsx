import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  HeartHandshake,
  LayoutDashboard,
  Package,
  Route,
  ShieldCheck,
  UserCircle2,
  Users,
  InfoIcon,
  HandHelpingIcon,
} from 'lucide-react'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../../context/AppContext'
import type { InternalRole, Role } from '../../types'

const navByRole: Record<Exclude<Role, null | 'family'>, Array<{ label: string; to: string; icon: ReactElement }>> = {
  superadmin: [
    { label: 'Panel admin', to: '/admin/panel', icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Referencias', to: '/hospital/referrals', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Recepción', to: '/staff/reception', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Ayuda asistida', to: '/staff/kiosk', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Voluntarios', to: '/staff/volunteers', icon: <Users className="h-4 w-4" /> },
    { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
  ],
  admin: [
    { label: 'Panel admin', to: '/admin/panel', icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Recepción', to: '/staff/reception', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Ayuda asistida', to: '/staff/kiosk', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Solicitudes', to: '/staff/requests', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Voluntarios', to: '/staff/volunteers', icon: <Users className="h-4 w-4" /> },
    { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
  ],
  hospital: [
    { label: 'Referencias', to: '/hospital/referrals', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
  ],
  staff: [
    { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Recepción', to: '/staff/reception', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Ayuda asistida', to: '/staff/kiosk', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Habitaciones', to: '/staff/rooms', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Solicitudes', to: '/staff/requests', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Viajes', to: '/staff/trips', icon: <Route className="h-4 w-4" /> },
    { label: 'Voluntarios', to: '/staff/volunteers', icon: <Users className="h-4 w-4" /> },
    { label: 'Inventario', to: '/staff/inventory', icon: <Package className="h-4 w-4" /> },
    { label: 'Analitica', to: '/staff/analytics', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
  ],
  volunteer: [
    { label: 'Solicitudes', to: '/volunteer/requests', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Viajes', to: '/volunteer/trips', icon: <Route className="h-4 w-4" /> },
    { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
  ],
}

const familyNav = [
  { label: 'Guía Express', to: '/family/guide', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Mi estatus', to: '/family/status', icon: <InfoIcon className="h-4 w-4" /> },
  { label: 'Solicitar apoyo', to: '/family/request', icon: <HandHelpingIcon className="h-4 w-4" /> },
  { label: 'Pausa 60s', to: '/family/pause', icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Return Pass', to: '/family/return-pass', icon: <Route className="h-4 w-4" /> },
  { label: 'Comunidad', to: '/family/community', icon: <Users className="h-4 w-4" /> },
  { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
]

const roleLabels: Record<Exclude<Role, null>, string> = {
  superadmin: 'superadmin',
  admin: 'admin',
  hospital: 'hospital',
  staff: 'staff',
  volunteer: 'voluntario',
  family: 'familia',
}

function canChangeSite(role: Role) {
  return !role || role === 'superadmin' || role === 'admin'
}

export function AppShell() {
  const {
    role,
    site,
    easyRead,
    availableSites,
    setSite,
    toggleEasyRead,
    logout,
    notifications,
    unreadNotifications,
    markNotificationAsRead,
  } = useAppState()
  const location = useLocation()
  const links = role === 'family' ? familyNav : role ? navByRole[role as InternalRole] : []

  const [isSiteOpen, setIsSiteOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const siteRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (siteRef.current && !siteRef.current.contains(e.target as Node)) {
        setIsSiteOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const canChange = canChangeSite(role)
  const glassClass = 'border border-white/10 bg-white/5 backdrop-blur-md shadow-lg'

  return (
    <div className={`min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(255,211,173,0.85),_transparent_35%),linear-gradient(180deg,_#fff8ef,_#fff4db)] ${easyRead ? 'text-xl' : ''}`}>
      <header className="sticky top-0 z-20 border-b border-warm-200 bg-warm-700 text-white shadow-soft">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <HeartHandshake className="h-8 w-8" />
            <p className="text-xl font-extrabold">RonaldCare</p>
          </Link>

          <div className="relative" ref={siteRef}>
            <button
              disabled={!canChange}
              onClick={() => setIsSiteOpen(!isSiteOpen)}
              className={`group flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2 text-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50 ${glassClass} ${isSiteOpen ? 'border-white/30 bg-white/10' : ''}`}
            >
              <Building2 className="h-4 w-4 shrink-0 text-white/60 transition-colors group-hover:text-white" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">Sede</span>
                <span className="font-bold text-white">{site}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform duration-300 ${isSiteOpen ? 'rotate-180' : ''}`} />
            </button>

            <div
              className={`absolute left-0 top-[calc(100%+8px)] z-50 w-full min-w-[160px] origin-top overflow-hidden rounded-xl border border-white/10 bg-warm-700 p-1 shadow-lg transition-all duration-200 ${
                isSiteOpen ? 'visible scale-100 opacity-100' : 'invisible pointer-events-none scale-95 opacity-0'
              }`}
            >
              {availableSites.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setSite(item)
                    setIsSiteOpen(false)
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-white/10 ${
                    site === item ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {role && <span className="rounded-full bg-gold-300 px-3 py-1 text-sm font-bold text-warm-900">Rol: {roleLabels[role]}</span>}

          <div className="ml-auto flex gap-2">
            {role === 'volunteer' ? (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen((value) => !value)}
                  className="relative rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition-all duration-200 hover:border-white/40 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Alertas
                  </span>
                  {unreadNotifications > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                      {unreadNotifications}
                    </span>
                  ) : null}
                </button>
                <div
                  className={`absolute right-0 top-[calc(100%+8px)] z-50 w-96 max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-warm-700 p-2 shadow-lg transition-all duration-200 ${
                    isNotificationsOpen ? 'visible scale-100 opacity-100' : 'invisible pointer-events-none scale-95 opacity-0'
                  }`}
                >
                  <div className="space-y-2">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={async () => {
                            await markNotificationAsRead(Number(notification.id))
                            setIsNotificationsOpen(false)
                          }}
                          className={`w-full rounded-xl px-4 py-3 text-left transition ${notification.isRead ? 'bg-white/5 text-white/70' : 'bg-white/15 text-white'}`}
                        >
                          <p className="font-bold">{notification.title}</p>
                          <p className="text-sm">{notification.message}</p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">No tienes notificaciones pendientes.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            <button
              onClick={toggleEasyRead}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition-all duration-200 hover:border-white/40 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {easyRead ? 'Vista normal' : 'Lectura fácil'}
            </button>
            {role && (
              <button
                onClick={logout}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition-all duration-200 hover:border-white/40 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Salir
              </button>
            )}
          </div>
        </div>

        {role && links.length > 0 && (
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
                  {link.icon} {link.label}
                </Link>
              )
            })}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
