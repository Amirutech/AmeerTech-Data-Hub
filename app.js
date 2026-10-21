let purchaseType = 'data';
const form = document.querySelector('#purchase-form');
const planWrap = document.querySelector('#plan-wrap');
const amountInput = document.querySelector('#amount');
const resultBox = document.querySelector('#result');
const ordersBox = document.querySelector('#orders');
document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    purchaseType = button.dataset.type;
    planWrap.hidden = purchaseType !== 'data';
    amountInput.value = purchaseType === 'data' ? 500 : 100;
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  resultBox.hidden = false;
  resultBox.className = 'result';
  resultBox.textContent = 'Creating preview…';
  const payload = {
    type: purchaseType,
    network: document.querySelector('#network').value,
    phone: document.querySelector('#phone').value.trim(),
    planId: document.querySelector('#plan').value,
    amount: Number(amountInput.value)
  };
  try {
    const response = await fetch('/api/orders', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not create preview.');
    resultBox.textContent = `${data.message} Reference: ${data.reference}`;
    await loadOrders();
  } catch (error) {
    resultBox.className = 'result error';
    resultBox.textContent = error.message;
  }
});

async function loadOrders() {
  try {
    const response = await fetch('/api/orders');
    const orders = await response.json();
    if (!orders.length) {
      ordersBox.innerHTML = '<div class="empty-icon">↻</div><h3>No transactions yet</h3><p>Your purchase previews will appear here.</p>';
      return;
    }
    ordersBox.innerHTML = orders.map(o => `
      <div class="order-row">
        <div><b>${escapeHtml(o.network)} ${escapeHtml(o.type)}</b><small>${escapeHtml(o.phone)} · ${escapeHtml(o.reference)}</small></div>
        <div><strong>₦${Number(o.amount).toLocaleString('en-NG')}</strong><small>${escapeHtml(o.status.replaceAll('_',' '))}</small></div>
      </div>`).join('');
  } catch {
    ordersBox.innerHTML = '<p>Could not load activity. Please try again.</p>';
  }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
document.querySelector('#refresh').addEventListener('click', loadOrders);
loadOrders();


// Progressive Web App installation (Android/desktop browsers that support it).
let installPrompt = null;
const installButton = document.querySelector('#install-app');
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  installPrompt = null;
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
}


// Dashboard quick-service shortcuts switch the purchase form to the chosen tab.
document.querySelectorAll('[data-service]').forEach(card => {
  card.addEventListener('click', () => {
    const target = card.dataset.service;
    const tab = document.querySelector(`.tab[data-type="${target}"]`);
    if (tab) {
      tab.click();
      document.querySelectorAll('.service-card[data-service]').forEach(item => item.classList.toggle('selected', item === card));
      document.querySelector('#purchase-form').scrollIntoView({behavior:'smooth', block:'center'});
    }
  });
});
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.service-card[data-service]').forEach(card => card.classList.toggle('selected', card.dataset.service === tab.dataset.type));
  });
});
