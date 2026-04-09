import { HeartHandshake, Lock, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppContext'
import { getDefaultRouteForRole } from '../lib/roleRouting'

export function OperationalAccessPage() {
  const { authError, isSyncing, loginInternalUser, role } = useAppState()
  const navigate = useNavigate()
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('admin@ronaldcare.demo')
  const [password, setPassword] = useState('Admin123!')

  useEffect(() => {
    if (role) {
      const nextRoute = getDefaultRouteForRole(role)
      if (window.location.pathname !== nextRoute) {
        window.location.replace(nextRoute)
      }
    }
  }, [navigate, role])

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-soft lg:p-10">
          <span className="inline-flex w-fit items-center rounded-full border border-[#950606]/10 bg-[#950606]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#950606]">
            RonaldCare
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-warm-900 lg:text-5xl">Bienvenido a RonaldCare</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Plataforma operativa para coordinar admisiones, seguimiento de estancia, recepción y gestión multi-sede con una sola entrada segura.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold">Dirección Ejecutiva</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold">Gerente de Sede</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold">Staff / Operación</span>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="rounded-xl bg-[#950606] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#7f0707]"
            >
              Iniciar Sesión
            </button>
            <p className="text-sm text-slate-500">Un solo acceso. El sistema detecta el rol y te lleva al panel correcto.</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-soft lg:p-10">
          <div className="mb-8 flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#950606]/8 text-[#950606]">
              <HeartHandshake className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Acceso seguro</p>
              <h2 className="text-2xl font-bold text-warm-900">Ingreso institucional</h2>
            </div>
          </div>

          {showLogin ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu.correo@ronaldcare.demo"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-warm-900 placeholder:text-slate-400 focus:border-[#950606]/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#950606]/8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-warm-900 placeholder:text-slate-400 focus:border-[#950606]/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#950606]/8"
                  />
                </div>
              </div>

              {authError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-700">{authError}</p>
                </div>
              ) : null}

              <button
                type="button"
                disabled={isSyncing}
                onClick={async () => {
                  try {
                    const nextRole = await loginInternalUser(email, password)
                    const nextRoute = getDefaultRouteForRole(nextRole)
                    console.log('[OperationalAccessPage] userRole:', nextRole, 'redirect:', nextRoute)
                    window.location.replace(nextRoute)
                  } catch (error) {
                    console.error('[OperationalAccessPage] login error:', error)
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#950606] py-3 text-sm font-semibold text-white transition hover:bg-[#7f0707] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSyncing ? 'Verificando...' : 'Entrar'}
              </button>

              <p className="pt-2 text-center text-xs text-slate-400">Si no tienes credenciales, contacta a Dirección Ejecutiva.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-500">Acceso unificado por correo y contraseña</p>
              <p className="mt-2 text-sm text-slate-400">Cuando inicies sesión, RonaldCare detectará tu rol y abrirá automáticamente tu vista correspondiente.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
