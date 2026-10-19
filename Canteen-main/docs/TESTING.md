# Testing and verification

## Local checks
```bash
cd backend
npm install
npm test
node --check src/app.js
node --check src/routes/orders.js
node --check src/routes/payments.js
node --check src/routes/admin.js
```

## Manual test matrix (requires configured Supabase project)
- Register a customer; verify profile is created with `customer` role.
- Sign in with password; sign out; test expired session behavior.
- Configure Google OAuth in Supabase and test callback/redirect.
- Confirm customer token can access own orders but not another user's order.
- Confirm a customer token receives 403 from `/api/v1/admin/dashboard`.
- Create an order with a valid menu item; check price is taken from DB.
- Attempt unavailable item, invalid quantity, or insufficient stock.
- Submit concurrent orders for the last available item; only one may succeed.
- Repeat the same order idempotency key; ensure no duplicate order or stock decrement.
- Create counter order; ensure payment remains pending until staff records it.
- In Razorpay Test Mode, test captured, failed, cancelled, duplicate webhook and delayed webhook paths.
- Submit invalid Razorpay checkout signature and invalid webhook signature; both must be rejected.
- Check failed payment releases reserved stock exactly once.
- Generate PDF and confirm the QR verifies; test expired/revoked/random tokens.
- Confirm QR collection requires staff, paid status, ready-for-pickup status and cannot replay.
- Make email provider unavailable; ensure the order remains persisted and email failure is logged.
- Verify dashboard revenue excludes pending/failed payment attempts.
- Test responsive layout, dark/light mode and existing page links.

Do not claim live integration checks unless they were run with a configured provider. Current source-package verification is limited to archive inspection, generated-file review, and local syntax/test commands.
