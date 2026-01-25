const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");

function environment() {
  if (process.env.PAYPAL_MODE === "live") {
    return new checkoutNodeJssdk.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  }
  return new checkoutNodeJssdk.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
}

const client = new checkoutNodeJssdk.core.PayPalHttpClient(environment());

async function createOrder({ amount, currency = "USD", returnUrl, cancelUrl }) {
  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount,
        },
      },
    ],
    application_context: {
      brand_name: process.env.PAYPAL_BRAND_NAME || "Ma3refa Platform",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  });

  const response = await client.execute(request);
  return response.result;
}

async function captureOrder(orderId) {
  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client.execute(request);
  return response.result;
}

module.exports = { createOrder, captureOrder };