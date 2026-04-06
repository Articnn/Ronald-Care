import { useState, useEffect } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import { getEvents } from '../../lib/api'
import type { DonorEvent } from '../../lib/api'

const CURRENT_YEAR = new Date().getFullYear()
const PLACEHOLDER_IMAGE = '/public/images/image-9.png'

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

function EventCard({ event }: { event: DonorEvent }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <article className="overflow-hidden rounded-[28px] bg-white shadow-soft">
      <div className="relative h-48 bg-warm-100">
        <img
          src={event.image_url || PLACEHOLDER_IMAGE}
          alt={event.event_title}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      <div className="space-y-2 p-5">
        <span className="inline-block rounded-full bg-[#950606] px-3 py-1 text-xs font-semibold text-white">
          {event.site}
        </span>
        <h2 className="text-xl font-bold text-warm-900">{event.event_title}</h2>
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

function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-soft animate-pulse">
      <div className="h-48 bg-warm-100" />
      <div className="space-y-2 p-5">
        <div className="h-5 w-1/3 rounded-full bg-warm-100" />
        <div className="h-5 w-2/3 rounded bg-warm-100" />
        <div className="h-3 w-full rounded bg-warm-100" />
        <div className="h-3 w-4/5 rounded bg-warm-100" />
        <div className="h-3 w-1/2 rounded bg-warm-100" />
      </div>
    </div>
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
        No hay eventos programados para {site} en {CURRENT_YEAR}.
      </p>
    </div>
  )
}

function EventsErrorState() {
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
      <p className="mt-4 text-base font-semibold text-warm-700">No pudimos cargar los eventos</p>
      <p className="mt-1 text-sm text-warm-500">
        No pudimos cargar la información en este momento. Intenta de nuevo más tarde.
      </p>
    </div>
  )
}

export function DonorImpactPage() {
  const { site } = useAppState()
  const [events, setEvents] = useState<DonorEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    getEvents()
      .then(setEvents)
      .catch(() => setError('error'))
      .finally(() => setIsLoading(false))
  }, [])

  const filteredEvents = events.filter((e) => site === 'Todas' || e.site === site)

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Próximos Eventos"
        subtitle="Sé parte del cambio. Participa en nuestros eventos y ayuda a más familias que necesitan apoyo durante momentos difíciles."
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      )}

      {!isLoading && error && <EventsErrorState />}

      {!isLoading && !error && filteredEvents.length === 0 && (
        <EventsEmptyState site={site} />
      )}

      {!isLoading && !error && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
