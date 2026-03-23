const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const app = express();

const PORT = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Return publishable key to frontend
app.get('/api/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Create a PaymentIntent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || !Number.isInteger(amount)) {
      return res.status(400).json({ error: 'Montant invalide.' });
    }
    if (amount < 100) {
      return res.status(400).json({ error: 'Montant minimum : 1 €.' });
    }
    if (amount > 100000) {
      return res.status(400).json({ error: 'Montant maximum : 1 000 €.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: 'qr-code-festival',
        montant_euros: (amount / 100).toFixed(2),
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la création du paiement.' });
  }
});

// Health check for Coolify
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
