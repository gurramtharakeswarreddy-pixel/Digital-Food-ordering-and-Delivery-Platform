# REST API reference

Base path: `/api/v1`. Successful responses use `{ "ok": true, "data": ... }`; errors use `{ "ok": false, "error": { "code", "message" } }`. Authenticated routes require `Authorization: Bearer <Supabase access token>`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public (`/api/health`, not versioned) | Health check |
| GET | `/menu` | Public | Available menu items; optional `search`, `category` |
| GET | `/menu/categories` | Public | Active categories |
| GET | `/menu/:id` | Public | One available menu item |
| POST | `/orders` | Customer | Create order; server prices and atomically reserves stock |
| GET | `/orders/mine` | Customer | Signed-in user's order history |
| GET | `/orders/:id` | Owner of order or staff | Order details and line items |
| GET | `/orders/:id/receipt?token=...` | Owner of order or staff + valid QR token | Download server-generated PDF |
| GET | `/orders/:id/verify-qr?token=...` | Public token verification | Limited order verification data |
| POST | `/payments/razorpay/order` | Customer / own order | Create provider order using database total |
| POST | `/payments/razorpay/verify` | Customer / own order | Verify signature and captured provider status |
| POST | `/webhooks/razorpay` | Razorpay signed webhook | Idempotent payment event processing |
| GET | `/admin/dashboard` | Staff/admin/owner | Database-derived metrics |
| GET | `/admin/orders?page=1&limit=25` | Staff/admin/owner | Paginated order list |
| PATCH | `/admin/orders/:id/status` | Staff/admin/owner | Change allowed order status |
| POST | `/admin/orders/:id/counter-payment` | Staff/admin/owner | Record counter payment and audit event |
| POST | `/admin/orders/:id/collect` | Staff/admin/owner | Validate QR and atomically mark collection |
| GET | `/admin/menu` | Staff/admin/owner | Menu management list |
| POST | `/admin/menu` | Staff/admin/owner | Create menu item |
| PATCH | `/admin/menu/:id` | Staff/admin/owner | Update menu item |
| GET | `/admin/audit-logs` | Owner | Read audit log |

### Create order request
```json
{
  "items": [{"menuItemId":"00000000-0000-0000-0000-000000000000","quantity":2}],
  "paymentMethod":"counter",
  "orderEmail":"customer@example.com",
  "idempotencyKey":"client-generated-random-key",
  "confirmAlternateEmail":false
}
```
If `orderEmail` differs from the authenticated email, set `confirmAlternateEmail: true` only after the UI explicitly confirms it with the customer. Do not trust client-supplied price, tax, discount or total.

### Status rules
- Payment status is independent of order status.
- Completion requires paid status.
- Cancelling a paid order is blocked until a refund workflow is implemented.
- Counter payment is recorded only by authorized staff.
- QR collection requires an unexpired valid token, a ready-for-pickup order, paid status, and staff role. Repeated collection is rejected.
