import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

const breathingSteps = [
  'Inhala suave durante 4 segundos.',
  'Sostiene 4 segundos.',
  'Exhala lentamente durante 4 segundos.',
]

const moods = [
  { emoji: '😔', label: 'Difícil' },
  { emoji: '😐', label: 'Regular' },
  { emoji: '🙂', label: 'Bien' },
  { emoji: '😌', label: 'Tranquilo' },
  { emoji: '🌟', label: 'Genial' },
]

export function FamilyPausePage() {
  const { supportMessages } = useAppState()
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<{ step: number; cycle: number }>({ step: 0, cycle: 1 })
  const [filling, setFilling] = useState(false)
  const [mood, setMood] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return

    setFilling(false)

    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setFilling(true))
    )

    const timer = setTimeout(() => {
      setFilling(false)
      setPhase((prev) => {
        const next = prev.step + 1
        if (next > 2) {
          if (prev.cycle >= 3) {
            setActive(false)
            return { step: 0, cycle: 1 }
          }
          return { step: 0, cycle: prev.cycle + 1 }
        }
        return { step: next, cycle: prev.cycle }
      })
    }, 4000)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [active, phase.step, phase.cycle])

  function handleReset() {
    setActive(false)
    setFilling(false)
    setPhase({ step: 0, cycle: 1 })
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Pausa 60s"
        subtitle="Microespacio de autocuidado no terapeutico para bajar incertidumbre y volver al flujo del dia."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.4fr_1fr]">

        <div className="order-2 space-y-4 lg:order-1">
          {supportMessages[0] && (
            <Card className="space-y-2">
              <h2 className="text-xl font-bold text-warm-900">{supportMessages[0].title}</h2>
              <p className="text-warm-700">{supportMessages[0].body}</p>
              <blockquote className="border-l-2 border-warm-200 pl-3 text-xs italic text-warm-500">
                "Sentirse apoyado es el primer paso para sanar."
              </blockquote>
            </Card>
          )}

          <Card className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-warm-400">
              ¿Cómo te sientes ahora?
            </p>
            <div className="flex justify-between gap-1">
              {moods.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => setMood(emoji)}
                  className={`flex flex-1 flex-col items-center rounded-xl py-2 text-xl transition-all duration-150 ${
                    mood === emoji
                      ? 'bg-warm-100 ring-2 ring-warm-300'
                      : 'opacity-60 hover:bg-warm-50 hover:opacity-100'
                  }`}
                >
                  {emoji}
                  <span className="mt-1 text-[10px] text-warm-500">{label}</span>
                </button>
              ))}
            </div>
            {mood && (
              <p className="text-center text-xs text-warm-500">Registrado: {mood}</p>
            )}
          </Card>
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          <Card className="space-y-4">
            <p className="text-lg text-warm-800">
              {active
                ? 'Sigue el ciclo con calma. No necesitas hacerlo perfecto.'
                : 'Cuando lo necesites, inicia una pausa breve guiada.'}
            </p>
            <Button
              variant={active ? 'secondary' : 'primary'}
              onClick={active ? handleReset : () => setActive(true)}
            >
              {active ? 'Reiniciar pausa' : 'Iniciar pausa'}
            </Button>

            <div className="grid gap-3">
              {breathingSteps.map((step, i) => (
                <div key={step} className="relative overflow-hidden rounded-2xl bg-gold-100 p-4 text-warm-900">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-2xl transition-[width] ease-linear ${
                      active && filling && phase.step === i
                        ? 'w-full bg-gold-300/60 duration-[4000ms]'
                        : active && phase.step > i
                        ? 'w-full bg-gold-200/40 duration-0'
                        : 'w-0 duration-0'
                    }`}
                  />
                  <span className="relative z-10">{step}</span>
                </div>
              ))}

              {active ? (
                <p className="text-center text-sm font-medium text-warm-500">
                  Ciclo {phase.cycle} de 3
                </p>
              ) : (
                <div className="rounded-2xl bg-gold-100 p-4 text-warm-900">
                  Repite el ciclo 3 veces.
                </div>
              )}
            </div>
          </Card>
        </div>

        {supportMessages[1] && (
          <Card className="order-3 space-y-2">
            <h2 className="text-xl font-bold text-warm-900">{supportMessages[1].title}</h2>
            <p className="text-warm-700">{supportMessages[1].body}</p>

            <div className="mt-3 space-y-2">
              <details className="group rounded-2xl border border-warm-100 bg-warm-50">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-warm-800 [&::-webkit-details-marker]:hidden">
                  ¿Qué hago si la pausa no es suficiente?
                  <ChevronDown className="h-4 w-4 shrink-0 text-warm-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-3 text-xs text-warm-600">
                  Si sientes que necesitas hablar con alguien ahora mismo, acude a recepción o usa el botón de "Solicitar apoyo" en el menú principal.                </p>
              </details>

              <details className="group rounded-2xl border border-warm-100 bg-warm-50">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-warm-800 [&::-webkit-details-marker]:hidden">
                  ¿Dónde está recepción?
                  <ChevronDown className="h-4 w-4 shrink-0 text-warm-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-3 text-xs text-warm-600">
                  Recepción está en la planta baja, a la entrada principal del edificio, abierta las 24 horas.
                </p>
              </details>
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
