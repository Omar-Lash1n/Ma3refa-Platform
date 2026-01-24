const axios = require("axios");

/**
 * Paymob (Accept) integration helper (sandbox & production).
 * Flow:
 * 1) Get auth token POST /api/auth/tokens with { api_key }
 * 2) Create order POST /api/ecommerce/orders with order payload
 * 3) Request payment_key POST /acceptance/payment_keys with amount_cents, order_id, billing, integration_id
 * 4) Return iframe url: https://accept.paymob.com/api/acceptance/iframes/{iframe_id}?payment_token={payment_token}
 */

const PAYMOB_BASE = process.env.PAYMOB_BASE_URL || "https://accept.paymob.com";

async function getAuthToken() {
  const res = await axios.post(`${PAYMOB_BASE}/api/auth/tokens`, {
    api_key: process.env.PAYMOB_API_KEY,
  });
  return res.data.token;
}

async function createOrder({ amountCents, currency = "EGP", items = [], merchant_order_id = null }) {
  const token = await getAuthToken();
  const body = {
    delivery_needed: false,
    amount_cents: amountCents,
    currency,
    items,
  };
  if (merchant_order_id) body.merchant_order_id = merchant_order_id;
  const res = await axios.post(`${PAYMOB_BASE}/api/ecommerce/orders`, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data; // contains id
}

async function createPaymentKey({ amountCents, currency = "EGP", orderId, billingData = {}, integrationId }) {
  const token = await getAuthToken();
  const body = {
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    billing_data: billingData,
    currency,
    integration_id: integrationId || process.env.PAYMOB_INTEGRATION_ID,
  };
  const res = await axios.post(`${PAYMOB_BASE}/api/acceptance/payment_keys`, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data; // contains token
}

function buildIframeUrl({ paymentToken, iframeId = process.env.PAYMOB_IFRAME_ID }) {
  return `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;
}

module.exports = { getAuthToken, createOrder, createPaymentKey, buildIframeUrl };