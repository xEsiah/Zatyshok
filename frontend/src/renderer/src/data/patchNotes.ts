export type PatchLanguage = 'fr' | 'en'

export interface PatchNoteContent {
  title: string
  features: string[]
}

export interface PatchNote {
  version: string
  date: string
  content: Record<PatchLanguage, PatchNoteContent>
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '2.2.4',
    date: '09-11-2026',
    content: {
      fr: {
        title: 'Mises à jour et notes multilingues',
        features: [
          '- Mise à jour des dépendances de l\u0027application (frontend, backend et GitHub Actions).',
          '- Les notes de version sont maintenant disponibles en français et en anglais.'
        ]
      },
      en: {
        title: 'Updates and multilingual patch notes',
        features: [
          '- Updated the application dependencies (frontend, backend and GitHub Actions).',
          '- Release notes are now available in French and English.'
        ]
      }
    }
  },
  {
    version: '2.2.3',
    date: '06-10-2026',
    content: {
      fr: {
        title: 'Corrections de bugs',
        features: [
          '- Correction sur la sélection du type d\u0027événements et de la récurrence.',
          '- Mise à jour des dépendances de l\u0027application'
        ]
      },
      en: {
        title: 'Bug fixes',
        features: [
          '- Fixed the selection of the event type and recurrence.',
          '- Updated the application dependencies'
        ]
      }
    }
  }
]

export const getPatchLanguage = (role: string): PatchLanguage => (role.endsWith('FR') ? 'fr' : 'en')

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
