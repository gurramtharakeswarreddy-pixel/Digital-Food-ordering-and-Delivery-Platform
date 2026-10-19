# The Panesh Kitchen — full-stack integration

This repository preserves the supplied static HTML/CSS/JavaScript frontend and adds a Node.js/Express API, Supabase schema/RLS, Razorpay Test Mode plumbing, PDF/QR receipt services, and optional Resend email delivery.

## Audit findings and honest status

The source archive contained 9 HTML pages (`home.html`, `item_details.html`, `cart.html`, `login.html`, `index.html`, `signup.html`, `order-confirmation.html`, `admin.html`, and `dashboard.html`), `styles.css`, and an existing README. It did not contain a backend, SQL migrations, or project package manifest. Existing customer auth, cart/order logic, and admin demo authentication used browser storage. The old admin demo credential check was removed; customer login/signup now use Supabase Auth after configuration. The existing design files are retained.

**Important:** This is a deployment-ready integration foundation, not a claim that every original localStorage-driven feature has been fully migrated. The customer menu/cart/confirmation page event handlers and several dashboard management interactions still contain legacy local/demo behavior and must be migrated to `PaneshAPI`/admin endpoints before production launch. Razorpay, Supabase, Google OAuth, and email cannot be live-verified without your provider credentials. See `docs/IMPLEMENTATION_STATUS.md`.

## Architecture

- Existing frontend: static multi-page HTML and shared `styles.css`
- API: `backend/` (Node.js 20+, Express)
- Database/Auth/Storage: Supabase PostgreSQL, Supabase Auth, Storage
- Online payments: Razorpay Test Mode
- Receipts: PDFKit PDF + QRCode
- Email: optional Resend provider
- Deployment targets: Netlify (frontend), Render (API), Supabase (database/auth/storage)

## Local setup

### 1. Supabase

1. Create a Supabase project.
2. Apply `supabase/migrations/001_initial_schema.sql`, then `002_rls_storage.sql` using Supabase SQL Editor or Supabase CLI.
3. For development only, optionally run `supabase/seed.sql`.
4. In Authentication → URL Configuration, set your local Site URL and add the local login/home callback URLs. Enable Google provider and configure the Google OAuth client secret and authorized redirect URI using the callback shown in Supabase Authentication → Providers.
5. Configure email confirmation and password policies appropriate to your deployment.
6. Set the project URL and publishable/anon key in root `app-config.js`. These are public browser values. Never put the service role key here.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Fill `.env` with the Supabase project URL, public/anon key and **server-only** service-role key. Use the Razorpay test key ID/secret for online payments. Set `FRONTEND_ORIGIN` to the exact local origin used by your static server, for example `http://127.0.0.1:5500`, and `APP_BASE_URL` to the frontend origin. Start the static frontend from the repository root with VS Code Live Server or:

```bash
npx serve . -l 5500
```

Health check: `http://localhost:3000/api/health`.

### 3. Frontend configuration

Edit `app-config.js`:

```js
window.PANESH_CONFIG = Object.freeze({
  API_BASE_URL: 'http://localhost:3000/api/v1',
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY'
});
```

The Supabase publishable/anon key is designed for browser use with RLS. All service-role and provider secrets remain in backend environment variables.

### 4. Create the first owner safely

1. Register the intended owner account through `signup.html` or Supabase Auth.
2. Confirm the account if email confirmation is enabled.
3. In Supabase SQL Editor, verify the intended user UUID from Authentication → Users.
4. Run this one-time statement with the actual UUID after reviewing it:

```sql
update public.profiles
set role = 'owner', updated_at = now()
where id = 'REPLACE_WITH_THE_INTENDED_AUTH_USER_UUID';
```

Never expose a UI that lets a user assign their own role. Do not use a default password or commit account credentials.

### 5. Tests

```bash
cd backend
npm test
node --check src/server.js
```

Tests currently cover pure critical helper behavior and API syntax; run live end-to-end checks only after provider setup. See `docs/TESTING.md`.

## Deployment

### Supabase
Apply migrations in order. Review RLS and Storage policies. Configure Google OAuth callback URLs and production redirect URLs in Supabase and Google Cloud. Do not expose the service-role key.

### Render
Create a Web Service rooted at `backend/`. Build command: `npm install`; start command: `npm start`. Set all variables from `backend/.env.example` in Render dashboard. Set `FRONTEND_ORIGIN` to the production Netlify origin, `APP_BASE_URL` to the public frontend URL, and configure Razorpay webhook URL as `https://YOUR-RENDER-SERVICE/api/v1/webhooks/razorpay`. Configure the webhook secret independently from the Razorpay API secret.

### Netlify
Deploy the repository root as a static site (publish directory `.`; no build command required). Set production `API_BASE_URL` to `https://YOUR-RENDER-SERVICE/api/v1` and configure the Supabase URL/public key in `app-config.js` or replace this static config with your approved public build-time config process. Existing pages are multi-page HTML, so do not force an SPA catch-all redirect. `netlify.toml` supplies safe baseline headers.

## Security notes

- Backend validates bearer tokens against Supabase Auth and checks the server-side profile role.
- Never trust browser totals, status fields, or success callbacks.
- SQL order creation locks inventory rows and calculates prices from database records.
- Stock is reserved at order creation; failed online payments/cancellations release stock once. Paid-order cancellation requires a refund workflow and is blocked.
- Counter payments stay pending until authorized staff records payment.
- Razorpay callback signature and provider captured status are checked server-side; webhooks use raw-body signature validation.
- QR token is cryptographically random; only its hash is stored. QR collection is staff-only, status-gated, and atomic.
- PDF receipt endpoint requires authenticated order access and a valid QR token.
- Production use still requires review of email retry/queue strategy, payment refund operations, UI migration, and end-to-end tests.

## Files

See `docs/PROJECT_AUDIT.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/DEPLOYMENT_CHECKLIST.md`, and `docs/IMPLEMENTATION_STATUS.md`.
