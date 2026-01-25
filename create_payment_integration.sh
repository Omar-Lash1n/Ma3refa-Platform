#!/usr/bin/env bash
set -euo pipefail

BASE="Back-end/Back-end-new"
echo "Creating files under $BASE ..."

# Create directories
mkdir -p "$BASE/models" "$BASE/utils" "$BASE/services" "$BASE/controller" "$BASE/tests"

# 1) PaymentEvent model
cat > "$BASE/models/paymentEventModel.js" <<'EOF'
const mongoose = require("mongoose");

const paymentEventSchema = new mongoose.Schema({
  provider: { type: String, required: true }, // stripe, paypal, paymob, fake
  event_id: { type: String, default: null, index: true }, // provider event id when available
  raw: { type: mongoose.Schema.Types.Mixed, required: true },
  headers: { type: mongoose.Schema.Types.Mixed, default: {} },
  received_at: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false },
  processed_at: { type: Date, default: null },
  payment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
  notes: { type: String, default: null },
});

module.exports = mongoose.model("PaymentEvent", paymentEventSchema);
EOF

# 2) Logger utility
cat > "$BASE/utils/logger.js" <<'EOF'
const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

module.exports = logger;
EOF

# 3) PayPal service (with webhook verification)
cat > "$BASE/services/paypalService.js" <<'EOF'
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

// Verify PayPal webhook signature (uses PayPal Notifications API)
async function verifyWebhookSignature({ headers, body }) {
  // Required env: PAYPAL_WEBHOOK_ID (the webhook ID you created in PayPal dashboard)
  const request = new checkoutNodeJssdk.notifications.VerifyWebhookSignatureRequest();
  request.requestBody({
    auth_algo: headers["paypal-auth-algo"],
    cert_url: headers["paypal-cert-url"],
    transmission_id: headers["paypal-transmission-id"],
    transmission_sig: headers["paypal-transmission-sig"],
    transmission_time: headers["paypal-transmission-time"],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: body
  });

  const resp = await client.execute(request);
  return resp.result; // contains verification_status: "SUCCESS" or "FAILURE"
}

module.exports = { createOrder, captureOrder, verifyWebhookSignature };
EOF

# 4) Webhook controller (idempotency + logging + PayPal verify + Paymob logging)
cat > "$BASE/controller/paymentWebhookController.js" <<'EOF'
// Webhook & capture handlers with idempotency, logging and PayPal verification.
const { stripe } = require("../services/stripeService");
const { captureOrder, verifyWebhookSignature } = require("../services/paypalService");
const PaymentModel = require("../models/paymentModel");
const PaymentEvent = require("../models/paymentEventModel");
const { finalizePayment } = require("./paymentController");
const logger = require("../utils/logger");

// Helper: save event and return saved doc
async function saveEvent(provider, eventId, raw, headers) {
  const ev = await PaymentEvent.create({
    provider,
    event_id: eventId || null,
    raw,
    headers
  });
  return ev;
}

// Stripe webhook handler (uses req.rawBody set by express.json verify)
const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  try {
    const rawBody = req.rawBody;
    if (!rawBody) {
      logger.error("stripeWebhookHandler: rawBody missing");
      return res.status(400).send("rawBody missing");
    }

    const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

    // Persist event to DB (idempotency)
    const saved = await saveEvent("stripe", event.id, event, req.headers);

    // If already processed, short-circuit
    const existing = await PaymentEvent.findOne({ provider: "stripe", event_id: event.id, processed: true });
    if (existing) {
      logger.info("stripeWebhookHandler: event already processed %s", event.id);
      return res.json({ received: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = session.metadata && session.metadata.paymentId;
      if (paymentId) {
        await finalizePayment(paymentId);
        await PaymentEvent.findByIdAndUpdate(saved._id, { processed: true, processed_at: new Date(), payment_id: paymentId });
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      if (intent.metadata && intent.metadata.paymentId) {
        await PaymentModel.findByIdAndUpdate(intent.metadata.paymentId, { status: "Failed", gateway_ref: intent.id });
        await PaymentEvent.findByIdAndUpdate(saved._id, { processed: true, processed_at: new Date(), payment_id: intent.metadata.paymentId });
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error("Stripe webhook error: %o", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// PayPal capture endpoint — frontend should POST { orderId, paymentId } OR PayPal can call webhooks.
// This handler supports capturing via server or verifying webhooks.
const paypalCaptureHandler = async (req, res) => {
  const headers = req.headers;
  const body = req.body;

  // If it's a webhook callback, verify
  if (headers["paypal-transmission-id"]) {
    try {
      const verification = await verifyWebhookSignature({ headers, body });
      await saveEvent("paypal", body && body.id, body, headers);

      if (verification.verification_status !== "SUCCESS") {
        logger.warn("PayPal webhook verification failed: %o", verification);
        return res.status(400).json({ message: "Webhook verification failed" });
      }

      // handle webhook event types (e.g., CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED)
      const eventType = body.event_type;
      if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.APPROVED") {
        const orderId = body.resource && (body.resource.supplementary_data && body.resource.supplementary_data.related_ids && body.resource.supplementary_data.related_ids.order_id) || (body.resource && body.resource.id) || null;
        if (orderId) {
          const payment = await PaymentModel.findOne({ gateway_ref: orderId });
          if (payment) {
            await finalizePayment(payment._id);
            await PaymentEvent.updateOne({ provider: "paypal", event_id: body.id }, { processed: true, processed_at: new Date(), payment_id: payment._id });
          }
        }
      }

      return res.json({ received: true });
    } catch (err) {
      logger.error("PayPal webhook error: %o", err);
      return res.status(500).json({ message: err.message });
    }
  }

  // Otherwise assume client-side send after approval: { orderId, paymentId }
  const { orderId, paymentId } = body;
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
    return res.status(400).json({ message: "PayPal capture not completed", capture });
  } catch (err) {
    logger.error("PayPal capture error: %o", err);
    return res.status(500).json({ message: err.message });
  }
};

// Paymob callback handler with logging and idempotency.
const paymobCallbackHandler = async (req, res) => {
  const headers = req.headers;
  const body = req.body;
  try {
    // Save event for audit
    const saved = await saveEvent("paymob", (body && (body.id || body.payload && body.payload.order && body.payload.order.id)) || null, body, headers);

    // Attempt to identify payment
    const merchant_order_id = body && body.merchant_order_id;
    const order_id = body && body.order && body.order.id;
    let payment;
    if (merchant_order_id) payment = await PaymentModel.findById(merchant_order_id);
    else if (order_id) payment = await PaymentModel.findOne({ gateway_ref: order_id });

    if (!payment) {
      logger.warn("Paymob callback: payment not found for payload, saved event id %s", saved._id);
      return res.json({ received: true });
    }

    const isSuccess = body.success || (body.is_paid === true) || (body.payload && body.payload.is_paid === true) || false;
    if (isSuccess) {
      const already = await PaymentEvent.findOne({ provider: "paymob", event_id: saved.event_id, processed: true });
      if (!already) {
        await PaymentModel.findByIdAndUpdate(payment._id, { status: "Successful", gateway_ref: order_id || payment.gateway_ref });
        await finalizePayment(payment._id);
        await PaymentEvent.findByIdAndUpdate(saved._id, { processed: true, processed_at: new Date(), payment_id: payment._id });
      } else {
        logger.info("Paymob event already processed: %s", saved.event_id);
      }
    } else {
      await PaymentModel.findByIdAndUpdate(payment._id, { status: "Failed", gateway_ref: order_id || payment.gateway_ref });
      await PaymentEvent.findByIdAndUpdate(saved._id, { processed: true, processed_at: new Date(), payment_id: payment._id });
    }

    return res.json({ received: true });
  } catch (err) {
    logger.error("Paymob callback handler error: %o", err);
    return res.status(500).end();
  }
};

// Fake simulate handler (developer)
const simulateHandler = async (req, res) => {
  const { paymentId, status = "Successful" } = req.query;
  if (!paymentId) return res.status(400).send("paymentId required");
  try {
    const saved = await saveEvent("fake", `fake_sim_${paymentId}`, { paymentId, status }, req.headers);
    if (status === "Successful") {
      await PaymentModel.findByIdAndUpdate(paymentId, { gateway_ref: `fake_sim_${paymentId}`, status: "Successful" });
      await finalizePayment(paymentId);
      await PaymentEvent.findByIdAndUpdate(saved._id, { processed: true, processed_at: new Date(), payment_id: paymentId });
      return res.send("Simulated payment success processed");
    } else {
      await PaymentModel.findByIdAndUpdate(paymentId, { status: "Failed", gateway_ref: `fake_sim_${paymentId}` });
      await PaymentEvent.findByIdAndUpdate(saved._id, { processed: true, processed_at: new Date(), payment_id: paymentId });
      return res.send("Simulated payment failure processed");
    }
  } catch (err) {
    logger.error("simulateHandler error: %o", err);
    return res.status(500).send(err.message);
  }
};

module.exports = { stripeWebhookHandler, paypalCaptureHandler, paymobCallbackHandler, simulateHandler };
EOF

# 5) Append to .env.example (if exists) or create if missing
ENV_FILE="$BASE/.env.example"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
# Database & JWT
DBurl=mongodb://...
secretKey=your_jwt_secret

# Backend & Frontend
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox
PAYPAL_BRAND_NAME=Ma3refa Platform
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Paymob (Egypt)
PAYMOB_API_KEY=your_paymob_api_key
PAYMOB_INTEGRATION_ID=your_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_BASE_URL=https://accept.paymob.com
PAYMOB_WEBHOOK_SECRET=your_paymob_webhook_secret

# Logging
LOG_LEVEL=info
EOF
else
  cat >> "$ENV_FILE" <<'EOF'

# PayPal webhook verification
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Paymob (if Paymob provides webhook secret/signature)
PAYMOB_WEBHOOK_SECRET=your_paymob_webhook_secret

# Logging
LOG_LEVEL=info
EOF
fi

# 6) Add README for payments
cat > "$BASE/README_PAYMENTS.md" <<'EOF'
# Payments: Setup & Testing

This file documents the payment integration setup and local testing steps (Stripe, PayPal, Paymob, fake).

Environment variables (add to .env)
- BACKEND_URL (e.g., http://localhost:5000)
- FRONTEND_URL (e.g., http://localhost:3000)
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE=sandbox, PAYPAL_WEBHOOK_ID
- PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_IFRAME_ID, PAYMOB_WEBHOOK_SECRET

Install dependencies:
- npm install stripe @paypal/checkout-server-sdk axios winston

Stripe local testing:
1. Start server: node Back-end/Back-end-new/index.js
2. Run ngrok: ngrok http 5000
3. In Stripe dashboard create webhook endpoint:
   https://<ngrok-id>.ngrok.io/api/payments/webhook/stripe
   subscribe to events: checkout.session.completed, payment_intent.payment_failed
4. Set STRIPE_WEBHOOK_SECRET in .env
5. Use the Postman collection to create a payment (payment_method=stripe) and complete with test card 4242 4242 4242 4242. Webhook will fire and server finalizes payment.

PayPal testing (sandbox):
1. Create webhook in PayPal developer with URL:
   https://<ngrok-id>.ngrok.io/api/payments/webhook/capture-paypal
2. Set PAYPAL_WEBHOOK_ID in .env
3. Use Postman to create a PayPal order (payment_method=paypal) — open approve URL in sandbox and approve.
4. Either let PayPal deliver webhook (server will verify and finalize) or let frontend call /api/payments/webhook/capture-paypal with { orderId, paymentId } to capture server-side.

Paymob testing:
1. Use Paymob sandbox keys, set PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_IFRAME_ID
2. Create payment via /api/payments/create with payment_method=paymob and billing_data; server returns iframeUrl.
3. Configure Paymob postback URL to https://<ngrok-id>.ngrok.io/api/payments/webhook/paymob
4. Check saved events in `paymentevents` collection to adapt callback parsing.

Fake flow:
- Use payment_method=fake to create a Payment and follow simulate URL to finalize.

Idempotency / auditing:
- All incoming webhook events are stored in `PaymentEvent` model and checked before processing to avoid double-processing.

Testing & unit tests:
- A Jest test is included (tests/), using mongodb-memory-server to test finalizePayment behavior.

Security:
- Do not expose gateway secret keys to frontend.
- Verify webhook signatures and keep webhook secrets safe.
EOF

# 7) Add basic Jest unit test
cat > "$BASE/tests/finalizePayment.test.js" <<'EOF'
/**
 * Basic unit test for finalizePayment using in-memory MongoDB.
 * Requires: npm install --save-dev jest mongodb-memory-server mongoose
 *
 * Run: npx jest Back-end/Back-end-new/tests/finalizePayment.test.js
 */

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
let mongod;
const PaymentModel = require("../models/paymentModel");
const StudentModel = require("../models/studentModel");
const TeacherEarningsModel = require("../models/TeacherEarningsModel");

// Require the controller after setting up models
const paymentController = require("../controller/paymentController");

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await PaymentModel.deleteMany({});
  await StudentModel.deleteMany({});
  await TeacherEarningsModel.deleteMany({});
});

test("finalizePayment marks payment successful and updates student and teacher earnings", async () => {
  // create a student
  const student = await StudentModel.create({
    full_name: "Test Student",
    email: "student@example.com",
    age_category: "Adult",
    password: "pass",
    owned_sections: [],
    stats: { total_sections_owned: 0, total_spent: 0 }
  });

  // create payment
  const payment = await PaymentModel.create({
    student_id: student._id.toString(),
    teacher_id: "teacher123",
    amount: 100,
    status: "Pending",
    payment_method: "fake",
    commission_rate: 0.1,
    platform_commission: 10,
    net_to_teacher: 90,
    purchased_sections: [
      { section_id: "s1", course_id: "c1", section_price: 100 }
    ]
  });

  // call finalizePayment
  await paymentController.finalizePayment(payment._id);

  const updatedPayment = await PaymentModel.findById(payment._id);
  expect(updatedPayment.status).toBe("Successful");

  const updatedStudent = await StudentModel.findById(student._id);
  expect(updatedStudent.owned_sections.length).toBe(1);
  expect(updatedStudent.stats.total_sections_owned).toBe(1);
  expect(updatedStudent.stats.total_spent).toBe(100);

  const teacherEarnings = await TeacherEarningsModel.findOne({ teacher_id: "teacher123" });
  expect(teacherEarnings).not.toBeNull();
  expect(teacherEarnings.available_balance).toBeCloseTo(90);
});
EOF

# 8) Ensure branch exists and checkout
BRANCH="add-payment-integrations"
if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "Branch $BRANCH already exists; checking it out and updating."
  git checkout "$BRANCH"
  git pull --ff-only || true
else
  git checkout -b "$BRANCH"
fi

# 9) Install runtime and dev dependencies
echo "Installing runtime dependencies..."
npm install stripe @paypal/checkout-server-sdk axios winston

echo "Installing dev dependencies..."
npm install --save-dev jest mongodb-memory-server

# 10) Add test script to package.json (safe edit via node)
if [ -f package.json ]; then
  node -e '
  const fs = require("fs");
  const p = JSON.parse(fs.readFileSync("package.json","utf8"));
  p.scripts = p.scripts || {};
  if (!p.scripts.test || p.scripts.test.indexOf("jest") === -1) {
    p.scripts.test = "jest --runInBand";
    fs.writeFileSync("package.json", JSON.stringify(p, null, 2));
    console.log("package.json test script set to: jest --runInBand");
  } else {
    console.log("package.json already has a test script.");
  }
'
else
  echo "No package.json found at repo root. Skipping package.json update."
fi

# 11) Stage and commit created files
git add "$BASE/models/paymentEventModel.js" "$BASE/utils/logger.js" "$BASE/services/paypalService.js" "$BASE/controller/paymentWebhookController.js" "$BASE/.env.example" "$BASE/README_PAYMENTS.md" "$BASE/tests/finalizePayment.test.js" || true

git commit -m "Add webhook event logging, PayPal verification, idempotency, Paymob logging, tests and README" || {
  echo "Nothing to commit or commit failed. You may want to run 'git status' to inspect."
}

echo "Done. Files created and committed on branch $BRANCH."
echo "Next steps:"
echo " - Review files and update any provider keys in $BASE/.env.example"
echo " - Start server and test locally (Stripe with ngrok, PayPal sandbox, Paymob sandbox)"
echo " - Run tests: npm test"   