import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import { BANNED_WORDS } from '../../data/BannedWords'

const POSTIT_VARIANTS = [
  { bg: 'bg-yellow-100', rotate: '-rotate-1' },
  { bg: 'bg-orange-100', rotate: 'rotate-1' },
  { bg: 'bg-rose-50',    rotate: '-rotate-2' },
  { bg: 'bg-lime-100',   rotate: 'rotate-0' },
  { bg: 'bg-sky-100',    rotate: 'rotate-2' },
]

const TAPE_COLORS = [
  'bg-yellow-300/50',
  'bg-orange-200/60',
  'bg-rose-200/50',
  'bg-lime-200/60',
  'bg-sky-200/50',
]

export function FamilyCommunityPage() {
  const { communityPosts, createCommunityPost } = useAppState()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handlePublish() {
    const texto = message.trim()
    if (!texto) return

    const bloqueado = BANNED_WORDS.some((p) =>
      texto.toLowerCase().includes(p.toLowerCase())
    )

    if (bloqueado) {
      setError('Tu consejo contiene lenguaje no permitido. Por favor, mantengamos un ambiente de respeto.')
      return
    }

    createCommunityPost(texto)
    setMessage('')
    setError('')
  }

  const postsOrdenados = [...communityPosts].reverse()

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Comunidad"
        subtitle="¡Ayudar a otros es ayudarte a ti mismo! Comparte tips, mensajes de ánimo o experiencias que puedan servir a otras familias en la casa."
      />

      <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5 shadow-sm space-y-3">
        <p className="text-sm font-bold uppercase tracking-widest text-amber-700">Tu mensaje al mural</p>
        <textarea
          className="w-full resize-none rounded-xl border border-amber-200 bg-white/70 px-4 py-3 text-base text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          rows={3}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            if (error) setError('')
          }}
          placeholder="Ejemplo: llevar horarios anotados nos ayudó bastante..."
        />

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <Button onClick={handlePublish} disabled={!message.trim()}>
          Publicar en comunidad
        </Button>
      </div>

      {postsOrdenados.length === 0 ? (
        <p className="text-center text-warm-500 py-8">Sé el primero en dejar un mensaje en el mural.</p>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 gap-4">
          {postsOrdenados.map((post, index) => {
            const variant = POSTIT_VARIANTS[index % POSTIT_VARIANTS.length]
            const tape = TAPE_COLORS[index % TAPE_COLORS.length]

            return (
              <div
                key={post.id}
                className={`break-inside-avoid mb-4 rounded-sm shadow-md transition-transform duration-200 hover:rotate-0 hover:scale-105 hover:shadow-lg ${variant.bg} ${variant.rotate}`}
              >
                <div className={`h-2 w-16 mx-auto -mt-1 rounded-b-sm ${tape} opacity-80`} />

                <div className="p-4 space-y-2">
                  <p className="text-sm font-bold uppercase tracking-wider text-warm-600">{post.authorAlias}</p>
                  <p className="text-base text-warm-900 leading-snug">{post.message}</p>
                  <p className="text-xs text-warm-400">{new Date(post.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
