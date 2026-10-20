# Workflow — Zatyshok

## Boucle de développement

```sh
make dev-up        # db + backend en Docker (projets zatyshok-dev)
make dev-front     # electron-vite dev (renderer + main, port 5173)
make dev-backend   # rebuild du backend après changement TS
make dev-logs      # journaux backend/db
```

Front et backend peuvent aussi tourner hors Docker :

```sh
cd backend && npm run build && node dist/index.js   # fiable (voir pièges)
cd frontend && npm run dev                          # electron-vite
```

> `make dev-front` exécute `electron-vite dev` **en local**, pas dans Docker :
> le renderer parle à `VITE_API_URL` (backend `:3000`).

## Vérification

```sh
# Front (ESLint + Prettier + tsc renderer/main)
cd frontend && npm run lint && npm run typecheck

# Back (tsc strict)
cd backend && npx tsc --noEmit

# Schéma
make migrate        # rejoue migrations/*.sql (idempotent)
```

Il n'y a **ni framework de test ni CI de vérification** : lint + typecheck +
build sont les seules garanties automatiques.

## Modifier une route backend

1. Écrire la route dans `backend/src/routes/<entity>.ts` (style existant :
   `Router`, `async/await`, `db.execute` paramétré).
2. Poser `auth` (app) ou `requireAdmin` (admin) — jamais de confiance au corps
   de requête pour l'identité.
3. Filtrer par `user_id` en SQL sur toute donnée métier.
4. Erreur : `res.status(x).json({ error: "..." })`.
5. Décrire la route dans [`api.md`](api.md).
6. `npx tsc --noEmit`, puis rebuild Docker (`make dev-backend`) ou
   `npm run build`.

## Modifier le schéma

1. Écrire `migrations/00N_nom.sql` — **idempotent** (`IF NOT EXISTS`,
   `UPDATE … WHERE … IS NULL`), jamais modifier un fichier déjà joué.
2. Mettre à jour `init.sql` (base vierge) en miroir.
3. Appliquer en dev : `make migrate`.
4. Prod : appliqué automatiquement par `deploy.yml` (`make prod-migrate`) à
   chaque push touchant `migrations/**` ou `backend/**`.
5. Décrire la migration dans [`api.md`](api.md).

> Le DDL MariaDB n'est pas transactionnel : une migration interrompue se
> corrige par un **nouvel** état idempotent, pas en éditant l'historique.

## Modifier la page admin

| Besoin | Fichier |
| --- | --- |
| Données affichées (cartes, listes) | `backend/src/routes/admin.ts` (`getOverview`, `getUsers`, `getActivity`) |
| HTML / styles / libellés FR-EN | `backend/src/routes/admin.ts` (`getDashboardHtml`, `getLoginHtml`) |
| Session, throttle login, cookie | `backend/src/middlewares/admin.ts` |
| Tracking des majs / dernière activité | `backend/src/middlewares/auth.ts` (`trackClientState`) |
| Connexions enregistrées | `backend/src/routes/auth.ts` (POST `/login`) |
| Droits d'un compte | colonne `users.is_admin` (migration `001`) |

## Où changer quoi

| Besoin | Fichier |
| --- | --- |
| En-têtes API côté client | `frontend/src/renderer/src/services/apiClient.ts` |
| Auth (JWT, version, tracking) | `backend/src/middlewares/auth.ts` |
| Insc. / login / reset / approbation | `backend/src/routes/auth.ts` |
| Profil, thème, mdp | `backend/src/routes/user.ts` |
| Monitoring des releases + emails | `backend/src/services/releaseService.ts` |
| Feed auto-update / packaging | `frontend/electron-builder.yml`, `.github/workflows/release.yml` |
| Déploiement | `.github/workflows/deploy.yml`, `Makefile` |
| Couleurs / UI | `frontend/src/renderer/src/assets/main.css` (variables) |
| Textes traduits | `frontend/src/renderer/src/locales/*.json` |

## Git

- Branche `main` ; remotes : `origin` (GitHub, pont de release) et `gitea`
  (`https://git.cohaise.dev/Esiah/Zatyshok.git`).
- **Aucun commit ni push sans demande explicite** (`agents.md`).
- Tags = releases : ne jamais taguer sans secret `GITEA_TOKEN` (le preflight
  de `release.yml` échoue sinon).
- Push HTTPS Gitea : le cache d'credentials git expire (~15 min) — le push se
  fait depuis le terminal de l'utilisateur.

## Pièges connus

1. **`npm run dev` backend cassé** (`ts-node-dev` + TypeScript 5.9 ne résout
   pas `./routes/*.js`) — utiliser Docker (`make dev-backend`) ou
   `npm run build && node dist/index.js`.
2. **`DB_HOST=db` n'existe qu'en Docker** : pour tourner le backend sur
   l'hôte, lancer avec `DB_HOST=127.0.0.1` (dotenv n'écrase pas l'environnement).
3. **Client `mariadb` local** : connexion à la base dev en
   `mariadb --ssl=0 -h 127.0.0.1 -u zatyshok_user …` (le serveur ne parle pas
   TLS, le client l'exige sinon).
4. **`.env` désynchronisé de `.env.example`** : les clés manquantes tombent en
   silence sur les défauts compose (`DB_HOST=db`, etc.).
5. **Limitation admin** : après 10 échecs de `/admin/login`, 429 pendant
   15 min (mémoire du process — redémarrer le backend pour purger).
6. **releaseService** : `release: null` sur l'API tant qu'aucune release
   n'existe sur Gitea (bridage v2.2.3 requis).
