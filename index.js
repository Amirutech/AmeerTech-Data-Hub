require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const db = require('./store');
const { purchaseAirtime, purchaseData } = require('./vtu');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'ath_session';
const SESSION_DAYS = 7;
const pepper = process.env.SESSION_PEPPER;
if (isProduction && (!pepper || pepper.length < 32)) {
  throw new Error('Set SESSION_PEPPER to a random secret of at least 32 characters before production.');
}
const sessionPepper = pepper || 'local-development-only-change-this-secret';
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('tiny'));
app.use(express.json({ limit: '20kb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a little and try again.' } });
const hashToken = token => crypto.createHmac('sha256', sessionPepper).update(token).digest('hex');
function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}
function setSessionCookie(res, token) {
  const secure = isProduction ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}
function clearSessionCookie(res) {
  const secure = isProduction ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}
function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
  db.prepare('INSERT INTO sessions(user_id, token_hash, expires_at, created_at) VALUES(?,?,?,?)')
    .run(userId, hashToken(token), expires.toISOString(), now.toISOString());
  setSessionCookie(res, token);
}
function currentUser(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = db.prepare(`SELECT users.id, users.name, users.email, sessions.id AS session_id
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(hashToken(token), new Date().toISOString());
  return session || null;
}
function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.user = user;
  next();
}
function validOrigin(req, res, next) {
  const expected = process.env.PUBLIC_ORIGIN;
  const origin = req.get('origin');
  if (expected && origin && origin !== expected) return res.status(403).json({ error: 'Request origin is not allowed.' });
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'AmeerTech Data Hub', mode: 'account-demo' }));
app.post('/api/auth/register', authLimiter, validOrigin, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Enter a name between 2 and 80 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 10 || password.length > 72) return res.status(400).json({ error: 'Use a password between 10 and 72 characters.' });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = db.prepare('INSERT INTO users(name,email,password_hash,created_at) VALUES(?,?,?,?)')
      .run(name, email, passwordHash, new Date().toISOString());
    createSession(Number(result.lastInsertRowid), res);
    res.status(201).json({ user: { id: Number(result.lastInsertRowid), name, email }, message: 'Account created. Welcome to AmeerTech Data Hub.' });
  } catch (error) {
    if (String(error.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
});
app.post('/api/auth/login', authLimiter, validOrigin, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = db.prepare('SELECT id,name,email,password_hash FROM users WHERE email = ?').get(email);
  const ok = user && await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Email or password is incorrect.' });
  createSession(user.id, res);
  res.json({ user: { id: user.id, name: user.name, email: user.email }, message: 'You are signed in.' });
});
app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});
app.post('/api/auth/logout', validOrigin, (req, res) => {
  const token = readCookie(req, COOKIE_NAME);
  if (token && /^[a-f0-9]{64}$/.test(token)) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  clearSessionCookie(res);
  res.json({ message: 'You have signed out.' });
});

app.get('/api/products', (_req, res) => res.json({
  networks: ['MTN', 'Airtel', 'Glo', '9mobile'],
  dataPlans: [
    { id: 'mtn-1gb', network: 'MTN', label: '1 GB', price: 500 },
    { id: 'airtel-1gb', network: 'Airtel', label: '1 GB', price: 500 },
    { id: 'glo-1gb', network: 'Glo', label: '1 GB', price: 450 },
    { id: '9mobile-1gb', network: '9mobile', label: '1 GB', price: 500 }
  ], note: 'Illustrative plans/prices only.'
}));
app.post('/api/orders', requireUser, (req, res) => {
  const { type, network, phone, planId, amount } = req.body || {};
  if (!['airtime', 'data'].includes(type)) return res.status(400).json({ error: 'Choose airtime or data.' });
  if (!['MTN', 'Airtel', 'Glo', '9mobile'].includes(network)) return res.status(400).json({ error: 'Unsupported network.' });
  if (typeof phone !== 'string' || !/^0\d{10}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid 11-digit Nigerian phone number.' });
  if (type === 'data' && (typeof planId !== 'string' || planId.length > 60)) return res.status(400).json({ error: 'Choose a data plan.' });
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 50 || numericAmount > 50000) return res.status(400).json({ error: 'Amount must be between ₦50 and ₦50,000.' });
  const reference = 'ATH-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  db.prepare(`INSERT INTO orders(reference,user_id,type,network,phone,plan_id,amount,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(reference, req.user.id, type, network, phone, planId || null, Math.round(numericAmount), 'preview_only', new Date().toISOString());
  res.status(201).json({ reference, status: 'preview_only', message: 'Preview only. No money was charged and no airtime/data was sent.' });
});
app.get('/api/orders', requireUser, (req, res) => {
  const rows = db.prepare('SELECT reference,type,network,phone,plan_id,amount,status,created_at FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(req.user.id);
  res.json(rows);
});
app.post('/api/payments/initialize', requireUser, (_req, res) => res.status(503).json({ error: 'Payments are not configured. No payment was started.' }));
app.post('/api/vtu/airtime', requireUser, async (_req, res) => { try { res.json(await purchaseAirtime()); } catch (e) { res.status(503).json({ error: e.message }); } });
app.post('/api/vtu/data', requireUser, async (_req, res) => { try { res.json(await purchaseData()); } catch (e) { res.status(503).json({ error: e.message }); } });

// The same Express app serves the website and API, so the HttpOnly session cookie stays first-party.
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny', index: 'index.html' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`AmeerTech Data Hub running on port ${port}`));
