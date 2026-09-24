export interface PatchNote {
  version: string
  date: string
  title: string
  features: string[]
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '2.2.0',
    date: '2026-09-25',
    title: 'Notes vocales et changelogs',
    features: [
      '- Toutes les entrées du calendrier peuvent maintenant etre audios.',
      '- Ajout de cette section "changelogs" pour offrir un résumé des changements',
      '- Refactorisation du projet afin d\u0027offrir une meilleure cohérence visuelle dans l\u0027app'
    ]
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
