const API = window.AMEERTECH_API_BASE || '';
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const messageBox = document.querySelector('#account-message');
const panel = document.querySelector('#customer-panel');
const loginTab = document.querySelector('#show-login');
const registerTab = document.querySelector('#show-register');
function message(text, isError=false) { messageBox.textContent = text; messageBox.hidden = false; messageBox.classList.toggle('error', isError); }
function showMode(mode) {
  const registering = mode === 'register';
  loginForm.hidden = registering; registerForm.hidden = !registering;
  loginTab.classList.toggle('active', !registering); registerTab.classList.toggle('active', registering);
  messageBox.hidden = true;
}
loginTab.addEventListener('click', () => showMode('login'));
registerTab.addEventListener('click', () => showMode('register'));
async function request(path, options={}) {
  const response = await fetch(`${API}${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type':'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to complete request.');
  return data;
}
function showCustomer(user) {
  loginForm.hidden = true; registerForm.hidden = true;
  document.querySelector('.account-tabs').hidden = true;
  panel.hidden = false; messageBox.hidden = true;
  document.querySelector('#customer-name').textContent = user.name;
  document.querySelector('#customer-email').textContent = user.email;
}
loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]'); button.disabled = true;
  try {
    const result = await request('/api/auth/login', { method:'POST', body:JSON.stringify({ email:document.querySelector('#login-email').value, password:document.querySelector('#login-password').value }) });
    showCustomer(result.user);
  } catch (error) { message(error.message, true); }
  finally { button.disabled = false; }
});
registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = registerForm.querySelector('button[type="submit"]'); button.disabled = true;
  try {
    const result = await request('/api/auth/register', { method:'POST', body:JSON.stringify({ name:document.querySelector('#register-name').value, email:document.querySelector('#register-email').value, password:document.querySelector('#register-password').value }) });
    showCustomer(result.user);
  } catch (error) { message(error.message, true); }
  finally { button.disabled = false; }
});
document.querySelector('#logout-button').addEventListener('click', async () => {
  try { await request('/api/auth/logout', { method:'POST', body:'{}' }); location.reload(); }
  catch (error) { message(error.message, true); }
});
request('/api/auth/me').then(result => showCustomer(result.user)).catch(() => {});
