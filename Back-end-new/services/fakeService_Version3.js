function createFakePaymentLink({ paymentId, baseUrl }) {
  return `${baseUrl}/api/payments/webhook/simulate?paymentId=${paymentId}`;
}

module.exports = { createFakePaymentLink };