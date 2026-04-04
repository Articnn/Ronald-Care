import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function StaffVolunteersPage() {
  const { volunteerShifts } = useAppState()

  return (
    <div className="space-y-5">
      <SectionHeader title="Scheduler lite" subtitle="Turnos y disponibilidad por rol y dia." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {volunteerShifts.map((shift) => (
          <Card key={shift.id} className="space-y-2">
            <h2 className="text-xl font-bold text-warm-900">{shift.volunteerName}</h2>
            <p className="text-warm-700">{shift.role} · {shift.day}</p>
            <p className="text-sm font-semibold text-warm-600">{shift.kind} · {shift.hours} hrs registradas</p>
            <p className="rounded-full bg-warm-50 px-3 py-1 text-sm font-bold text-warm-800">{shift.availability}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
