import { ExternalLink } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'

export function DonorDonatePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionHeader title="Donar" subtitle="La app no procesa pagos. Este boton abre el sitio oficial de donacion." />
      <Card className="space-y-4">
        <a
          href="https://example.org/donar-oficial"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl bg-warm-700 px-5 py-3 text-lg font-bold text-white"
        >
          Abrir donacion oficial
          <ExternalLink className="h-5 w-5" />
        </a>
        <p className="text-warm-700">Placeholder: reemplazar por la URL institucional real.</p>
      </Card>
    </div>
  )
}
