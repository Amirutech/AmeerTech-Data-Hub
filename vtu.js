/* Provider integration remains deliberately disabled until an official provider API
   has been selected, documented, implemented, and tested on the server. */
function notReady() {
  throw new Error('Live VTU fulfillment is disabled. No airtime or data was sent.');
}
async function purchaseAirtime() { notReady(); }
async function purchaseData() { notReady(); }
module.exports = { purchaseAirtime, purchaseData };
