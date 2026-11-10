import { JSX } from 'react'
import { iconSrc } from '../data/icons'

interface IconProps {
  name?: string
  size?: number | string
  className?: string
  alt?: string
}

/**
 * Renders a bundled Icons8 Liquid Glass PNG. `name` accepts either a slug
 * (`sparkles`) or a locale reference (`icons/sparkles.png`).
 */
export function Icon({
  name,
  size = '1em',
  className = '',
  alt = ''
}: IconProps): JSX.Element | null {
  const src = iconSrc(name)
  if (!src) return null

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      aria-hidden={alt ? undefined : true}
      className={`inline-block shrink-0 object-contain align-[-0.125em] ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
