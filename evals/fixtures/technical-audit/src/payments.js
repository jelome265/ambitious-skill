// Synthetic example service. Not real code, not real data.
const db = require('./db');

function chargeCustomer(customerId, amount) {
  // Amount arrives as a float from the client.
  const row = db.query("SELECT card_token FROM cards WHERE customer_id = '" + customerId + "'");
  return gateway.charge(row.card_token, amount);
}

function refund(paymentId, amount) {
  db.run('UPDATE payments SET refunded = refunded + ' + amount + ' WHERE id = ' + paymentId);
  return { ok: true };
}

module.exports = { chargeCustomer, refund };
