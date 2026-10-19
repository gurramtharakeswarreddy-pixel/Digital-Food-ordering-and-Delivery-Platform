# Existing project audit

## Detected source
- Static multi-page HTML/CSS/JavaScript; no React/Vue build system.
- `home.html`: menu landing page, search/filter, cart access, local cart state.
- `item_details.html`: item details, wishlist and add-to-cart interactions.
- `cart.html`: cart, promo-code UI, checkout/order creation in browser storage.
- `login.html`, `index.html`, `signup.html`: localStorage customer authentication (replaced with Supabase Auth wiring).
- `admin.html`: hardcoded `admin` / `1234` demo authentication (removed and replaced with Supabase Auth + backend role check).
- `dashboard.html`: admin dashboard and management functions, previously backed by localStorage.
- `order-confirmation.html`: confirmation, receipt download and legacy order storage.
- `styles.css`: shared blue/teal palette, Poppins/Tapestry fonts, responsive layout, theme and animations.
- `README.md`: legacy project documentation and demo credentials.

## Risks
1. Browser storage can be edited and is not authoritative for identity, orders, prices, payment, inventory, or revenue.
2. Original cart/order/dashboard inline scripts are tightly coupled to existing markup; replacing them wholesale risks visual regressions.
3. `images/logo1.png` is referenced but not included in the supplied archive.
4. Legacy documentation mentions demo credentials. Do not use them in production.
5. Existing receipt page uses client-side PDF generation and must be switched to the authenticated backend receipt endpoint in the final frontend migration.

## Integration plan
1. Keep current HTML pages and CSS.
2. Add backend, migrations, RLS, configuration, and documentation in separate folders.
3. Replace customer login/signup and admin demo login.
4. Add shared API client and server-backed dashboard metric bridge.
5. Migrate remaining cart/order/menu/admin controls in targeted patches, verifying each page visually and behaviorally.
