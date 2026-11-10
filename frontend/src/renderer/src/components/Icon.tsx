import { JSX } from 'react'
import { iconSrc } from '../data/icons'

interface IconProps {
  name?: string
  size?: number | string
  className?: string
  alt?: string
}

/**
 * Icons8 exports read a little smaller than the emoji they replace at the same
 * box size, so every numeric size gets a small bump. Strings (`1.2em`, `2rem`)
 * are used as-is because they already scale with the surrounding text.
 */
const ICON_SCALE = 1.2

const resolveSize = (size: number | string): number | string =>
  typeof size === 'number' ? Math.round(size * ICON_SCALE) : size

/**
 * Renders a bundled Icons8 Liquid Glass PNG. `name` accepts either a slug
 * (`sparkles`) or a locale reference (`icons/sparkles.png`).
 */
export function Icon({
  name,
  size = '1.2em',
  className = '',
  alt = ''
}: IconProps): JSX.Element | null {
  const src = iconSrc(name)
  if (!src) return null

  const resolvedSize = resolveSize(size)

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      aria-hidden={alt ? undefined : true}
      className={`icon-glass inline-block shrink-0 object-contain align-[-0.125em] ${className}`}
      style={{ width: resolvedSize, height: resolvedSize }}
    />
  )
}
