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
    version: '2.3.0',
    date: '10-11-2026',
    content: {
      fr: {
        title: 'Icônes Liquid Glass et corrections des post-its',
        features: [
          '- Les emojis sont remplacés par des icônes Liquid Glass d\u0027Icons8, embarquées dans l\u0027application (aucun chargement externe).',
          '- Icônes colorées, agrandies et entourées d\u0027un léger contour adapté au thème pour rester lisibles partout.',
          '- Bulle de pensée et salut Vulcain : icônes dédiées plus fidèles.',
          '- Texte des post-its lisible en mode édition sur les thèmes sombres.',
          '- La molette de la souris fait défiler la bande de post-its horizontalement.',
          '- Mises à jour automatiques de TypeScript 7 et ESLint 10 ignorées en attendant leur compatibilité.'
        ]
      },
      en: {
        title: 'Liquid Glass icons and post-it fixes',
        features: [
          '- Every emoji is now a bundled Icons8 Liquid Glass icon shipped with the app (no external loading).',
          '- Icons are colored, slightly larger and outlined per theme so they stay legible everywhere.',
          '- Dedicated, more accurate thought bubble and Vulcan salute icons.',
          '- Post-it text stays readable while editing on dark themes.',
          '- The mouse wheel now scrolls the post-it strip horizontally.',
          '- Automatic updates to TypeScript 7 and ESLint 10 are ignored until they are compatible.'
        ]
      }
    }
  },
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
