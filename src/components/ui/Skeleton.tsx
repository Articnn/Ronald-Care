type SkeletonVariant = 'text' | 'card' | 'avatar' | 'rect'

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  card: 'h-32 w-full rounded-2xl',
  avatar: 'h-10 w-10 rounded-full',
  rect: 'h-20 w-full rounded-xl',
}

export function Skeleton({
  className = '',
  variant = 'text',
}: {
  className?: string
  variant?: SkeletonVariant
}) {
  return (
    <div
      className={`animate-pulse bg-warm-200 ${variantClasses[variant]} ${className}`}
    />
  )
}
