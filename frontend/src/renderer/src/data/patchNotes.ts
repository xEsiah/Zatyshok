export interface PatchNote {
  version: string
  date: string
  title: string
  features: string[]
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '2.2.3',
    date: '06-10-2026',
    title: 'Corrections de bugs',
    features: ['- Correction sur la sélection du type d\u0027evenements et de la recurrence.']
  }
]

export const isVersionNewer = (a: string, b: string): boolean => {
  const pa = a
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number(n))
  const pb = b
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number(n))
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff > 0
  }
  return false
}
