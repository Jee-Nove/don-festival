// =============================================================================
// SERVEUR DE DON - GRAND AMOUR FESTIVAL / LES AILES DE CHARLOTTE
// =============================================================================
// Ce serveur fait 3 choses :
//   1. Sert la page web de don (le frontend que les gens voient)
//   2. Appelle l'API HelloAsso pour créer un "checkout-intent" (demande de paiement)
//   3. Reçoit le webhook HelloAsso pour confirmer que le paiement a bien été effectué
// =============================================================================

const express = require('express');
const path = require('path');

const app = express();

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------
// Ces valeurs viennent des variables d'environnement (fichier .env dans Coolify)
// Tu ne dois JAMAIS mettre tes clés API en dur dans le code !

const CONFIG = {
  // Clés API HelloAsso (à récupérer sur dev.helloasso.com)
  HELLOASSO_CLIENT_ID: process.env.HELLOASSO_CLIENT_ID || 'TON_CLIENT_ID',
  HELLOASSO_CLIENT_SECRET: process.env.HELLOASSO_CLIENT_SECRET || 'TON_CLIENT_SECRET',

  // Le "slug" de l'association (visible dans l'URL HelloAsso)
  // https://www.helloasso.com/associations/les-ailes-de-charlotte
  ASSO_SLUG: process.env.ASSO_SLUG || 'les-ailes-de-charlotte',

  // L'URL publique de TON site (sera don.grandamourfestival.fr en prod)
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',

  // URL de base de l'API HelloAsso
  // En TEST (sandbox) : https://api.helloasso-sandbox.com
  // En PRODUCTION :     https://api.helloasso.com
  HELLOASSO_API_URL: process.env.HELLOASSO_API_URL || 'https://api.helloasso-sandbox.com',

  // Port du serveur
  PORT: process.env.PORT || 3000,
};

// -----------------------------------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------------------------------
// express.json() permet de lire le body JSON des requêtes (pour le webhook)
// express.static() sert les fichiers HTML/CSS/JS du dossier "public"

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// GESTION DU TOKEN D'AUTHENTIFICATION HELLOASSO
// -----------------------------------------------------------------------------
// L'API HelloAsso utilise OAuth2. On doit d'abord obtenir un "access_token"
// avant de pouvoir faire des appels API. Ce token expire (généralement 30 min),
// donc on le renouvelle automatiquement quand nécessaire.

let accessToken = null;       // Le token actuel
let tokenExpiresAt = 0;       // Quand il expire (timestamp en ms)
let refreshToken = null;      // Le token de rafraîchissement

/**
 * Obtient un access_token valide auprès de HelloAsso.
 * - Si on n'a pas encore de token → on en demande un nouveau (grant_type: client_credentials)
 * - Si le token a expiré et qu'on a un refresh_token → on le rafraîchit (grant_type: refresh_token)
 * - Sinon → on renvoie le token existant
 */
async function getAccessToken() {
  const now = Date.now();

  // Si le token est encore valide (avec 60s de marge), on le réutilise
  if (accessToken && now < tokenExpiresAt - 60000) {
    return accessToken;
  }

  // Préparer la requête d'authentification
  let body;
  if (refreshToken) {
    // On a un refresh token → on l'utilise pour renouveler
    body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CONFIG.HELLOASSO_CLIENT_ID,
      refresh_token: refreshToken,
    });
  } else {
    // Première connexion → on utilise nos identifiants
    body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CONFIG.HELLOASSO_CLIENT_ID,
      client_secret: CONFIG.HELLOASSO_CLIENT_SECRET,
    });
  }

  // Appel à l'endpoint d'authentification HelloAsso
  const response = await fetch(`${CONFIG.HELLOASSO_API_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erreur authentification HelloAsso:', response.status, errorText);
    throw new Error(`Authentification HelloAsso échouée: ${response.status}`);
  }

  const data = await response.json();

  // On stocke le token et sa date d'expiration
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  tokenExpiresAt = now + (data.expires_in * 1000); // expires_in est en secondes

  console.log('✅ Token HelloAsso obtenu, expire dans', data.expires_in, 'secondes');
  return accessToken;
}

// -----------------------------------------------------------------------------
// ROUTE : CRÉER UN CHECKOUT (POST /api/creer-don)
// -----------------------------------------------------------------------------
// Cette route est appelée par le frontend quand l'utilisateur clique sur "Faire un don".
// Elle crée un "checkout-intent" chez HelloAsso et renvoie l'URL de paiement.

app.post('/api/creer-don', async (req, res) => {
  try {
    // 1. Récupérer le montant envoyé par le frontend (en euros)
    const { montant } = req.body;

    // 2. Vérifier que le montant est valide
    const montantFloat = parseFloat(montant);
    if (!montantFloat || montantFloat < 1 || montantFloat > 10000) {
      return res.status(400).json({
        erreur: 'Montant invalide. Minimum 1€, maximum 10 000€.',
      });
    }

    // 3. Convertir en centimes (HelloAsso travaille en centimes)
    //    Exemple : 10€ → 1000 centimes
    const montantCentimes = Math.round(montantFloat * 100);

    // 4. Obtenir un token d'authentification valide
    const token = await getAccessToken();

    // 5. Créer le checkout-intent chez HelloAsso
    //    C'est LE cœur de l'intégration : on dit à HelloAsso
    //    "quelqu'un veut donner X euros, prépare la page de paiement"
    const response = await fetch(
      `${CONFIG.HELLOASSO_API_URL}/v5/organizations/${CONFIG.ASSO_SLUG}/checkout-intents`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Montant total en centimes
          totalAmount: montantCentimes,
          // Montant à payer immédiatement (= totalAmount car pas d'échéances)
          initialAmount: montantCentimes,
          // Description visible dans le backoffice HelloAsso de l'association
          itemName: `Don Grand Amour Festival - ${montantFloat}€`,
          // URL si le donateur veut revenir en arrière (modifier son don)
          backUrl: `${CONFIG.BASE_URL}`,
          // URL en cas d'erreur technique pendant le paiement
          errorUrl: `${CONFIG.BASE_URL}/erreur.html`,
          // URL après un paiement réussi
          returnUrl: `${CONFIG.BASE_URL}/merci.html`,
          // C'est un don → true (important pour la conformité fiscale)
          containsDonation: true,
          // Pré-remplissage des coordonnées du donateur
          // → Permet de sauter l'étape "Informations du payeur" sur HelloAsso
          // → Le donateur arrive directement sur la page de paiement CB
          // ⚠️ Conséquence : aucun reçu fiscal ne sera délivré au donateur réel
          payer: {
            firstName: 'Donateur',
            lastName: 'Festival',
            email: `don+${Date.now()}@grandamourfestival.fr`,
            dateOfBirth: '1980-01-01',
            address: '1 place du Festival',
            city: 'Arles',
            zipCode: '13200',
            country: 'FRA',
          },
          // Metadata : données perso qu'on récupèrera dans le webhook
          // Utile pour tracer le don côté ton système
          metadata: {
            source: 'qr-code-festival',
            montant_euros: montantFloat,
            date: new Date().toISOString(),
          },
        }),
      }
    );

    // 6. Gérer les erreurs de l'API HelloAsso
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erreur HelloAsso checkout:', response.status, errorData);

      // 409 = l'association ne peut pas recevoir de paiements (pas vérifiée)
      if (response.status === 409) {
        return res.status(409).json({
          erreur: "L'association n'est pas encore vérifiée pour recevoir des paiements.",
        });
      }

      return res.status(500).json({
        erreur: 'Erreur lors de la création du paiement. Réessayez.',
      });
    }

    // 7. Récupérer l'URL de redirection
    const data = await response.json();
    console.log(`✅ Checkout créé : ${data.id} pour ${montantFloat}€`);

    // 8. Renvoyer l'URL au frontend qui redirigera le donateur
    //    ⚠️ Cette URL est valide 15 minutes seulement !
    res.json({
      redirectUrl: data.redirectUrl,
      checkoutId: data.id,
    });

  } catch (error) {
    console.error('❌ Erreur serveur:', error.message);
    res.status(500).json({
      erreur: 'Erreur serveur. Réessayez dans quelques instants.',
    });
  }
});

// -----------------------------------------------------------------------------
// ROUTE : WEBHOOK HELLOASSO (POST /webhook/helloasso)
// -----------------------------------------------------------------------------
// HelloAsso appelle cette URL automatiquement quand un paiement est confirmé.
// C'est la SEULE façon fiable de savoir qu'un paiement a réellement été effectué.
// (Le paramètre "code=succeeded" dans l'URL de retour peut être falsifié !)

app.post('/webhook/helloasso', (req, res) => {
  const { eventType, data, metadata } = req.body;

  console.log('📨 Webhook HelloAsso reçu:', eventType);

  // HelloAsso envoie deux notifications :
  // - "Payment" : le paiement a été effectué
  // - "Order" : la commande a été créée
  if (eventType === 'Payment') {
    console.log('💰 Paiement confirmé !');
    console.log('   Montant:', data?.amount / 100, '€');
    console.log('   État:', data?.state);
    console.log('   Metadata:', JSON.stringify(metadata));

    // -----------------------------------------------------------------
    // ICI TU PEUX AJOUTER TA LOGIQUE :
    // - Enregistrer le don dans une base de données
    // - Envoyer un email de remerciement
    // - Mettre à jour un compteur de dons
    // - Envoyer une notification Slack/Discord
    // -----------------------------------------------------------------
  }

  if (eventType === 'Order') {
    console.log('📋 Commande créée, ID:', data?.id);
  }

  // IMPORTANT : toujours répondre 200 à HelloAsso, sinon ils réessayeront
  res.status(200).json({ received: true });
});

// -----------------------------------------------------------------------------
// ROUTE : PAGE DE RETOUR APRÈS PAIEMENT
// -----------------------------------------------------------------------------
// Ces pages sont servies comme fichiers statiques depuis le dossier "public"
// (merci.html, erreur.html) grâce à express.static() plus haut.
// Pas besoin de routes supplémentaires !

// -----------------------------------------------------------------------------
// ROUTE : SANTÉ DU SERVEUR (utile pour Coolify)
// -----------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// DÉMARRAGE DU SERVEUR
// -----------------------------------------------------------------------------
app.listen(CONFIG.PORT, () => {
  console.log('');
  console.log('🎵 ══════════════════════════════════════════════════');
  console.log('   Serveur Grand Amour Festival - Page de don');
  console.log(`   URL locale : http://localhost:${CONFIG.PORT}`);
  console.log(`   API HelloAsso : ${CONFIG.HELLOASSO_API_URL}`);
  console.log(`   Association : ${CONFIG.ASSO_SLUG}`);
  console.log('🎵 ══════════════════════════════════════════════════');
  console.log('');
});
