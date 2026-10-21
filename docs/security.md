# Sécurité — Zatyshok

## En place

### Couches d'accès

| Mesure | Détail |
| --- | --- |
| Jeton applicatif | `X-App-Token` comparé à `API_TOKEN` sur chaque route protégée (`401`) |
| Minimum client | `X-App-Version` requis, comparaison string `< 1.1.0` → `426` |
| Session app | JWT HS256 (`JWT_SECRET`), expiration 30 j, portée `{ id }` |
| Session admin | cookie `zatyshok_admin` : `HttpOnly`, `SameSite=Lax`, `Path=/`, 12 h, `Secure` hors localhost ; `is_admin` **relu en base à chaque requête** |
| Isolation | chaque requête métier filtre par `user_id` en SQL (règle IDOR) |

### Comptes

| Mesure | Détail |
| --- | --- |
| Mots de passe | bcrypt (`saltRounds = 10`), politique ≥ 16 car. + majuscule + caractère spécial à l'inscription et à la réinitialisation |
| Approbation | compte créé `isApproved = 0` ; activation par lien email (`/approve/:token`, jeton unique) **ou** action admin (`/admin/api/users/:id/approve`) |
| Reset mdp | code 6 car. envoyé par email, expiration 1 h, effacé après usage |
| Changer d'email | notification envoyée à la **nouvelle** adresse (`/user/update-info`) |
| Double compte admin | `users.is_admin` (colonnes dédiée, `role` reste le thème visuel) |

### Limitation de débit

- **Admin** : throttle en mémoire sur `POST /admin/login` — 10 échecs / 15 min /
  IP (`backend/src/middlewares/admin.ts`), clé = `CF-Connecting-IP` puis `req.ip`.
- **App** : aucun limiteur sur `POST /login` ni `/register` / `/forgot-password`
  (hors périmètre assumé, voir plus bas).
- `GET /weather` lit `CF-Connecting-IP` et refuse les IP privées (pas de
  proxy-spoofing depuis l'intérieur).

### Courriel

Nodemailer (`SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`) : approbation, bienvenue,
reset mdp, changement d'email, **notification de release** (monitoring horaire).
Les gabarits (`emailTemplates.json`, `routes/user.ts`, `routes/auth.ts`) n'injectent
jamais de HTML utilisateur. Logo embarqué (`cid:logo-app`).

### Journalisation et audit

| Événement | Table |
| --- | --- |
| Connexion app réussie (user, IP, version) | `login_events` |
| Changement de version détecté (X → Y) | `app_updates` |
| Actions admin (login, logout, approve, revoke, promote, demote, check-release) | `admin_audit` |

IP lue dans `CF-Connecting-IP` (positionnée par Cloudflare), repli sur
`req.socket.remoteAddress`.

### Transport et enveloppe

- CORS : allowlist stricte (`localhost:5173`, `localhost:5174`,
  `https://api-zatyshok.esiah.dev`), `allowedHeaders` limités.
- SQL : requêtes préparées uniquement (`db.execute` / `db.query` avec
  paramètres), identifiants de table en dur ou échappés en backticks depuis des
  listes fixes.
- Fichiers : noms générés côté serveur (`multer.diskStorage`), destinations
  fixes (`uploads/profiles`, `uploads/audio`) — aucun chemin client.
- Admin : toutes les réponses HTML échappent les données (`esc()`), les données
  sont servies en JSON et injectées via `textContent`/échappement côté page.
- HTTPS : terminus Cloudflare + cloudflared, hors dépôt (voir
  [`deployment.md`](deployment.md)).

## Hors périmètre (assumé)

| Sujet | État |
| --- | --- |
| CSP / helmet | pas d'en-têtes de sécurité sur l'API Electron (contexte de confiance app desktop) |
| Rate-limit app | `POST /login`, `/register`, `/forgot-password` non limités côté applicatif |
| CSRF admin | reposé sur `SameSite=Lax` + origine unique (pas de jeton CSRF) |
| Rotation `JWT_SECRET` / `API_TOKEN` | manuelle via `.env` — révoque les sessions en cours |
| Stockage client | `user_token` JWT en clair dans `electron-store` (chiffré par l'OS selon la plateforme) |
| Chiffrement au repos | base et uploads en clair ; seuls mots de passe (bcrypt) et JWT sont dérivés |
| Anti-énumération | `/login` répond « Invalid credentials » générique, mais `/forgot-password` distingue une adresse inconnue (`404`) |

## À ne pas faire

- Ne jamais renvoyer de stack trace ou de détail de schéma au client.
- Ne jamais ajouter de route qui reçoit un chemin disque ou un nom de fichier
  du client : passer par `multer` avec destinations fixes.
- Ne jamais logger un mot de passe ni persister un JWT en clair côté serveur.
- Ne jamais utiliser `users.role` (thème) comme condition d'administration :
  passer par `is_admin` + `requireAdmin`.
- Ne jamais afficher du HTML non échappé injecté depuis la base (usernames,
  emails) dans `/admin`.
