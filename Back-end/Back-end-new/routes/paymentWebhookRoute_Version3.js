const express = require("express");
const router = express.Router();
const { stripeWebhookHandler, paypalCaptureHandler, paymobCallbackHandler, simulateHandler } = require("../controller/paymentWebhookController");

// Stripe webhook: must use raw body parser
router.post("/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler);

// PayPal capture endpoint (server-side capture called by frontend after approval)
router.post("/capture-paypal", express.json(), paypalCaptureHandler);

// Paymob callback endpoint (configure this URL in Paymob dashboard)
router.post("/paymob", express.json(), paymobCallbackHandler);

// Fake simulate endpoint (developer)
router.get("/simulate", simulateHandler);

module.exports = router;