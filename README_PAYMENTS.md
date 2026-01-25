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