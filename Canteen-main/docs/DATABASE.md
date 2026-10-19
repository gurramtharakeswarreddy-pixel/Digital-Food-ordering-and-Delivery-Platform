# Database model and operational rules

## Core relationships
- `auth.users` → `profiles` (one-to-one; new users receive the `customer` role).
- `categories` → `menu_items` (one-to-many).
- `profiles` → `orders` (customer ownership).
- `orders` → `order_items`, `payments`, `inventory_movements`, `order_status_history`, `order_qr_tokens`, `email_delivery_logs`.
- `menu_items` → `order_items` and `inventory_movements`.
- `audit_logs` records sensitive staff operations.

## Money
Amounts are PostgreSQL `numeric(12,2)` in INR. The browser never submits an authoritative total. The current initial implementation has zero tax and no discount at order creation; promo redemption and tax rules must be added before enabling those UI features.

## Inventory policy
1. On order creation, a transaction locks menu rows, validates availability and current stock, calculates the subtotal from database prices, decrements stock and records `order_reserved` movements.
2. Failed online payment cancels the order and releases stock once.
3. Cancelling an unpaid order releases stock once.
4. Paid orders are not cancellable until a refund workflow is implemented.
5. Counter orders reserve stock at placement and remain payment-pending until staff records payment.
6. All stock movements are logged. Admin stock editing should be extended to write an inventory movement for each manual adjustment before production.

## Roles
`customer`, `staff`, `admin`, `owner`. A newly created profile always receives `customer`. The initial owner role is assigned through a trusted SQL operation by the project owner; never from signup metadata or request bodies.

## RLS
RLS is enabled on application tables. Browser users can read their own profile/orders/order items/payments/status history and public active menu/categories. No browser write policy is granted for orders, payments, stock, QR tokens, email logs, or audit logs. The backend uses a server-only service role, so every route must perform its own identity/role/ownership check.
