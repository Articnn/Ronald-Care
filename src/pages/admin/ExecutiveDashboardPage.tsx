import { AlertCircle, ArrowRight, BellRing, Building2, Clock3, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

function formatReadableDate(value?: string | null) {
  if (!value) return 'Pendiente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isUpcoming(dateValue?: string | null, hours = 48) {
  if (!dateValue) return false
  const target = new Date(dateValue)
  if (Number.isNaN(target.getTime())) return false
  const diffHours = (target.getTime() - Date.now()) / (1000 * 60 * 60)
  return diffHours >= 0 && diffHours <= hours
}

function DashboardStat({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: ReactNode
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">{label}</p>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-warm-50 text-[#950606]">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-black text-warm-900">{value}</p>
      <p className="text-sm text-warm-600">{detail}</p>
    </Card>
  )
}

export function ExecutiveDashboardPage() {
  const {
    role,
    site,
    pendingReferrals,
    families,
    familyStayAutomation,
    internalUsers,
    staffRoster,
    notifications,
    unreadNotifications,
  } = useAppState()

  const executiveLabel = role === 'superadmin' ? 'Dashboard Dirección Ejecutiva' : 'Dashboard Gerente de Sede'
  const executiveSubtitle =
    role === 'superadmin'
      ? `Vista global de supervisión para ${site}. Aquí solo ves resumen, prioridades y accesos rápidos.`
      : `Vista de control de sede para ${site}. Aquí solo ves resumen operativo y pendientes clave.`

  const activeInternalUsers = internalUsers.filter((user) => user.isActive)
  const familiesInProcess = familyStayAutomation.filter((item) => item.automationStatus !== 'Checkout completado')
  const upcomingDepartures = families.filter((family) => isUpcoming(family.plannedCheckoutDate))
  const availableStaff = staffRoster.filter((member) => member.availability === 'Disponible')
  const urgentReferrals = pendingReferrals.slice(0, 5)
  const latestNotifications = notifications.slice(0, 4)

  return (
    <div className="space-y-8">
      <SectionHeader title={executiveLabel} subtitle={executiveSubtitle} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Referencias pendientes"
          value={pendingReferrals.length}
          detail="Casos listos para activación o revisión final."
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <DashboardStat
          label="Familias activas"
          value={families.length}
          detail="Familias con estancia o acceso ya operando."
          icon={<Building2 className="h-5 w-5" />}
        />
        <DashboardStat
          label="Estancias en curso"
          value={familiesInProcess.length}
          detail="Seguimiento operativo de habitaciones y permanencias."
          icon={<Clock3 className="h-5 w-5" />}
        />
        <DashboardStat
          label="Equipo disponible"
          value={availableStaff.length}
          detail={`${activeInternalUsers.length} usuarios internos activos en la sede filtrada.`}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Prioridades del día</p>
              <h2 className="text-2xl font-bold text-warm-900">Resumen ejecutivo</h2>
              <p className="text-sm text-warm-600">Este dashboard se queda en vista resumen. La gestión detallada vive en Panel admin.</p>
            </div>
            <Link to="/admin/panel">
              <Button variant="secondary">Abrir Panel admin</Button>
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] bg-warm-50 p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#950606]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-warm-900">Pendientes de activación</h3>
                  <p className="text-sm text-warm-600">Solo vista rápida, sin duplicar el panel operativo.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {urgentReferrals.map((referral) => (
                  <div key={referral.id} className="rounded-2xl bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-warm-900">{referral.caregiverName} {referral.familyLastName}</p>
                        <p className="text-sm text-warm-700">Llegada {formatReadableDate(referral.arrivalDate)}</p>
                      </div>
                      <StatusChip status={referral.status} />
                    </div>
                  </div>
                ))}
                {urgentReferrals.length === 0 ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-warm-700">No hay referencias pendientes en esta sede.</div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] bg-warm-50 p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#950606]">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-warm-900">Salidas próximas</h3>
                  <p className="text-sm text-warm-600">Indicador rápido para decisiones de estancia y salida.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {upcomingDepartures.map((family) => (
                  <div key={family.id} className="rounded-2xl bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-warm-900">{family.caregiverName} {family.familyLastName}</p>
                        <p className="text-sm text-warm-700">Salida {formatReadableDate(family.plannedCheckoutDate)}</p>
                      </div>
                      <StatusChip status={family.automationStatus || 'Pendiente'} />
                    </div>
                  </div>
                ))}
                {upcomingDepartures.length === 0 ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-warm-700">No hay salidas críticas en las próximas 48 horas.</div>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-50 text-[#950606]">
                <BellRing className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold text-warm-900">Notificaciones recientes</h3>
                <p className="text-sm text-warm-600">{unreadNotifications} sin leer</p>
              </div>
            </div>
            <div className="space-y-3">
              {latestNotifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl bg-warm-50 p-4">
                  <p className="font-bold text-warm-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-warm-700">{notification.message}</p>
                </div>
              ))}
              {latestNotifications.length === 0 ? (
                <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">No hay notificaciones recientes para mostrar.</div>
              ) : null}
            </div>
          </Card>

          <Card className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Accesos rápidos</p>
            <div className="grid gap-3">
              <Link to="/staff/admissions" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-warm-900">Ir a Admisiones</span>
                  <ArrowRight className="h-4 w-4 text-warm-700" />
                </div>
              </Link>
              <Link to="/staff/waitlist" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-warm-900">Revisar Lista de Espera</span>
                  <ArrowRight className="h-4 w-4 text-warm-700" />
                </div>
              </Link>
              <Link to="/staff/reception" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-warm-900">Abrir Recepción</span>
                  <ArrowRight className="h-4 w-4 text-warm-700" />
                </div>
              </Link>
              <Link to="/tasks" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-warm-900">Gestión de Tareas</span>
                  <ArrowRight className="h-4 w-4 text-warm-700" />
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
