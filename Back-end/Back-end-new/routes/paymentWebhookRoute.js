const express = require("express");
const router = express.Router();
const { stripeWebhookHandler, paypalCaptureHandler, paymobCallbackHandler, simulateHandler } = require("../controller/paymentWebhookController");

// Stripe webhook: use express.json() so req.rawBody is available via global verify
router.post("/stripe", express.json(), stripeWebhookHandler);

// PayPal capture endpoint (server-side capture called by frontend after approval)
router.post("/capture-paypal", express.json(), paypalCaptureHandler);

// Paymob callback endpoint (configure this URL in Paymob dashboard)
router.post("/paymob", express.json(), paymobCallbackHandler);

// Fake simulate endpoint (developer)
router.get("/simulate", simulateHandler);

module.exports = router;