import { Lock, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppContext'
import { getDefaultRouteForRole } from '../lib/roleRouting'

export function OperationalAccessPage() {
  const { authError, isSyncing, loginInternalUser, role } = useAppState()
  const navigate = useNavigate()
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
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-100 p-8 sm:p-10">

          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-warm-50">
              <Lock className="h-6 w-6 text-warm-700" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Ingreso institucional</h2>
            <p className="mt-2 text-sm text-gray-500">Acceso unificado por correo y contraseña.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu.correo@ronaldcare.demo"
                  className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-500 focus:outline-none focus:ring-2 focus:ring-warm-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-500 focus:outline-none focus:ring-2 focus:ring-warm-100"
                />
              </div>
            </div>

            {authError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {authError}
              </div>
            )}

            <button
              type="button"
              disabled={isSyncing}
              onClick={async () => {
                try {
                  const nextRole = await loginInternalUser(email, password)
                  const nextRoute = getDefaultRouteForRole(nextRole)
                  window.location.replace(nextRoute)
                } catch (error) {
                  console.error('[OperationalAccessPage] login error:', error)
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-warm-700 py-2.5 text-sm font-medium text-white transition hover:bg-warm-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Verificando...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Si no tienes credenciales, contacta a Dirección Ejecutiva.
          </p>
        </div>
      </div>
    </div>
  )
}