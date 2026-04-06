import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const stylesByVariant: Record<ButtonVariant, string> = {
  primary: 'bg-warm-700 text-white hover:bg-warm-800 focus-visible:ring-warm-300 shadow-soft',
  secondary: 'bg-gold-300 text-warm-900 hover:bg-gold-500 focus-visible:ring-gold-300 shadow-soft',
  ghost: 'border border-warm-200 bg-white text-warm-800 hover:bg-warm-50 focus-visible:ring-warm-200',
}

export function Button({
  variant = 'primary',
  fullWidth,
  isLoading = false,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  fullWidth?: boolean
  isLoading?: boolean
  children: ReactNode
}) {
  return (
    <button
      className={`rounded-2xl px-5 py-3 text-lg font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${stylesByVariant[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className="inline-flex items-center gap-2"><Spinner size="sm" /> Cargando...</span> : children}
    </button>
  )
}
