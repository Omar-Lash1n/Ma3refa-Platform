// Webhook & capture handlers for stripe, paypal, paymob and fake simulate
const { stripe } = require("../services/stripeService");
const { captureOrder } = require("../services/paypalService");
const PaymentModel = require("../models/paymentModel");
const { finalizePayment } = require("./paymentController");

// Stripe webhook handler (uses req.rawBody set by express.json verify)
const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    // Use the raw body buffer we captured in express.json verify
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error("stripeWebhookHandler: rawBody missing");
      return res.status(400).send("rawBody missing");
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = session.metadata && session.metadata.paymentId;
      if (paymentId) await finalizePayment(paymentId);
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      if (intent.metadata && intent.metadata.paymentId) {
        await PaymentModel.findByIdAndUpdate(intent.metadata.paymentId, { status: "Failed", gateway_ref: intent.id });
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Error handling stripe event:", err);
    res.status(500).end();
  }
};

// PayPal capture endpoint — frontend should POST { orderId, paymentId }
const paypalCaptureHandler = async (req, res) => {
  const { orderId, paymentId } = req.body;
  if (!orderId || !paymentId) return res.status(400).json({ message: "orderId and paymentId required" });

  try {
    const capture = await captureOrder(orderId);
    const status = capture.status || (capture.purchase_units && capture.purchase_units[0].payments && capture.purchase_units[0].payments.captures[0].status);
    if (status && status.toLowerCase() === "completed") {
      await PaymentModel.findByIdAndUpdate(paymentId, { status: "Successful", gateway_ref: orderId });
      await finalizePayment(paymentId);
      return res.json({ message: "Payment captured and finalized", capture });
    }
    await PaymentModel.findByIdAndUpdate(paymentId, { status: "Failed", gateway_ref: orderId });
    res.status(400).json({ message: "PayPal capture not completed", capture });
  } catch (err) {
    console.error("PayPal capture error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Paymob callback handler
const paymobCallbackHandler = async (req, res) => {
  try {
    const event = req.body;
    const merchant_order_id = event && event.merchant_order_id;
    const order_id = event && event.order && event.order.id;
    let payment;
    if (merchant_order_id) payment = await PaymentModel.findById(merchant_order_id);
    else if (order_id) payment = await PaymentModel.findOne({ gateway_ref: order_id });
    if (!payment) {
      console.warn("Paymob callback: payment not found for payload", event);
      return res.json({ received: true });
    }

    // Minimal generic detection — adapt to real Paymob payload
    const isSuccess = event.success || (event.amount_cents && event.is_paid);
    if (isSuccess) {
      await PaymentModel.findByIdAndUpdate(payment._id, { status: "Successful", gateway_ref: order_id || payment.gateway_ref });
      await finalizePayment(payment._id);
    } else {
      await PaymentModel.findByIdAndUpdate(payment._id, { status: "Failed", gateway_ref: order_id || payment.gateway_ref });
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Paymob callback handler error:", err);
    res.status(500).end();
  }
};

// Fake simulate handler (developer)
const simulateHandler = async (req, res) => {
  const { paymentId, status = "Successful" } = req.query;
  if (!paymentId) return res.status(400).send("paymentId required");

  try {
    if (status === "Successful") {
      await PaymentModel.findByIdAndUpdate(paymentId, { gateway_ref: `fake_sim_${paymentId}`, status: "Successful" });
      await finalizePayment(paymentId);
      return res.send("Simulated payment success processed");
    } else {
      await PaymentModel.findByIdAndUpdate(paymentId, { status: "Failed", gateway_ref: `fake_sim_${paymentId}` });
      return res.send("Simulated payment failure processed");
    }
  } catch (err) {
    console.error("simulateHandler error:", err);
    res.status(500).send(err.message);
  }
};

module.exports = { stripeWebhookHandler, paypalCaptureHandler, paymobCallbackHandler, simulateHandler };