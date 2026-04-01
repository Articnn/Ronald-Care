import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function DonorGalleryPage() {
  const { donorStories } = useAppState()

  return (
    <div className="space-y-5">
      <SectionHeader title="Galeria e historias" subtitle="Imagenes placeholder e historias anonimas." />
      <div className="grid gap-4 md:grid-cols-2">
        {donorStories.map((story) => (
          <Card key={story.id} className="overflow-hidden p-0">
            <img src={story.image} alt={story.title} className="h-56 w-full object-cover" />
            <div className="space-y-2 p-6">
              <h2 className="text-xl font-bold text-warm-900">{story.title}</h2>
              <p className="text-warm-700">{story.summary}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
