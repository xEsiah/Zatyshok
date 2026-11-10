export interface LocalizedText {
  text?: string
  icon?: string
}

/**
 * A translated value. Plain strings are still allowed for entries that do not
 * need an icon; decorated entries use `{ text, icon }`.
 */
export type Localized = string | LocalizedText

export const textOf = (value?: Localized | null): string => {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value : (value.text ?? '')
}

export const iconOf = (value?: Localized | null): string | undefined => {
  if (value === null || value === undefined || typeof value === 'string') return undefined
  return value.icon
}

export const hasIcon = (value?: Localized | null): boolean => iconOf(value) !== undefined
