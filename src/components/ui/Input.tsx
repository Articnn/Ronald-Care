import type { InputHTMLAttributes } from 'react'

export function Input({
  label,
  id,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
}) {
  const safeId = id || label.toLowerCase().replace(/\s+/g, '-')

  return (
    <label htmlFor={safeId} className="block space-y-2">
      <span className="text-base font-semibold text-warm-900">{label}</span>
      <input
        id={safeId}
        className={`w-full rounded-2xl border border-warm-200 bg-white px-4 py-3 text-lg text-warm-900 placeholder:text-warm-400 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100 ${className}`}
        {...props}
      />
    </label>
  )
}
