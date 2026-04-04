import { useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Tabs } from '../../components/ui/Tabs'
import { useAppState } from '../../context/AppContext'

type EventSite =
  | 'Casa Ronald McDonald Ciudad de Mexico'
  | 'Casa Ronald McDonald Puebla'
  | 'Casa Ronald McDonald Tlalnepantla'

interface GalleryImage {
  id: string
  image_url: string
  title: string
  description: string
  site: EventSite
}

interface GalleryMonth {
  id: string
  month_name: string
  images: GalleryImage[]
}

export const GALLERY_MONTHS: GalleryMonth[] = [
  {
    id: 'abril-2026',
    month_name: 'Abril 2026',
    images: [
      {
        id: 'abr-1',
        image_url: '/public/images/image-11.jpg',
        title: 'Traslado médico a tiempo',
        description:
          'Gracias a la coordinación del equipo de transporte, una familia llegó puntual a la cita de quimioterapia de su hija. Cada minuto cuenta cuando se trata de un tratamiento oncológico.',
        site: 'Casa Ronald McDonald Ciudad de Mexico',
      },
      {
        id: 'abr-2',
        image_url: '/public/images/image-10.webp',
        title: 'Kit de bienvenida entregado',
        description:
          'Al ingresar, cada familia recibe un kit con artículos de higiene y cobijas. Este mes se distribuyeron 18 kits completos, asegurando que ninguna familia pasara su primera noche sin lo esencial.',
        site: 'Casa Ronald McDonald Puebla',
      },
      {
        id: 'abr-3',
        image_url: '/public/images/image-12.jpg',
        title: 'Acompañamiento nocturno',
        description:
          'Voluntarios cubrieron turnos nocturnos para acompañar a cuidadores con largas esperas en urgencias del hospital vecino. Presencia humana cuando más se necesita.',
        site: 'Casa Ronald McDonald Tlalnepantla',
      },
    ],
  },
  {
    id: 'marzo-2026',
    month_name: 'Marzo 2026',
    images: [
      {
        id: 'mar-1',
        image_url: '/public/images/image-8.webp',
        title: 'Habitación lista en 30 minutos',
        description:
          'El nuevo protocolo de check-in redujo el tiempo de espera de habitación de 90 a 30 minutos. Una madre que viajó seis horas pudo descansar casi de inmediato al llegar.',
        site: 'Casa Ronald McDonald Ciudad de Mexico',
      },
      {
        id: 'mar-2',
        image_url: '/public/images/image-7.avif',
        title: 'Brigada de voluntarios escolares',
        description:
          'Un grupo de 24 estudiantes universitarios realizaron actividades recreativas con los hermanos de pacientes. El juego y la normalidad son parte esencial de la recuperación.',
        site: 'Casa Ronald McDonald Puebla',
      },
      {
        id: 'mar-3',
        image_url: '/public/images/image-6.webp',
        title: 'Donación de alimentos frescos',
        description:
          'En alianza con un banco de alimentos local, se distribuyeron despensas frescas a 14 familias. Reducir la carga económica del cuidador es reducir su estrés.',
        site: 'Casa Ronald McDonald Tlalnepantla',
      },
    ],
  },
  {
    id: 'febrero-2026',
    month_name: 'Febrero 2026',
    images: [
      {
        id: 'feb-1',
        image_url: '/public/images/image-3.webp',
        title: 'Primera noche segura',
        description:
          'Una familia de Oaxaca llegó sin recursos y sin conocer la ciudad. El equipo de recepción gestionó alojamiento, cena y orientación completa en menos de dos horas.',
        site: 'Casa Ronald McDonald Ciudad de Mexico',
      },
      {
        id: 'log-2',
        image_url: '/public/images/image-13.webp',
        title: 'Sistema de despacho agilizado',
        description:
          'El nuevo módulo digital de inventarios permitió que el equipo de almacén procesara 11 rutas de distribución en una sola jornada, optimizando los tiempos de entrega.',
        site: 'Casa Ronald McDonald Puebla',
      },
      {
        id: 'feb-3',
        image_url: '/public/images/image-4.avif',
        title: 'Transporte coordinado AM/PM',
        description:
          'Los turnos matutino y vespertino garantizaron que ninguna familia faltara a sus citas. En febrero se completaron 38 traslados sin cancelaciones.',
        site: 'Casa Ronald McDonald Tlalnepantla',
      },
    ],
  },
  {
    id: 'enero-2026',
    month_name: 'Enero 2026',
    images: [
      {
        id: 'ene-1',
        image_url: '/public/images/image-2.webp',
        title: 'Apertura del año con plena capacidad',
        description:
          'Enero inició con las tres sedes operando al 100% de su capacidad. El equipo administrativo garantizó transiciones sin interrupciones tras el cierre de fin de año.',
        site: 'Casa Ronald McDonald Ciudad de Mexico',
      },
      {
        id: 'ene-2',
        image_url: '/public/images/image-5.jpg',
        title: 'Inventario repuesto al 100%',
        description:
          'El conteo físico confirmó que todos los artículos críticos (kits, cobijas, higiene) estaban al nivel óptimo. Cero desabasto para las familias durante el mes.',
        site: 'Casa Ronald McDonald Puebla',
      },
      {
        id: 'ene-3',
        image_url: '/public/images/image-1.jpg',
        title: 'Familia despedida con éxito',
        description:
          'Tras cuatro meses de estancia, la familia Hernández completó el tratamiento de su hijo y regresó a Veracruz. Su pase de retorno fue tramitado en tiempo y forma.',
        site: 'Casa Ronald McDonald Tlalnepantla',
      },
    ],
  },
]

const MONTH_NAMES = GALLERY_MONTHS.map((m) => m.month_name)

function ImageCard({ image }: { image: GalleryImage }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-soft">
      <div className="relative h-48 bg-warm-100">
        <img
          src={image.image_url}
          alt={image.title}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      <div className="space-y-2 p-5">
        <h3 className="font-bold text-warm-900">{image.title}</h3>
        <p className="text-sm leading-relaxed text-warm-700">{image.description}</p>
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

export function DonorGalleryPage() {
  const [activeMonth, setActiveMonth] = useState(MONTH_NAMES[0])
  const { site } = useAppState()

  const activeData = GALLERY_MONTHS.find((m) => m.month_name === activeMonth) ?? GALLERY_MONTHS[0]
  const isCurrentMonth = activeMonth === MONTH_NAMES[0]

  const filteredImages =
    site === 'Todas' ? activeData.images : activeData.images.filter((img) => img.site === site)

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Galería de Impacto"
        subtitle="Actualizaciones mensuales que muestran el beneficio directo de Casas Ronald McDonald en la vida de las familias."
      />

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
          <Tabs items={MONTH_NAMES} activeItem={activeMonth} onChange={setActiveMonth} />
        </div>
      </div>

      <div className="border-l-4 border-[#950606] pl-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#950606]">Actualización mensual</p>
        <h2 className="text-2xl font-extrabold text-warm-900">{activeData.month_name}</h2>
      </div>

      {filteredImages.length === 0 ? (
        <GalleryEmptyState site={site} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredImages.map((image) => (
            <ImageCard key={image.id} image={image} />
          ))}
        </div>
      )}
    </div>
  )
}
