let stripe;
let elements;
let paymentElement;
let paymentElementReady = false;
let debounceTimer = null;

const amountBtns = document.querySelectorAll('.amounts__btn');
const customInput = document.getElementById('customAmountInput');
const customWrapper = document.getElementById('customAmountWrapper');
const donateBtn = document.getElementById('donateBtn');
const donateBtnText = donateBtn.querySelector('.donate-btn__text');
const errorMsg = document.getElementById('errorMsg');
const paymentElementDiv = document.getElementById('payment-element');

let selectedAmount = 5;

const APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#E63228',
    colorBackground: '#1A1A1A',
    colorText: '#FFF8F0',
    colorDanger: '#E84C8A',
    borderRadius: '8px',
  },
};

// Init Stripe (just load the key, don't create elements yet)
async function initStripe() {
  const res = await fetch('/api/config');
  const { publishableKey } = await res.json();
  stripe = Stripe(publishableKey);
  // Mount Payment Element for the default selected amount
  mountPaymentElement(selectedAmount);
}

initStripe();

// Create PaymentIntent + mount Payment Element for a given amount
async function mountPaymentElement(amountEuros) {
  if (!stripe) return;
  if (amountEuros < 1 || amountEuros > 1000) return;

  // Show loading state
  paymentElementReady = false;
  donateBtn.disabled = true;
  paymentElementDiv.innerHTML = '<div class="pe-loader"><div class="pe-spinner"></div></div>';

  // Destroy previous elements
  if (elements) {
    elements = null;
    paymentElement = null;
  }

  try {
    // Create PaymentIntent on server
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amountEuros * 100) }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur.');

    // Create new Elements with clientSecret
    elements = stripe.elements({
      clientSecret: data.clientSecret,
      appearance: APPEARANCE,
    });

    paymentElement = elements.create('payment');

    paymentElement.on('ready', () => {
      paymentElementReady = true;
      donateBtn.disabled = false;
    });

    paymentElementDiv.innerHTML = '';
    paymentElement.mount('#payment-element');
  } catch (err) {
    paymentElementDiv.innerHTML = '';
    showError(err.message);
  }
}

// Amount button selection
amountBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    amountBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAmount = parseInt(btn.dataset.amount);
    customInput.value = '';
    customWrapper.style.display = 'none';
    updateButtonText();
    hideError();
    mountPaymentElement(selectedAmount);
  });
});

// Custom amount input with 500ms debounce
customInput.addEventListener('input', () => {
  const val = parseFloat(customInput.value);
  if (val > 0) {
    amountBtns.forEach(b => b.classList.remove('active'));
    selectedAmount = val;
  }
  updateButtonText();

  clearTimeout(debounceTimer);
  if (val >= 1 && val <= 1000) {
    debounceTimer = setTimeout(() => mountPaymentElement(val), 500);
  }
});

customInput.addEventListener('focus', () => {
  amountBtns.forEach(b => b.classList.remove('active'));
});

document.getElementById('customToggle').addEventListener('click', () => {
  amountBtns.forEach(b => b.classList.remove('active'));
  customWrapper.style.display = 'block';
  customInput.focus();
  selectedAmount = 0;
  updateButtonText();
});

function getAmount() {
  if (customInput.value && parseFloat(customInput.value) > 0) {
    return parseFloat(customInput.value);
  }
  return selectedAmount;
}

function updateButtonText() {
  const amount = getAmount();
  donateBtnText.textContent = amount > 0 ? `Donner ${amount} €` : 'Donner';
  // Don't enable here — only 'ready' event enables it
  if (amount <= 0) donateBtn.disabled = true;
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.add('visible');
}

function hideError() {
  errorMsg.classList.remove('visible');
}

// Submit payment
donateBtn.addEventListener('click', async () => {
  hideError();
  const amount = getAmount();

  if (amount < 1) { showError('Le montant minimum est de 1 €.'); return; }
  if (amount > 1000) { showError('Le montant maximum est de 1 000 €.'); return; }
  if (!elements || !paymentElementReady) { showError('Veuillez patienter, le formulaire de paiement charge...'); return; }

  donateBtn.disabled = true;
  donateBtn.classList.add('donate-btn--loading');

  try {
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/success.html',
      },
    });

    // If we reach here, there was an error (success redirects automatically)
    if (error) {
      showError(error.message);
    }
  } catch (err) {
    showError(err.message);
  }

  donateBtn.disabled = false;
  donateBtn.classList.remove('donate-btn--loading');
});

// Init button state
updateButtonText();
