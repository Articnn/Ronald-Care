import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] bg-white p-6 shadow-soft ${className}`}>{children}</section>
}
