const API = window.AMEERTECH_API_BASE || '';
let purchaseType = 'data';
const form = document.querySelector('#purchase-form');
const planWrap = document.querySelector('#plan-wrap');
const amountInput = document.querySelector('#amount');
const resultBox = document.querySelector('#result');
const ordersBox = document.querySelector('#orders');
document.querySelector('#year').textContent = new Date().getFullYear();
async function api(path, options={}) {
  const response = await fetch(`${API}${path}`, { credentials:'same-origin', ...options, headers:{'Content-Type':'application/json', ...(options.headers||{})} });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  button.classList.add('active'); purchaseType = button.dataset.type;
  planWrap.hidden = purchaseType !== 'data'; amountInput.value = purchaseType === 'data' ? 500 : 100;
  document.querySelectorAll('.service-card[data-service]').forEach(card => card.classList.toggle('selected', card.dataset.service === purchaseType));
}));
form.addEventListener('submit', async event => {
  event.preventDefault(); resultBox.hidden = false; resultBox.className = 'result'; resultBox.textContent = 'Creating preview…';
  const payload = { type:purchaseType, network:document.querySelector('#network').value, phone:document.querySelector('#phone').value.trim(), planId:document.querySelector('#plan').value, amount:Number(amountInput.value) };
  try { const data = await api('/api/orders', {method:'POST', body:JSON.stringify(payload)}); resultBox.textContent = `${data.message} Reference: ${data.reference}`; await loadOrders(); }
  catch (error) { resultBox.className = 'result error'; resultBox.textContent = error.message; if (error.message.toLowerCase().includes('sign in')) setTimeout(() => { location.href='/account.html'; }, 900); }
});
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
async function loadOrders() {
  try { const orders = await api('/api/orders');
    if (!orders.length) { ordersBox.innerHTML = '<div class="empty-icon">↻</div><h3>No transactions yet</h3><p>Your purchase previews will appear here.</p>'; return; }
    ordersBox.innerHTML = orders.map(o => `<div class="order-row"><div><b>${escapeHtml(o.network)} ${escapeHtml(o.type)}</b><small>${escapeHtml(o.phone)} · ${escapeHtml(o.reference)}</small></div><div><strong>₦${Number(o.amount).toLocaleString('en-NG')}</strong><small>${escapeHtml(o.status.replaceAll('_',' '))}</small></div></div>`).join('');
  } catch (error) { ordersBox.innerHTML = `<p>${escapeHtml(error.message)} <a href="/account.html">Sign in</a></p>`; }
}
document.querySelector('#refresh').addEventListener('click', loadOrders);
api('/api/auth/me').then(({user}) => { const link=document.querySelector('.account-link'); if(link) link.textContent=`Hello, ${user.name.split(' ')[0]} · Account`; }).catch(()=>{});
let installPrompt = null; const installButton = document.querySelector('#install-app');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt=event; installButton.hidden=false; });
installButton?.addEventListener('click', async () => { if(!installPrompt)return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt=null; installButton.hidden=true; });
window.addEventListener('appinstalled', () => { installButton.hidden=true; installPrompt=null; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(()=>{}));
document.querySelectorAll('[data-service]').forEach(card => card.addEventListener('click', () => { const tab=document.querySelector(`.tab[data-type="${card.dataset.service}"]`); if(tab){tab.click(); form.scrollIntoView({behavior:'smooth',block:'center'});} }));
loadOrders();
