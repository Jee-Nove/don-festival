# CLAUDE.md — Don Festival

> Ce fichier est lu automatiquement par Claude Code et les agent teams a chaque session.
> Il est la source de verite du projet. Maintiens-le a jour.

---

## Identite du projet

| Cle | Valeur |
|-----|--------|
| **Client** | LADC -- Les Ailes de Charlotte (fonds de dotation) |
| **Evenement** | Grand Amour Festival -- 15 & 16 mai 2026, 6MIC Aix-en-Provence |
| **Repo GitHub** | Jee-Nove/don-festival |
| **Branche principale** | main |
| **URL prod** | https://don.grandamourfestival.fr |
| **Deploye via** | Coolify -- VPS Hostinger |
| **DSI** | Jeremy Pougnet -- JeeNove |
| **Licence** | MIT |

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Runtime | Node.js | 20.x (alpine) |
| Serveur HTTP | Express | ^4.21.0 |
| Linting | ESLint | ^8.57.1 |
| Paiement | HelloAsso Checkout API (OAuth2) | v5 |
| Frontend | HTML / CSS / JS vanilla (pas de framework) | -- |
| Fonts | Google Fonts (Dela Gothic One, Nunito) | -- |
| Deploiement | Docker (node:20-alpine) + Coolify | -- |

---

## Structure du projet

```
don-festival/
├── server.js                # Serveur Express : API don, webhook HelloAsso, health check
├── package.json             # Dependances et scripts
├── package-lock.json        # Lockfile npm
├── Dockerfile               # Image node:20-alpine pour Coolify
├── .env.example             # Template des variables d'environnement
├── .eslintrc.json           # Config ESLint (eslint:recommended, ES2021, Node)
├── LICENSE                  # Licence MIT
├── README.md                # Description courte du projet
├── GUIDE-DEPLOIEMENT.md     # Guide pas-a-pas pour deployer sur Coolify
├── CLAUDE.md                # Ce fichier
└── public/                  # Fichiers statiques servis par Express
    ├── index.html           # Page de don (choix montant, redirection HelloAsso)
    ├── merci.html           # Page de confirmation apres paiement reussi
    ├── erreur.html          # Page d'erreur en cas d'echec de paiement
    ├── logo-festival.png    # Logo Grand Amour Festival
    └── logo-ailes-charlotte.png  # Logo Les Ailes de Charlotte
```

---

## Contexte metier

Le projet don-festival est la **page de don en ligne** du Grand Amour Festival, accessible via QR code scanne pendant l'evenement. Le parcours utilisateur est :

1. Le visiteur scanne un QR code sur site (ou accede a don.grandamourfestival.fr)
2. Il choisit un montant predefini (5, 10, 20, 50, 100 EUR) ou un montant libre
3. Le serveur cree un **checkout-intent** via l'API HelloAsso (OAuth2, v5)
4. Le visiteur est redirige vers HelloAsso pour le paiement par carte bancaire
5. Apres paiement, il est redirige vers `/merci.html` ou `/erreur.html`
6. HelloAsso envoie un **webhook** (`POST /webhook/helloasso`) pour confirmer le paiement

**Points importants :**
- Le don est **anonyme** : les coordonnees du payeur sont pre-remplies avec des donnees generiques pour accelerer le parcours
- En consequence, **aucun recu fiscal** n'est delivre au donateur reel (mentionne sur la page)
- 100% du don est verse a l'association (HelloAsso est gratuit pour les associations)
- L'API HelloAsso supporte deux environnements : **sandbox** (`api.helloasso-sandbox.com`) et **production** (`api.helloasso.com`)

---

## Commandes essentielles

```bash
# Developpement
npm run dev          # Serveur local port 3000 (node --watch)
npm start            # Serveur production (node server.js)
npm run lint         # ESLint
npm test             # Placeholder (echo + exit 0)

# Variables d'environnement requises (.env ou Coolify)
# HELLOASSO_CLIENT_ID       — Cle API HelloAsso (dev.helloasso.com)
# HELLOASSO_CLIENT_SECRET   — Secret API HelloAsso
# ASSO_SLUG                 — Slug association (les-ailes-de-charlotte)
# BASE_URL                  — URL publique (https://don.grandamourfestival.fr)
# HELLOASSO_API_URL         — URL API HelloAsso (sandbox ou production)
# PORT                      — Port serveur (defaut: 3000)
```

---

## Routes du serveur

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Page de don (index.html via express.static) |
| GET | `/merci.html` | Page de confirmation |
| GET | `/erreur.html` | Page d'erreur |
| POST | `/api/creer-don` | Cree un checkout-intent HelloAsso, renvoie `redirectUrl` |
| POST | `/webhook/helloasso` | Recoit les notifications HelloAsso (Payment, Order) |
| GET | `/health` | Health check pour Coolify (`{ status: 'ok' }`) |

---

## Conventions de code

### Patterns obligatoires

- **Serveur** : tout le backend est dans `server.js` (fichier unique)
- **Frontend** : HTML/CSS/JS vanilla dans `public/`, pas de bundler ni de framework
- **Variables d'environnement** : toujours via `process.env`, jamais en dur dans le code
- **Erreurs API** : reponse JSON avec cle `erreur` et status HTTP appropriate
- **Webhook** : toujours repondre `200` a HelloAsso, sinon ils retenteront
- **Token OAuth2** : gere automatiquement avec refresh, marge de 60s avant expiration
- **Montants** : convertir en centimes avant d'envoyer a HelloAsso (`Math.round(montant * 100)`)
- **Validation** : montant minimum 1 EUR, maximum 10 000 EUR

### Patterns interdits

- Ne jamais hardcoder de secrets ou tokens (cles HelloAsso, etc.)
- Ne jamais committer `.env` avec les vraies valeurs
- Ne jamais faire confiance au parametre `code=succeeded` dans l'URL de retour (seul le webhook fait foi)
- Ne jamais exposer les donnees brutes HelloAsso cote client
- Pas de `console.log` de debug laisses dans le code final

### Pieges connus

- **HelloAsso erreur 409** : l'association n'est pas verifiee pour recevoir des paiements. Rediriger vers la page de verification HelloAsso
- **URL de checkout valide 15 minutes seulement** : le `redirectUrl` expire rapidement
- **Sandbox vs Production** : la seule difference est `HELLOASSO_API_URL`. En sandbox, utiliser la carte test `4242 4242 4242 4242`
- **Don anonyme** : les coordonnees pre-remplies (`Donateur Festival`) impliquent qu'aucun recu fiscal n'est genere pour le vrai donateur
- **Pas de base de donnees** : les dons ne sont pas stockes localement, seul le webhook log dans la console

---

## Regles pour les agents

### Avant de coder

1. Lire ce fichier CLAUDE.md en entier
2. Verifier l'etat actuel du code impacte
3. Identifier les effets de bord potentiels (routes, webhook, frontend)
4. Annoncer le plan avant d'executer

### En codant

1. Respecter toutes les conventions ci-dessus
2. Aucune confirmation requise — executer directement
3. Jamais de base de donnees ni de migration DB (le projet n'a pas de BDD)
4. Jamais de `git push` — uniquement des commits locaux
5. Pas de `console.log` de debug dans le code final

### Avant de committer

1. `npm run lint` doit passer sans erreur
2. Format commit : `feat:`, `fix:`, `chore:`, `refactor:` en anglais
3. Verifier qu'aucun `.env` n'est inclus dans le commit
4. Verifier que `server.js` demarre sans erreur de syntaxe

---

## ADR -- Decisions d'architecture

| # | Decision | Statut | Date |
|---|----------|--------|------|
| ADR-001 | Express.js serveur unique (vs Next.js / framework front) | Accepte | 2026 |
| ADR-002 | HTML/CSS/JS vanilla sans framework ni bundler | Accepte | 2026 |
| ADR-003 | HelloAsso Checkout API v5 pour les paiements (vs Stripe / PayPal) | Accepte | 2026 |
| ADR-004 | Don anonyme avec coordonnees pre-remplies (vs formulaire complet) | Accepte | 2026 |
| ADR-005 | Pas de base de donnees — logs console uniquement | Accepte | 2026 |
| ADR-006 | Docker node:20-alpine + Coolify pour le deploiement | Accepte | 2026 |
| ADR-007 | OAuth2 client_credentials + refresh_token pour l'auth HelloAsso | Accepte | 2026 |
| ADR-008 | Google Fonts (Dela Gothic One + Nunito) pour la typographie | Accepte | 2026 |

---

## References

- [Repo GitHub](https://github.com/Jee-Nove/don-festival)
- [HelloAsso API v5](https://dev.helloasso.com/docs)
- [HelloAsso Developer Portal](https://dev.helloasso.com)
- [Coolify — app](https://coolify.jeenove.com)
- [Grand Amour Festival](https://www.grandamourfestival.fr)
