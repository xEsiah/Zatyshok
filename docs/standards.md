# Standards — Zatyshok

Conventions appliquées dans ce dépôt (source de vérité : [`../agents.md`](../agents.md)).

## Code

| Règle | Détail |
| --- | --- |
| **Aucun commentaire** dans le code généré, sauf demande explicite | `agents.md` § Code Standards |
| Pas de réécriture globale | petites étapes isolées, minimum de fichiers modifiés, rétrocompatibilité |
| Réutiliser avant de créer | un seul moyen de faire la même chose (dossiers, services, patterns React) |
| Front : tout passe par `services/apiClient.ts` | en-têtes `X-App-Token`, `X-App-Version`, `Authorization` centralisés |
| Electron : toute API OS passe par `preload/index.ts` | jamais d'API Node directe du renderer |
| SQL : `user_id` vérifié dans chaque requête | règle IDOR |
| Nouvelles fonctionnalités auth | JWT-compatibles (`agents.md` § Security Rules) |

## Frontend

- **i18n obligatoire** : tout texte ajouté doit exister dans **tous** les fichiers
  `frontend/src/renderer/src/locales/` (7 thèmes : `him`, `her`, `art`, `artFR`,
  `music`, `musicFR`, `default`).
- **Couleurs** : jamais de durcissement — uniquement les variables CSS de
  `main.css` (`var(--text-color)` …). Neumorphismie douce, UI « Soft UI ».
- **3 layouts** (Full / 80 % / Split) : toute UI doit fonctionner dans les trois.
- Contextes réutilisés : `UserContext` (session, traductions), `ModalContext`
  (overlays).
- Outils : `npm run lint` (ESLint 9), `npm run format` (Prettier),
  `npm run typecheck` (`tsc` node + web), `.editorconfig` du paquet.

## Backend

- TypeScript `strict`, module `Node16` (imports en `./x.js` résolus en `x.ts`).
- Vérification : `npx tsc --noEmit` (ou `npm run build` qui émet `dist/`).
- Entrées exprès `req.body` / `req.params` validées à la main (pas de lib).
- Erreurs : `res.status(x).json({ error: "..." })`, jamais de détail interne ;
  console avec préfixe `[SECTION]`.
- Pages HTML servies (landing, approbation, login et dashboard admin) : style
  Quicksand doux, bilingue FR/EN via `Accept-Language`, données échappées.
- `dotenv` charge `.env` **à la racine du repo** (relatif à `dist/` ou `src/`),
  sans override des variables déjà présentes dans l'environnement.

## Base de données

- Référence fraîche : `init.sql`. Compléments : `migrations/00N_nom.sql`,
  **idempotents** (`IF NOT EXISTS`), numérotés, jamais édités après application.
- Appliquer : `make migrate` (dev) — le déploiement le fait en prod
  (`make prod-migrate` dans `deploy.yml`).
- `users.role` = thème visuel ; administration = `users.is_admin`.

## Documentation

- `docs/` fait référence (pas les README de paquet).
- Un document `.md` par composant/feature, mis à jour à chaque modification.
- Diagrammes **Mermaid** obligatoires pour illustrer l'architecture et les flux.
- Roadmap et features à venir : **uniquement** `ToDo.md`.
- Chiffres, URLs et identifiants : jamais dans le code — variables `.env`.

## Git et exploitation

| Élément | Attendu |
| --- | --- |
| Branche | `main` |
| Remotes | `origin` (GitHub `xEsiah/Zatyshok`, pont de release) + `gitea` (`git.cohaise.dev/Esiah/Zatyshok`) |
| Commits / pushes | uniquement sur demande explicite (`agents.md`) |
| `.env` | jamais versionné (`.env.example` uniquement) |
| Secrets CI | `GITEA_TOKEN` (release), `GH_TOKEN` (`.env.example`) — jamais de tag sans eux |
| Front | `npm run lint && npm run typecheck` avant de conclure |
| Backend | `npx tsc --noEmit` avant de conclure |
