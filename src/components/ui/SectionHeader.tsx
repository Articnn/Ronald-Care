export function SectionHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
}) {
  return (
    <header className="space-y-1">
      {eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-warm-600">{eyebrow}</p> : null}
      <h1 className="text-3xl font-extrabold text-warm-900">{title}</h1>
      {subtitle ? <p className="max-w-3xl text-base text-warm-700">{subtitle}</p> : null}
    </header>
  )
}
