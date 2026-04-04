import { useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

type EventSite =
  | 'Casa Ronald McDonald Ciudad de Mexico'
  | 'Casa Ronald McDonald Puebla'
  | 'Casa Ronald McDonald Tlalnepantla'

interface UpcomingEvent {
  id: string
  title: string
  description: string
  site: EventSite
  date: string
  imageUrl: string
}

const UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    id: 'event-1',
    title: 'Cena Benéfica Primavera',
    description:
      'Una velada especial con cena de gala, subasta silenciosa y música en vivo para recaudar fondos que apoyan a las familias que se alojan en nuestra Casa.',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    date: '2026-05-10T19:00:00',
    imageUrl:
      'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80',
  },
  {
    id: 'event-2',
    title: 'Carrera Familiar por la Salud',
    description:
      'Únete a nuestra carrera de 5 km por las calles de Puebla. Todas las edades bienvenidas. Los fondos recaudados van directamente al programa de alimentación familiar.',
    site: 'Casa Ronald McDonald Puebla',
    date: '2026-06-14T08:00:00',
    imageUrl:
      'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=800&q=80',
  },
  {
    id: 'event-3',
    title: 'Bazar Solidario de Verano',
    description:
      'Un bazar lleno de artesanías, alimentos y actividades para toda la familia. Artesanos locales donan parte de sus ganancias para apoyar nuestra misión.',
    site: 'Casa Ronald McDonald Tlalnepantla',
    date: '2026-07-19T10:00:00',
    imageUrl:
      'https://images.unsplash.com/photo-1526285759904-71d1170ed2ac?w=800&q=80',
  },
  {
    id: 'event-4',
    title: 'Feria de Navidad Ronald',
    description:
      'Celebra la temporada navideña con nosotros: villancicos, posadas, actividades para niños y una colecta especial de juguetes y víveres para las familias en casa.',
    site: 'Casa Ronald McDonald Ciudad de Mexico',
    date: '2026-12-06T12:00:00',
    imageUrl:
      '/public/images/image-14.jpg',
  },
]

function formatEventDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatEventTime(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function EventCard({ event }: { event: UpcomingEvent }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <article className="overflow-hidden rounded-[28px] bg-white shadow-soft">
      <div className="relative h-48 bg-warm-100">
        <img
          src={event.imageUrl}
          alt={event.title}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      <div className="space-y-2 p-5">
        <span className="inline-block rounded-full bg-[#950606] px-3 py-1 text-xs font-semibold text-white">
          {event.site}
        </span>
        <h2 className="text-xl font-bold text-warm-900">{event.title}</h2>
        <p className="text-sm text-warm-700">{event.description}</p>
        <div className="flex items-center gap-1.5 pt-1 text-sm text-warm-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="capitalize">{formatEventDate(event.date)}</span>
          <span className="mx-1 text-warm-300">·</span>
          <span>{formatEventTime(event.date)}</span>
        </div>
      </div>
    </article>
  )
}

function EventsEmptyState({ site }: { site: string }) {
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
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
      <p className="mt-4 text-base font-semibold text-warm-700">Sin eventos para esta sede</p>
      <p className="mt-1 text-sm text-warm-500">
        No hay eventos próximos registrados para {site} en este momento.
      </p>
    </div>
  )
}

export function DonorImpactPage() {
  const { site } = useAppState()

  const filteredEvents =
    site === 'Todas' ? UPCOMING_EVENTS : UPCOMING_EVENTS.filter((e) => e.site === site)

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Próximos Eventos"
        subtitle="Sé parte del cambio. Participa en nuestros eventos y ayuda a más familias que necesitan apoyo durante momentos difíciles."
      />
      {filteredEvents.length === 0 ? (
        <EventsEmptyState site={site} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
