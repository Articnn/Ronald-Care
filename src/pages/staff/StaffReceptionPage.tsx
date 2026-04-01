import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function StaffReceptionPage() {
  const { referrals } = useAppState()
  const navigate = useNavigate()
  const accepted = referrals.filter((item) => item.status === 'Aceptada')

  return (
    <div className="space-y-6">
      <SectionHeader title="Recepcion" subtitle="Escaneo QR o captura de ticket para iniciar check-in." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-xl font-bold text-warm-900">Escaneo rapido</h2>
          <p className="text-warm-700">Demo visual: se detecta automaticamente la referencia aceptada mas reciente.</p>
          {accepted[0] ? (
            <Button onClick={() => navigate(`/staff/checkin/${accepted[0].id}`)}>Abrir {accepted[0].id}</Button>
          ) : (
            <p className="text-warm-600">No hay referencias aceptadas por ahora.</p>
          )}
        </Card>
        <Card className="space-y-4">
          <Input label="Codigo de referencia o ticket" placeholder="ref-1001 / TKT-3481" />
          <Button variant="secondary" onClick={() => accepted[0] && navigate(`/staff/checkin/${accepted[0].id}`)}>
            Buscar
          </Button>
        </Card>
      </div>
      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Ingresos esperados</h2>
        {accepted.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
            <p className="font-semibold text-warm-800">{item.id} · {item.site} · llegada {item.arrivalDate}</p>
            <Link className="rounded-xl bg-white px-4 py-2 font-semibold text-warm-700" to={`/staff/checkin/${item.id}`}>
              Iniciar check-in
            </Link>
          </div>
        ))}
      </Card>
    </div>
  )
}
