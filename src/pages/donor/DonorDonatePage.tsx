import { ExternalLink } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'

export function DonorDonatePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionHeader title="Donar" subtitle="Realiza tu donación en la página oficial de RonaldCare. ¡Cualquier ayuda es bienvenida!" />
      <Card className="space-y-4">
        <a
          href="https://fundacionronaldmcdonaldmx.org"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl bg-warm-700 px-5 py-3 text-lg font-bold text-white"
        >
          Ir a página de donación oficial
          <ExternalLink className="h-5 w-5" />
        </a>
      </Card>
    </div>
  )
}
