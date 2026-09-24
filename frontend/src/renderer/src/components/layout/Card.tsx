import { JSX, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps): JSX.Element {
  return (
    <div
      className={`bg-[var(--card-bg)] rounded-[var(--radius-bento)] shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-[var(--card-border)] transition-all duration-300 ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
