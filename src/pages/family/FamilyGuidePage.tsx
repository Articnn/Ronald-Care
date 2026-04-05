import { Link } from 'react-router-dom'
import { MapPin, HeartHandshake, Sparkles, PersonStandingIcon, User2Icon, FileUserIcon, BirdIcon } from 'lucide-react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import type { LucideIcon } from 'lucide-react'

const BRAND = '#950606'

interface StepMeta {
  icon: LucideIcon
  ctaLabel: string
  ctaTo: string
}

const STEP_META: StepMeta[] = [
  { icon: MapPin, ctaLabel: 'Conocer mi Estatus', ctaTo: '/family/status' },
  { icon: HeartHandshake, ctaLabel: 'Ir a solicitar apoyo', ctaTo: '/family/request' },
  { icon: BirdIcon, ctaLabel: 'Realizar una pausa', ctaTo: '/family/pause' },
  { icon: FileUserIcon, ctaLabel: 'Solicitar permiso', ctaTo: '/family/return-pass' },
  { icon: PersonStandingIcon, ctaLabel: 'Conectar con la comunidad', ctaTo: '/family/community' },
  { icon: User2Icon, ctaLabel: 'Ir a tu perfil', ctaTo: '/account' },
]

export function FamilyGuidePage() {
  const { guideSteps } = useAppState()

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Guía Express"
      />

      <div className="flex items-start gap-3 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3.5">
        <Sparkles className="mt-0.5 w-5 h-5 shrink-0" style={{ color: BRAND }} />
        <p className="text-sm font-medium text-warm-800 leading-snug">
          ¡Bienvenidos! Conoce un poco de las funcionalidades disponibles.
        </p>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-3 md:gap-4">
        {guideSteps.map((step, index) => {
          const meta = STEP_META[index]
          if (!meta) return null
          const Icon = meta.icon
          const isLast = index === guideSteps.length - 1

          return (
            <div key={step.id} className="flex flex-col md:block">
              <div className="bg-white/80 border border-orange-100 rounded-2xl p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg"
                    style={{ backgroundColor: BRAND }}
                  >
                    {index + 1}
                  </div>
                  <Icon className="w-7 h-7" style={{ color: BRAND }} />
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-warm-900">{step.title}</h2>
                  <p className="text-sm text-warm-700 leading-relaxed">{step.detail}</p>
                </div>

                <Link
                  to={meta.ctaTo}
                  className="flex items-center justify-center w-full py-3 px-4 rounded-xl text-white text-base font-semibold transition-opacity active:opacity-80"
                  style={{ backgroundColor: BRAND }}
                >
                  {meta.ctaLabel}
                </Link>
              </div>

              {!isLast && (
                <div className="flex justify-center md:hidden py-1">
                  <div className="w-0.5 h-6 bg-orange-200" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
