require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto');
const db = require('./store');
const { purchaseAirtime, purchaseData } = require('./vtu');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('tiny'));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'AmeerTech Data Hub', mode: process.env.VTU_LIVE_ENABLED === 'true' ? 'provider-configured-check-required' : 'safe-preview' }));

app.get('/api/products', (_req, res) => {
  res.json({
    networks: ['MTN', 'Airtel', 'Glo', '9mobile'],
    dataPlans: [
      { id: 'mtn-1gb', network: 'MTN', label: '1 GB', price: 500 },
      { id: 'airtel-1gb', network: 'Airtel', label: '1 GB', price: 500 },
      { id: 'glo-1gb', network: 'Glo', label: '1 GB', price: 450 },
      { id: '9mobile-1gb', network: '9mobile', label: '1 GB', price: 500 }
    ],
    note: 'Illustrative plans/prices only. Replace with live provider catalogue before selling.'
  });
});

// Starter order endpoint: validates request and records preview orders only.
// It deliberately does not debit a wallet or fulfill a real transaction.
app.post('/api/orders', async (req, res) => {
  const { type, network, phone, planId, amount } = req.body || {};
  if (!['airtime', 'data'].includes(type)) return res.status(400).json({ error: 'Choose airtime or data.' });
  if (!['MTN', 'Airtel', 'Glo', '9mobile'].includes(network)) return res.status(400).json({ error: 'Unsupported network.' });
  if (typeof phone !== 'string' || !/^0\d{10}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid 11-digit Nigerian phone number.' });
  if (type === 'data' && (typeof planId !== 'string' || planId.length > 60)) return res.status(400).json({ error: 'Choose a data plan.' });
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 50 || numericAmount > 50000) return res.status(400).json({ error: 'Amount must be between ₦50 and ₦50,000.' });

  const reference = 'ATH-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const result = db.prepare(`INSERT INTO orders(reference,type,network,phone,plan_id,amount,status,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(reference, type, network, phone, planId || null, Math.round(numericAmount), 'preview_only', new Date().toISOString());

  res.status(201).json({
    orderId: result.lastInsertRowid,
    reference,
    status: 'preview_only',
    message: 'Preview order created. No money was charged and no airtime/data was sent.'
  });
});

app.get('/api/orders', (_req, res) => {
  const rows = db.prepare('SELECT reference,type,network,phone,plan_id,amount,status,created_at FROM orders ORDER BY id DESC LIMIT 30').all();
  res.json(rows);
});

// Payment endpoint intentionally returns a setup message until server keys are configured.
// Before launch, add customer authentication, amount verification, signed webhooks,
// server-side transaction verification, idempotency and ledger-safe fulfillment.
app.post('/api/payments/initialize', (_req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ error: 'Payments are not configured. Add Paystack test keys to the server .env file first.' });
  }
  return res.status(501).json({ error: 'Payment adapter needs to be completed and tested before use. No payment was started.' });
});

app.post('/api/vtu/airtime', async (_req, res) => {
  try { res.json(await purchaseAirtime(_req.body)); }
  catch (e) { res.status(503).json({ error: e.message }); }
});
app.post('/api/vtu/data', async (_req, res) => {
  try { res.json(await purchaseData(_req.body)); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`AmeerTech Data Hub running at http://localhost:${port}`));
