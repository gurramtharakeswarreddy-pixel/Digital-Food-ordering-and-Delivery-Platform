# Feature-to-file map

| Feature | Existing UI source | Integration source / remaining work |
|---|---|---|
| Homepage, navigation, theme | `home.html`, `styles.css` | Preserved; menu remains legacy until frontend menu migration is finished |
| Item detail, wishlist | `item_details.html` | Existing local interactions; migrate item lookup/cart writes to `PaneshAPI` |
| Cart, promos, checkout | `cart.html` | `panesh-api.js` exposes API methods; replace localStorage order path and wire Razorpay Checkout |
| Customer auth | `login.html`, `index.html`, `signup.html` | `auth.js`, `app-config.js`, Supabase Auth |
| Admin sign-in | `admin.html` | `admin-auth.js`; checks server-side role before redirect |
| Admin dashboard metrics | `dashboard.html` | `dashboard-bridge.js` fetches live metrics; remaining controls still need API migration |
| Order confirmation and receipt | `order-confirmation.html` | `backend/src/services/receipt.js`, authenticated receipt endpoint; update page to request server PDF |
| API | Added `backend/src/app.js`, `backend/src/routes/*` | Versioned Express API |
| Database | Added `supabase/migrations/*` | PostgreSQL schema, RLS, storage and atomic business routines |
| Payments | `backend/src/routes/payments.js` | Razorpay test integration; Checkout UI wiring and live test remain |
| Email | `backend/src/services/email.js` | Optional Resend send + delivery log; durable retry worker remains |
| Deploy | Added `render.yaml`, `netlify.toml` | Configure secrets and URLs in platform dashboards |
