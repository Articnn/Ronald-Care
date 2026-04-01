import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function FamilyCommunityPage() {
  const { communityPosts, createCommunityPost } = useAppState()
  const [message, setMessage] = useState('')

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Comunidad moderada"
        subtitle="Tips y acompanamiento general entre familias. Sin temas medicos y con moderacion."
      />
      <Card className="space-y-4">
        <Input
          label="Comparte un tip o mensaje"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ejemplo: llevar horarios anotados nos ayudo bastante."
        />
        <Button
          onClick={() => {
            if (!message.trim()) return
            createCommunityPost(message.trim())
            setMessage('')
          }}
        >
          Publicar en comunidad
        </Button>
      </Card>
      <div className="grid gap-4">
        {communityPosts.map((post) => (
          <Card key={post.id} className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-warm-600">{post.authorAlias}</p>
            <p className="text-lg text-warm-800">{post.message}</p>
            <p className="text-sm text-warm-500">{new Date(post.createdAt).toLocaleString()}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
