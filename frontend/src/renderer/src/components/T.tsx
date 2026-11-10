import { JSX } from 'react'
import { iconOf, Localized, textOf } from '../data/localized'
import { Icon } from './Icon'

interface TProps {
  value?: Localized | null
  iconSize?: number | string
  className?: string
}

/**
 * Renders a localized value, prefixing its icon when one is defined.
 * Plain strings render exactly like before.
 */
export function T({ value, iconSize = '1em', className = '' }: TProps): JSX.Element {
  const text = textOf(value)
  const icon = iconOf(value)

  if (!icon) return <>{text}</>

  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`}>
      <Icon name={icon} size={iconSize} />
      {text && <span>{text}</span>}
    </span>
  )
}
