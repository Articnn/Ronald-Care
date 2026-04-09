import { Bell, Building2, ChevronDown, ClipboardList, HeartHandshake, LayoutDashboard, ShieldCheck, UserCircle2 } from 'lucide-react'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../../context/AppContext'
import { LoadingOverlay } from '../ui/LoadingOverlay'
import type { InternalRole, Role } from '../../types'

const navByRole: Record<Exclude<Role, null | 'family'>, Array<{ label: string; to: string; icon: ReactElement }>> = {
  superadmin: [
    { label: 'Panel admin', to: '/admin/panel', icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Admisiones', to: '/staff/admissions', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Lista de Espera', to: '/staff/waitlist', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Recepción', to: '/staff/reception', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
  ],
  admin: [
    { label: 'Panel admin', to: '/admin/panel', icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Admisiones', to: '/staff/admissions', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Lista de Espera', to: '/staff/waitlist', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Recepción', to: '/staff/reception', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
  ],
  hospital: [],
  staff: [
    { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Admisiones', to: '/staff/admissions', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Lista de Espera', to: '/staff/waitlist', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Recepción', to: '/staff/reception', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Perfil', to: '/account', icon: <UserCircle2 className="h-4 w-4" /> },
  ],
  volunteer: [],
}

const roleLabels: Record<Exclude<Role, null>, string> = {
  superadmin: 'Dirección Ejecutiva',
  admin: 'Gerente de Sede',
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
    toasts,
    isSyncing,
  } = useAppState()
  const location = useLocation()
  const links = role && role !== 'family' ? navByRole[role as InternalRole] : []

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
          <Link to="/login" className="flex items-center gap-3">
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
            {role && role !== 'family' ? (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen((value) => !value)}
                  className="relative rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition-all duration-200 hover:border-white/40 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notificaciones
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

      <main className="relative mx-auto max-w-7xl p-4 md:p-6">
        {isSyncing && <LoadingOverlay message="Cargando información..." className="absolute inset-0 min-h-[400px]" />}
        <Outlet />
      </main>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-soft backdrop-blur ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : toast.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-sky-200 bg-sky-50 text-sky-900'
            }`}
          >
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}


