import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

const SITE_IMAGES: Record<string, string> = {
  'Casa Ronald McDonald Ciudad de Mexico': '/public/images/casa-cdmx.webp',
  'Casa Ronald McDonald Puebla': '/public/images/casa-puebla.jpg',
  'Casa Ronald McDonald Tlalnepantla': '/public/images/casa-tlalnepantla.jpg',
}

export function DonorHomePage() {
  const { donorImpactBySite } = useAppState()

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Impacto agregado por sede"
        subtitle="Latidos reales como metas operativas del dia."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {donorImpactBySite.map((item) => (
          <div
            key={item.name}
            className="group overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
          >
            <div className="relative h-48 overflow-hidden bg-warm-100">
              <img
                src={SITE_IMAGES[item.name] ?? '/public/images/image-9.png'}
                alt={item.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

          <div className="space-y-2 p-6">
            <h2 className="text-xl font-bold text-warm-900">{item.name}</h2>
            <p className="text-3xl font-extrabold text-warm-800">{item.familiesSupported}</p>
            <p className="text-warm-700">Familias atendidas</p>
          </div>
          </div>
        ))}
      </div>
    </div>
  )
}
