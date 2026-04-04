import { HandHeart, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useAppState } from '../context/AppContext'

export function ProfileSelectorPage() {
  const { site, donorImpactBySite } = useAppState()
  const selectedMetric = donorImpactBySite[0]

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="No clinico"
        title="Transparencia pública por sede"
        subtitle="Selecciona una sede desde el header para ver solo el impacto agregado de esa Casa. Sin diagnósticos, expedientes ni información clínica."
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4">
          <div className="flex items-center gap-3 text-warm-800">
            <HandHeart className="h-8 w-8" />
            <h2 className="text-2xl font-bold text-warm-900">Donantes y transparencia</h2>
          </div>
          <p className="text-lg text-warm-700">
            Estás viendo la información pública de <span className="font-bold">{site}</span>. Todo el bloque público se filtra por la sede seleccionada en el header.
          </p>

          {selectedMetric ? (
            <div className="rounded-[28px] bg-warm-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-warm-600">Total de familias ayudadas en esta sede</p>
              <p className="mt-3 text-5xl font-extrabold text-warm-900">{selectedMetric.familiesSupported}</p>
              <p className="mt-2 text-warm-700">Impacto agregado visible para la sede seleccionada.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">
              No hay datos públicos cargados para esta sede todavía.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link to="/donor/home">
              <Button>Ver transparencia completa</Button>
            </Link>
            <Link to="/donor/donate">
              <Button variant="secondary">Ir a donar</Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3 text-warm-800">
            <LockKeyhole className="h-8 w-8" />
            <h2 className="text-2xl font-bold text-warm-900">Cómo se entra a la app</h2>
          </div>
          <div className="space-y-3 text-warm-700">
            <p><span className="font-bold text-warm-900">Hospital, admin, staff y voluntariado:</span> entran por login interno.</p>
            <p><span className="font-bold text-warm-900">Familias:</span> entran con QR + PIN o son atendidas por staff desde ayuda asistida.</p>
            <p><span className="font-bold text-warm-900">Donantes:</span> ven transparencia pública sin login.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/login">
              <Button>Ir a login</Button>
            </Link>
            <Link to="/family/login">
              <Button variant="ghost">Entrar como familia</Button>
            </Link>
          </div>
        </Card>
      </div>

    </div>
  )
}
