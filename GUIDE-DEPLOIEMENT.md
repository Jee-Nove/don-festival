# 🎵 Guide de déploiement — Page de don Grand Amour Festival

## Architecture du projet

```
don-festival/
├── server.js              ← Le serveur Node.js (backend)
├── package.json           ← Les dépendances
├── Dockerfile             ← Pour le déploiement sur Coolify
├── .dockerignore
├── .env.example           ← Modèle des variables d'environnement
└── public/
    ├── index.html         ← La page de don (ce que voient les gens)
    ├── merci.html         ← Page de confirmation après un don réussi
    └── erreur.html        ← Page affichée en cas d'erreur de paiement
```

## Parcours utilisateur

```
QR Code → don.grandamourfestival.fr → Choix du montant → Clic "Faire un don"
→ Redirection vers HelloAsso (paiement) → Retour sur don.grandamourfestival.fr/merci
```

---

## Étape 1 — Récupérer les clés API HelloAsso

1. Va sur **https://dev.helloasso.com**
2. Connecte-toi avec ton compte partenaire
3. Va dans **"Obtenir une clé API"** dans le menu de gauche
4. Note ton **client_id** et **client_secret**

> ⚠️ Le `client_secret` n'est affiché qu'une seule fois. Copie-le précieusement !

---

## Étape 2 — Pousser le code sur un dépôt Git

Coolify déploie depuis un repo Git. Tu as deux options :

### Option A : GitHub (recommandé)
```bash
cd don-festival
git init
git add .
git commit -m "Initial commit - Page de don Grand Amour Festival"
git remote add origin https://github.com/ton-user/don-festival.git
git push -u origin main
```

### Option B : Repo local via Coolify
Coolify supporte aussi le déploiement depuis un repo local. Consulte la doc Coolify.

---

## Étape 3 — Créer l'application dans Coolify

1. Connecte-toi à ton **dashboard Coolify** sur Hostinger
2. Clique sur **"New Resource"** → **"Application"**
3. Choisis ta source (GitHub, GitLab, ou repo local)
4. Sélectionne le repo `don-festival`
5. Coolify détectera automatiquement le **Dockerfile**
6. Dans **"Settings"**, configure :
   - **Port** : `3000`
   - **Health check** : `/health`

---

## Étape 4 — Configurer les variables d'environnement dans Coolify

Dans les settings de ton application Coolify, va dans **"Environment Variables"** et ajoute :

| Variable | Valeur (TEST) | Valeur (PRODUCTION) |
|---|---|---|
| `HELLOASSO_CLIENT_ID` | ton_client_id | ton_client_id |
| `HELLOASSO_CLIENT_SECRET` | ton_client_secret | ton_client_secret |
| `ASSO_SLUG` | les-ailes-de-charlotte | les-ailes-de-charlotte |
| `BASE_URL` | https://don.grandamourfestival.fr | https://don.grandamourfestival.fr |
| `HELLOASSO_API_URL` | https://api.helloasso-sandbox.com | **https://api.helloasso.com** |
| `PORT` | 3000 | 3000 |

> 🔑 La seule différence entre test et production, c'est `HELLOASSO_API_URL` !

---

## Étape 5 — Configurer le domaine dans Coolify

1. Dans les settings de ton app Coolify → **"Domains"**
2. Ajoute : `don.grandamourfestival.fr`
3. Active **"Generate SSL"** (Let's Encrypt)
4. Coolify va automatiquement configurer le reverse proxy et le certificat SSL

---

## Étape 6 — Configurer le DNS

### Si le DNS est dans M365 / Azure :
1. Va dans le **Centre d'administration Microsoft 365** → **Domaines** → `grandamourfestival.fr`
2. Ajoute un enregistrement DNS :
   - **Type** : A
   - **Nom** : `don`
   - **Valeur** : L'adresse IP de ton serveur Coolify/Hostinger
   - **TTL** : 3600

### Si le DNS est chez Gandi :
1. Va dans l'espace client **Gandi** → **Nom de domaine** → `grandamourfestival.fr`
2. Onglet **"Enregistrements DNS"**
3. Ajoute un enregistrement A avec les mêmes infos

> 💡 La propagation DNS peut prendre jusqu'à 24h, mais souvent c'est 10-30 min.

---

## Étape 7 — Configurer le webhook HelloAsso

Pour que HelloAsso te notifie quand un paiement est confirmé :

1. Va sur **dev.helloasso.com** → **"Définir une URL de notification"**
2. Configure l'URL du webhook :
   ```
   https://don.grandamourfestival.fr/webhook/helloasso
   ```
3. Sélectionne les types de notification : **Payment** et **Order**

---

## Étape 8 — Tester en sandbox

1. Déploie l'app avec `HELLOASSO_API_URL=https://api.helloasso-sandbox.com`
2. Va sur `https://don.grandamourfestival.fr`
3. Fais un don test de 5€
4. Tu seras redirigé vers la **sandbox HelloAsso** (pas de vrai paiement)
5. Utilise une carte de test :
   - Numéro : `4242 4242 4242 4242`
   - Expiration : n'importe quelle date future
   - CVV : `123`
6. Vérifie que tu es bien redirigé vers la page "merci"
7. Vérifie dans les logs Coolify que le webhook a bien été reçu

---

## Étape 9 — Passage en production

Quand tout fonctionne en sandbox :

1. Change la variable `HELLOASSO_API_URL` en `https://api.helloasso.com`
2. Redéploie l'application
3. Reconfigure le webhook sur l'environnement de production HelloAsso
4. Fais un vrai don test de 1€ pour vérifier
5. Mets à jour le QR code pour pointer vers `https://don.grandamourfestival.fr`

---

## Dépannage

### Le paiement ne se crée pas
- Vérifie les logs Coolify pour les erreurs
- Vérifie que les clés API sont correctes
- Vérifie que l'association est bien **vérifiée** sur HelloAsso (obligatoire depuis juin 2025)

### Erreur 409 de HelloAsso
- L'association n'est pas vérifiée. Redirige vers :
  `https://admin.helloasso.com/les-ailes-de-charlotte/verification`

### Le webhook n'arrive pas
- Vérifie que l'URL est accessible publiquement
- Vérifie que le pare-feu autorise les requêtes POST entrantes
- HelloAsso réessaye plusieurs fois en cas d'échec

### Le SSL ne fonctionne pas
- Vérifie que le DNS pointe bien vers ton serveur
- Vérifie que Coolify a bien pu générer le certificat Let's Encrypt
- Attends quelques minutes après la configuration DNS

---

## Pour aller plus loin (optionnel)

- **Compteur de dons en temps réel** : Ajouter un compteur sur la page d'accueil
- **Notifications Slack/Discord** : Envoyer une notif à chaque don reçu
- **Base de données** : Stocker les dons dans une BDD pour les stats
- **Analytics** : Ajouter un tracker pour savoir combien de gens scannent le QR

---

*Dernière mise à jour : Février 2026*
