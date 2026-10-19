# Implementation status — honest verification record

## Added in this package
- Express API with health endpoint, menu/category reads, authenticated customer order/history/detail/receipt routes, Razorpay order/verify/webhook endpoints, admin dashboard metrics, order list/status, counter payment, menu CRUD, audit-log read and QR collection route.
- Supabase schema for profiles/roles, categories/menu, orders/items, payments, inventory movements, status history, QR tokens, email logs, promo codes and audit logs.
- RLS policies and public menu image bucket policies.
- Atomic SQL order creation with current database pricing, stock locks, inventory movement logging and idempotency key.
- SQL routines for verified payment processing, failed payment stock release, staff counter payment, admin order status changes and QR collection.
- Supabase email/password login/signup and Google OAuth initiation in customer auth pages; hardcoded admin demo login removed.
- PDF receipt service, secure QR token storage, optional Resend confirmation email with PDF attachment.
- Server-only `.env.example`, Netlify headers config, Render blueprint and deployment guides.

## Not yet complete — do not launch production yet
- Existing `home.html`, `item_details.html`, `cart.html`, `order-confirmation.html` inline scripts still have legacy localStorage behavior in places. The shared API client is added, but not every customer UI control is migrated to it.
- Admin dashboard stats are connected to the API and admin entry is role-checked, but several menu/order management controls and charts remain legacy UI logic; wire them to `window.PaneshAdmin.api(...)` and remove localStorage writes before production.
- A complete Razorpay Checkout modal integration on the existing cart page is not yet wired. Backend order creation, signature verification, and webhook handlers are implemented but require real Test Mode credentials and end-to-end validation.
- Email is sent synchronously as an optional best-effort action; a durable background queue/retry worker is not yet implemented. Email failure does not undo order creation.
- Receipt QR token is returned at initial order creation; idempotent replay currently cannot recover the original plaintext token because only its hash is stored. A token rotation/reissue workflow should be added before relying on repeat receipt downloads.
- Tax, promo-code redemption, refunds, staff scanner camera integration, customer profile editing and operational reports need business-rule confirmation/implementation where applicable.
- RLS and SQL migrations have not been applied to a live Supabase project. Google OAuth, Razorpay, Resend, Netlify and Render have not been tested with live account credentials.
- Automated test coverage is a starter, not a full end-to-end suite. Do not interpret passing syntax checks as proof of production readiness.

## Release gate
Before launch: finish remaining frontend migrations, add token reissue, implement durable email retry and refund workflow, review SQL/RLS with the actual project, run API integration tests and Razorpay test payments, and manually test all customer/admin flows on desktop and mobile.
