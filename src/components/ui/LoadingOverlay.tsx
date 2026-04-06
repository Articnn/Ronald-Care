import { Spinner } from './Spinner'

export function LoadingOverlay({
  message = 'Cargando...',
  className = '',
}: {
  message?: string
  className?: string
}) {
  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/70 backdrop-blur-sm ${className}`}
    >
      <Spinner size="lg" className="text-warm-700" />
      <p className="text-lg font-semibold text-warm-700">{message}</p>
    </div>
  )
}
