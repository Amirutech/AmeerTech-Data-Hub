/*
 * Provider-specific integration belongs here.
 *
 * Do not guess an API contract. Get official API documentation from the VTU
 * provider you choose, then implement:
 * - authenticated HTTPS requests using server-only secrets
 * - exact product/service codes from provider catalogue
 * - unique idempotency/reference values
 * - request timeout and safe retry policy
 * - provider response validation and status reconciliation
 * - safe handling of pending/failed/reversed orders
 *
 * Never fulfill an order merely because the browser says payment succeeded.
 */
function ensureLiveProviderReady() {
  if (process.env.VTU_LIVE_ENABLED !== 'true' || !process.env.VTU_PROVIDER ||
      !process.env.VTU_API_BASE_URL || !process.env.VTU_API_KEY) {
    throw new Error('Live VTU fulfillment is disabled. Choose a provider and configure its documented API adapter first.');
  }
  throw new Error('Provider adapter is not implemented yet. No airtime/data was sent.');
}
async function purchaseAirtime(_payload) { ensureLiveProviderReady(); }
async function purchaseData(_payload) { ensureLiveProviderReady(); }
module.exports = { purchaseAirtime, purchaseData };
