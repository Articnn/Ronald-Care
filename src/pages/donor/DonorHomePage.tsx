import { useMemo, useState, useEffect } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Tabs } from '../../components/ui/Tabs'
import { useAppState } from '../../context/AppContext'
import { UPCOMING_EVENTS } from './DonorImpactPage'
import { getGallery } from '../../lib/api'
import type { GalleryImage } from '../../lib/api'

const SITE_IMAGES: Record<string, string> = {
  'Casa Ronald McDonald Ciudad de Mexico': '/public/images/casa-cdmx.webp',
  'Casa Ronald McDonald Puebla': '/public/images/casa-puebla.jpg',
  'Casa Ronald McDonald Tlalnepantla': '/public/images/casa-tlalnepantla.jpg',
}

const tabs = ['Impacto por sede', 'Galería de impacto', 'Próximos eventos'] as const

export function DonorHomePage() {
  const { donorImpactBySite, site } = useAppState()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Impacto por sede')
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [activeMonth, setActiveMonth] = useState('')

  useEffect(() => {
    getGallery()
      .then((data) => {
        setGalleryImages(data)
        if (data.length > 0) setActiveMonth(data[0].month)
      })
      .catch(() => setGalleryImages([]))
  }, [])

  const impactItems = donorImpactBySite.filter((item) => item.name === site)
  const monthNames = useMemo(() => [...new Set(galleryImages.map((img) => img.month))], [galleryImages])
  const isCurrentMonth = monthNames.length > 0 && activeMonth === monthNames[0]
  const galleryPreview = useMemo(
    () => galleryImages.filter((img) => img.month === activeMonth && img.site === site),
    [galleryImages, activeMonth, site],
  )
  const eventsPreview = useMemo(() => UPCOMING_EVENTS.filter((item) => item.site === site), [site])

  return (
    <div className="space-y-6">
      <SectionHeader title="Ver transparencia completa" subtitle={`Vista pública filtrada para ${site}.`} />

      <Tabs items={tabs} activeItem={activeTab} onChange={setActiveTab} />

      {activeTab === 'Impacto por sede' ? (
        <div className="grid gap-6 md:grid-cols-3">
          {impactItems.map((item) => (
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
      ) : null}

      {activeTab === 'Galería de impacto' ? (
        <div className="space-y-4">
          {monthNames.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {isCurrentMonth ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#950606] px-3 py-1 text-sm font-semibold text-white">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  Mes actual
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warm-100 px-3 py-1 text-sm font-semibold text-warm-700">
                  Historial
                </span>
              )}
              <div className="overflow-x-auto pb-1">
                <Tabs items={monthNames} activeItem={activeMonth} onChange={setActiveMonth} />
              </div>
            </div>
          )}

          {activeMonth && (
            <div className="border-l-4 border-[#950606] pl-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#950606]">Actualización mensual</p>
              <h2 className="text-2xl font-extrabold text-warm-900">{activeMonth}</h2>
            </div>
          )}

          {galleryPreview.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {galleryPreview.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-[28px] bg-white shadow-soft">
                  <div className="h-48 bg-warm-100">
                    <img src={image.image_url} alt={image.impact_title} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-2 p-5">
                    <h3 className="font-bold text-warm-900">{image.impact_title}</h3>
                    <p className="text-sm leading-relaxed text-warm-700">{image.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] bg-warm-50 p-6 text-warm-700">
              No hay imágenes registradas para esta sede en la actualización actual.
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'Próximos eventos' ? (
        <div className="space-y-4">
          {eventsPreview.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {eventsPreview.map((event) => (
                <article key={event.id} className="overflow-hidden rounded-[28px] bg-white shadow-soft">
                  <div className="relative h-48 bg-warm-100">
                    <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-2 p-5">
                    <span className="inline-block rounded-full bg-[#950606] px-3 py-1 text-xs font-semibold text-white">
                      {event.site}
                    </span>
                    <h3 className="text-xl font-bold text-warm-900">{event.title}</h3>
                    <p className="text-sm text-warm-700">{event.description}</p>
                    <p className="text-sm font-semibold text-warm-600">
                      {new Date(event.date).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] bg-warm-50 p-6 text-warm-700">
              No hay eventos registrados para esta sede en este momento.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
