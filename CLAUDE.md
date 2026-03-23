# CLAUDE.md — Don Festival

> Ce fichier est lu automatiquement par Claude Code et les agent teams a chaque session.
> Il est la source de verite du projet. Maintiens-le a jour.

---

## Identite du projet

| Cle | Valeur |
|-----|--------|
| **Client** | LADC — Les Ailes de Charlotte (fonds de dotation) |
| **Evenement** | Grand Amour Festival — 15 & 16 mai 2026, 6MIC Aix-en-Provence |
| **Repo GitHub** | Jee-Nove/don-festival |
| **Branche principale** | main |
| **URL prod** | https://don.grandamourfestival.fr |
| **Deploye via** | Coolify — VPS Hostinger |
| **DSI** | Jeremy Pougnet — JeeNove |

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Runtime | Node.js | 20.x (alpine) |
| Serveur HTTP | Express | ^4.21.0 |
| Paiement | Stripe Payment Element (PaymentIntents API) | ^17.5.0 |
| Config | dotenv | ^16.4.7 |
| Frontend | HTML / CSS / JS vanilla (pas de framework) | — |
| Deploiement | Docker (node:20-alpine) + Coolify | — |

---

## Structure du projet

```
don-festival/
├── server.js              # Serveur Express : API Stripe, health check
├── package.json           # Dependances et scripts
├── package-lock.json      # Lockfile npm
├── Dockerfile             # Image node:20-alpine pour Coolify
├── .env.example           # Template des variables d'environnement
├── .dockerignore          # Fichiers exclus du build Docker
├── CLAUDE.md              # Ce fichier
└── public/                # Fichiers statiques servis par Express
    ├── index.html         # Page de don (montants + Stripe Payment Element)
    ├── style.css          # Theme dark/electro festival
    ├── app.js             # Logique Stripe (init, montants, paiement)
    └── success.html       # Page de confirmation apres paiement reussi
```

---

## Contexte metier

Page de don en ligne du Grand Amour Festival, accessible via QR code scanne pendant l'evenement. Parcours :

1. Le visiteur scanne un QR code ou accede a don.grandamourfestival.fr
2. Il choisit un montant predefini (5, 10, 20, 50 EUR) ou saisit un montant libre
3. Il paie directement via Stripe Payment Element (CB, Apple Pay, Google Pay)
4. Apres paiement reussi, redirection vers `/success.html`

**Points importants :**
- Don anonyme, pas de formulaire de coordonnees — UX la plus courte possible
- Pas de recu fiscal (mentionne sur la page)
- Stripe Payment Element gere automatiquement Apple Pay, Google Pay, CB
- Montant minimum 1 EUR, maximum 1 000 EUR

---

## Commandes essentielles

```bash
npm run dev          # Serveur local port 3000 (node --watch)
npm start            # Serveur production (node server.js)
npm test             # Placeholder (echo + exit 0)
```

---

## Variables d'environnement (.env ou Coolify)

| Variable | Usage |
|----------|-------|
| `STRIPE_SECRET_KEY` | Cle secrete Stripe (sk_test_xxx ou sk_live_xxx) |
| `STRIPE_PUBLISHABLE_KEY` | Cle publique Stripe (pk_test_xxx ou pk_live_xxx) |
| `PORT` | Port serveur (defaut: 3000) |

---

## Routes du serveur

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Page de don (index.html via express.static) |
| GET | `/success.html` | Page de confirmation |
| GET | `/api/config` | Retourne `{ publishableKey }` |
| POST | `/api/create-payment-intent` | Cree un PaymentIntent Stripe, retourne `{ clientSecret }` |
| GET | `/health` | Health check pour Coolify |

---

## Deploiement sur Coolify

1. Dans Coolify, creer une nouvelle application Docker
2. Connecter le repo GitHub `Jee-Nove/don-festival`
3. Branche : `main`
4. Build : Dockerfile (auto-detecte)
5. Ajouter les variables d'environnement :
   - `STRIPE_SECRET_KEY` = cle secrete Stripe (live)
   - `STRIPE_PUBLISHABLE_KEY` = cle publique Stripe (live)
   - `PORT` = 3000
6. Domaine : `don.grandamourfestival.fr`
7. Deployer

---

## Conventions de code

- **Serveur** : tout le backend est dans `server.js` (fichier unique)
- **Frontend** : HTML/CSS/JS vanilla dans `public/`, pas de bundler ni de framework
- **Variables d'environnement** : toujours via `process.env`, jamais en dur
- **Montants** : convertis en centimes cote serveur (`amount` recu en centimes)
- **Erreurs API** : reponse JSON avec cle `error` et status HTTP appropriate
- Ne jamais hardcoder de secrets ou tokens
- Ne jamais committer `.env` avec les vraies valeurs

---

## ADR — Decisions d'architecture

| # | Decision | Statut | Date |
|---|----------|--------|------|
| ADR-001 | Express.js serveur unique (vs Next.js) | Accepte | 2026 |
| ADR-002 | HTML/CSS/JS vanilla sans framework | Accepte | 2026 |
| ADR-003 | Stripe Payment Element (remplace HelloAsso Checkout) | Accepte | 2026-03 |
| ADR-004 | Don anonyme sans formulaire coordonnees | Accepte | 2026 |
| ADR-005 | Pas de base de donnees — Stripe Dashboard comme source de verite | Accepte | 2026 |
| ADR-006 | Docker node:20-alpine + Coolify | Accepte | 2026 |
