let stripe;
let elements;
let paymentElement;

const amountBtns = document.querySelectorAll('.amounts__btn');
const customInput = document.getElementById('customAmountInput');
const customWrapper = document.getElementById('customAmountWrapper');
const donateBtn = document.getElementById('donateBtn');
const donateBtnText = donateBtn.querySelector('.donate-btn__text');
const errorMsg = document.getElementById('errorMsg');

let selectedAmount = 5;

// Init Stripe
async function initStripe() {
  const res = await fetch('/api/config');
  const { publishableKey } = await res.json();
  stripe = Stripe(publishableKey);
  elements = stripe.elements({
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#b026ff',
        colorBackground: '#1a1a2e',
        colorText: '#ffffff',
        colorDanger: '#ff2d95',
        borderRadius: '8px',
      },
    },
  });
  paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');
}

initStripe();

// Amount selection
amountBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    amountBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAmount = parseInt(btn.dataset.amount);
    customInput.value = '';
    customWrapper.style.display = 'none';
    updateButtonText();
    hideError();
  });
});

customInput.addEventListener('input', () => {
  const val = parseFloat(customInput.value);
  if (val > 0) {
    amountBtns.forEach(b => b.classList.remove('active'));
    selectedAmount = val;
  }
  updateButtonText();
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
  donateBtn.disabled = amount <= 0;
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

  donateBtn.disabled = true;
  donateBtn.classList.add('donate-btn--loading');

  try {
    // Create PaymentIntent on server
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amount * 100) }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur.');

    // Confirm payment with Stripe
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret: data.clientSecret,
      confirmParams: {
        return_url: window.location.origin + '/success.html',
      },
    });

    // If we get here, there was an error (success redirects automatically)
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
