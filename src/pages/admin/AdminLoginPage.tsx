import { ArrowLeft, Lock, Mail, ShieldCheck, UserCog } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../../context/AppContext'

const features = [
  'Alta y gestión de usuarios internos',
  'Activación y control familiar por sede',
  'Panel ejecutivo y reportes',
  'Visión transversal multi-sede',
]

export function AdminLoginPage() {
  const { authError, isSyncing, loginInternalUser } = useAppState()
  const [email, setEmail] = useState('admin@ronaldcare.demo')
  const [password, setPassword] = useState('Admin123!')
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center p-4">
      <div className="flex w-full max-w-3xl overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">

        {/* ── Left branding panel ── */}
        <div className="hidden w-80 shrink-0 flex-col justify-between bg-warm-900 p-8 md:flex">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <UserCog className="h-6 w-6 text-white" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-warm-400">Acceso ejecutivo</p>
            <h2 className="mt-2 text-xl font-bold text-white">Dirección Ejecutiva</h2>
            <p className="mt-1 text-sm text-warm-300">Gerente de Sede y Dirección</p>

            <div className="mt-8 space-y-3">
              {features.map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                  <p className="text-sm text-warm-200">{f}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-warm-800 pt-6">
            <p className="text-xs text-warm-500">RonaldCare · Sistema interno</p>
            <p className="text-xs text-warm-600">Casa Ronald McDonald House</p>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex flex-1 flex-col justify-center bg-white px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-gray-500">Acceso para Dirección Ejecutiva y Gerentes de Sede.</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ronaldcare.demo"
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-500 focus:outline-none focus:ring-2 focus:ring-warm-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-500 focus:outline-none focus:ring-2 focus:ring-warm-100"
                />
              </div>
            </div>

            {authError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">{authError}</p>
              </div>
            )}

            <button
              disabled={isSyncing}
              onClick={async () => {
                const nextRole = await loginInternalUser(email, password)
                navigate(nextRole === 'superadmin' || nextRole === 'admin' ? '/admin/panel' : '/login')
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-warm-700 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-warm-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-warm-700 transition">
              <ArrowLeft className="h-4 w-4" />
              Volver al selector de acceso
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
