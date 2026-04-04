import type { ReactNode } from 'react'
import { Card } from './Card'

export function MetricCard({
  title,
  value,
  caption,
  icon,
}: {
  title: string
  value: string
  caption: string
  icon?: ReactNode
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2 text-warm-800">
        {icon}
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <p className="text-3xl font-extrabold text-warm-900">{value}</p>
      <p className="text-sm text-warm-600">{caption}</p>
    </Card>
  )
}
