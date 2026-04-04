import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function FamilyGuidePage() {
  const { guideSteps } = useAppState()

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Guia Express"
        subtitle="Orientacion no clinica para ubicacion, apoyos y consulta rapida durante la estancia."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {guideSteps.map((step, index) => (
          <Card key={step.id} className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-warm-600">Paso {index + 1}</p>
            <h2 className="text-xl font-bold text-warm-900">{step.title}</h2>
            <p className="text-warm-700">{step.detail}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
