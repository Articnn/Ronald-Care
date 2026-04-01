import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function DonorImpactPage() {
  const { impactFeed } = useAppState()

  return (
    <div className="space-y-5">
      <SectionHeader title="Feed de impacto" subtitle="Eventos agregados del sistema, sin informacion personal identificable." />
      <div className="grid gap-4">
        {impactFeed.map((item) => (
          <Card key={item.id} className="space-y-2 border-l-4 border-warm-700">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-warm-600">{item.site}</p>
            <h2 className="text-xl font-bold text-warm-900">{item.title}</h2>
            <p className="text-warm-700">{item.detail}</p>
            <p className="text-sm text-warm-500">{new Date(item.createdAt).toLocaleString()}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
