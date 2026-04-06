import { useState, useEffect } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Tabs } from '../../components/ui/Tabs'
import { useAppState } from '../../context/AppContext'
import { getGallery } from '../../lib/api'
import type { GalleryImage } from '../../lib/api'

function ImageCard({ image }: { image: GalleryImage }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-soft">
      <div className="relative h-48 bg-warm-100">
        <img
          src={image.image_url}
          alt={image.impact_title}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      <div className="space-y-2 p-5">
        <h3 className="font-bold text-warm-900">{image.impact_title}</h3>
        <p className="text-sm leading-relaxed text-warm-700">{image.description}</p>
      </div>
    </div>
  )
}

function ImageCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-soft animate-pulse">
      <div className="h-48 bg-warm-100" />
      <div className="space-y-2 p-5">
        <div className="h-4 w-2/3 rounded bg-warm-100" />
        <div className="h-3 w-full rounded bg-warm-100" />
        <div className="h-3 w-4/5 rounded bg-warm-100" />
      </div>
    </div>
  )
}

function GalleryEmptyState({ site }: { site: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] bg-warm-50 py-16 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-warm-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3l18 18M9.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
      <p className="mt-4 text-base font-semibold text-warm-700">Sin fotos para esta sede</p>
      <p className="mt-1 text-sm text-warm-500">
        No hay imágenes registradas para {site} en este mes.
      </p>
    </div>
  )
}

function GalleryErrorState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] bg-warm-50 py-16 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-warm-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <p className="mt-4 text-base font-semibold text-warm-700">No pudimos cargar la galería</p>
      <p className="mt-1 text-sm text-warm-500">
        No pudimos cargar la información en este momento. Intenta de nuevo más tarde.
      </p>
    </div>
  )
}

export function DonorGalleryPage() {
  const { site } = useAppState()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMonth, setActiveMonth] = useState<string>('')

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    getGallery()
      .then((data) => {
        setImages(data)
        if (data.length > 0) {
          setActiveMonth(data[0].month)
        }
      })
      .catch(() => setError('error'))
      .finally(() => setIsLoading(false))
  }, [])

  const monthNames = [...new Set(images.map((img) => img.month))]
  const isCurrentMonth = monthNames.length > 0 && activeMonth === monthNames[0]

  const filteredImages = images.filter(
    (img) => img.month === activeMonth && (site === 'Todas' || img.site === site),
  )

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Galería de Impacto"
        subtitle="Actualizaciones mensuales que muestran el beneficio directo de Casas Ronald McDonald en la vida de las familias."
      />

      {!isLoading && !error && monthNames.length > 0 && (
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

      {!isLoading && !error && activeMonth && (
        <div className="border-l-4 border-[#950606] pl-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#950606]">Actualización mensual</p>
          <h2 className="text-2xl font-extrabold text-warm-900">{activeMonth}</h2>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ImageCardSkeleton />
          <ImageCardSkeleton />
          <ImageCardSkeleton />
        </div>
      )}

      {!isLoading && error && <GalleryErrorState />}

      {!isLoading && !error && filteredImages.length === 0 && (
        <GalleryEmptyState site={site} />
      )}

      {!isLoading && !error && filteredImages.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredImages.map((image) => (
            <ImageCard key={image.id} image={image} />
          ))}
        </div>
      )}
    </div>
  )
}
