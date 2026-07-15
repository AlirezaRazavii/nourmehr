# Noor Mehr — Bug & Issue Audit

Reviewed: all backend source + all frontend source (stores, services, router, views, components).
Severity: **Critical** = breaks a core flow · **High** = breaks a feature · **Medium** = wrong/partial behavior · **Low** = cleanup.

---

## CRITICAL

### C1. Login page crashes — auth store has no `state`
`src/views/Login.vue` line 8: `const { state: authState, ... } = useAuth()`.
The auth store (`stores/auth.js`) never returns a `state` object, so `authState` is `undefined`, and `const isLoading = computed(() => authState.isLoading)` throws `Cannot read 'isLoading' of undefined` when the form renders (used in `:disabled="isLoading"`).
Fix: use `storeToRefs(authStore)` for `isLoading`, or read `authStore.isLoading`. Same anti-pattern in `UserDashboard.vue` and `AdminLayout.vue` (see C2/H-list).

### C2. Google login calls a function that doesn't exist
`Login.vue` destructures `loginWithGoogle` from `useAuth()`, but the auth store never defines/exports it. Clicking "Google" → `loginWithGoogle is not a function`. Either implement `loginWithGoogle(credential)` in the store (POST the Google credential to backend) or remove the button. Note the backend Google flow is redirect-based (`/api/auth/google`), not credential-based, so the front/back Google strategies don't match either.

### C3. Successful online payment is shown as FAILED
Backend `paymentController.verifyOnlinePayment` redirects to `CLIENT_URL/payment/callback?status=success&refId=...&orderRef=...`.
`PaymentCallback.vue` (onMounted) reads `status = route.query.Status || route.query.status` → gets `"success"`, then calls `paymentApi.verifyPayment(authority, status === 'OK' ? 'paid' : 'failed')`. Since `"success" !== "OK"`, it passes `'failed'`, and the stub returns `{ success: false }` → the user sees "پرداخت ناموفق" even on success. Also `refId` is in the query but never read.
Fix: in PaymentCallback, treat `status === 'success'` as success and read `route.query.refId` / `orderRef` directly (the backend already verified with Zarinpal; no second call needed).

### C4. `content` store imports a non-existent export
`stores/content.js` line 3: `import { contentApi } from '../services/api'`. `services/api.js` only has a default export — there is no `contentApi`. Every content action (`getSliders`, `getBanners`, `getSettings`, all admin slider/banner CRUD) throws `Cannot read properties of undefined`. Public slider fetch is saved by a try/catch fallback, but settings/banners silently fail and any admin content screen using this store breaks. There are also no backend routes for sliders/banners. Fix: remove the store/feature or implement `contentApi` + backend endpoints.

### C5. UserOrders page is broken by field-name mismatches
`views/user/UserOrders.vue` reads `order.id`, `order.date`, `order.statusText`, `order.totalFormatted`, `order.shipping`, and `item.image/price`. The backend Order returns `_id`, `createdAt`, `status`, `total`, `shippingInfo` (no `statusText`/`totalFormatted`/`shipping`/`date`/`id`).
Consequences: totals render blank; `goToOrderDetail` finds by `o.id` (always undefined) so the detail panel never opens; if it did, `selectedOrder.shipping.name` would throw. Fix: map to `_id/createdAt/status/total/shippingInfo`, use `getStatusStyle(status).text`, and format totals.

---

## HIGH

### H1. ProductDetails shows the wrong product (and raw/blank fields)
`components/ProductDetails.vue` never calls `productStore.fetchProduct(id)`. It loads `fetchProducts()` (default limit = 12) and does `allProducts.find(p => p._id === id) || allProducts[0]`. Any product not in the first 12 → falls back to **the first product**. It also reads legacy fields that API products don't have: `product.details` (API uses `description`), `product.discount` (API uses `discountPercent`), and prints `{{ product.price }}`/`{{ product.oldPrice }}` **unformatted** (e.g. `25000000 تومان`). Fix: fetch the single product by id/slug and use API field names + `priceFormatted`.

### H2. Fetching a product by slug throws 500
`controllers/productController.getProductBySlugOrId` uses `Product.findOne({ $or: [{ _id: id }, { slug: id }] })`. When `id` is a slug (not a valid ObjectId), Mongoose throws a CastError casting it to `_id`, so slug lookups 500 instead of resolving. Fix: only include `{ _id: id }` when `mongoose.Types.ObjectId.isValid(id)`.

### H3. Order item image path double-prefixed
`orderController.createOrder` stores `image: \`/uploads/products/${product.mainImage}\``, but `mainImage` is already a full path like `/uploads/products/xxx.jpg` (that's what `uploadProductImage` returns and what the admin saves). Result: `/uploads/products//uploads/products/xxx.jpg` → broken order images. `cartController.getCart` uses `product.mainImage` raw (correct), so the two are inconsistent. Fix: store `product.mainImage` as-is in order items.

### H4. seedAdmin wipes & recreates admin on EVERY server start
`server.js` runs `seedAdmin()` inside `mongoose.connection.once('open')`, and `seedAdmin` does `User.deleteOne({email:'admin@example.com'})` then recreates it with the default password each boot. Any admin password change (or an admin re-using that email) is reset on restart. Also `seedAdmin` calls `mongoose.connect()` again though the app is already connected. Fix: only create the admin if missing (`findOne` → create), don't delete.

### H5. UserDashboard support tickets hit a missing route
`UserDashboard.vue` fetches `/api/user/support-tickets` (no such backend route → 404) and builds the header with `authState.token` where `authState` is `undefined` (same `state` bug as C1). Tickets never load. Fix the destructure and either add the route or remove the section.

### H6. Backend port mismatch vs docs
`server.js` listens on `process.env.PORT || 5000`, but `.replit`/`vite.config.js` expect the backend on **3001** (and the frontend on 5000). If `PORT` isn't set to 3001, the backend collides with the Vite dev server on 5000 and `/api` proxying fails. `QUICK_START.md` additionally claims backend:5000 / frontend:5173 — three different stories. Fix: set `PORT=3001` in backend `.env` and align the docs.

---

## MEDIUM

### M1. Reactivity lost by destructuring stores
`AdminLayout.vue` (`const { state, userName, logout } = useAuth()`) and `UserDashboard.vue` read `userName` by destructuring the store object instead of `storeToRefs`. They get a one-time value; the displayed name won't update reactively. (UserLayout/UserProfile do it correctly with `storeToRefs`.)

### M2. Collection & Search show unformatted prices
`Collection.vue` prints `{{ product.price }}` and `{{ product.oldPrice }}` (raw numbers). `Search.vue` falls back correctly with `Number(...).toLocaleString('fa-IR')`. The product list endpoint already returns `priceFormatted`/`finalPriceFormatted` — use them consistently.

### M3. Wishlist effectively non-functional with API data
`stores/wishlist.js` keys items by `product.id` and stores numeric ids, but API products only have `_id`. The heart buttons in `Products.vue`/`Collection.vue` have no click handler at all, and `UserWishlist` resolves items via `getProductById(item.id)` which won't match `_id`. The whole wishlist path is stubbed/broken. Decide: wire it to `_id` or remove.

### M4. Duplicate `onMounted` + double fetch in Products.vue
`components/Products.vue` has two separate `onMounted` hooks (lines ~247 and ~314), both calling `productStore.fetchProducts()` — products are fetched twice on every mount.

### M5. `/user/orders/:id` route doesn't exist
`UserDashboard.goToOrder` pushes `/user/orders/${id}`, but the router only defines `/user/orders` (no `:id` child). Navigation renders an empty UserLayout view. Add the child route or change the link.

### M6. Password change UI is non-functional
`UserProfile.vue` shows current/new/confirm password fields, but `handleUpdate` only sends `{name,email,phone}` and never calls the `change-password` endpoint. The standalone "تغییر رمز عبور" button has no handler. Backend `/api/user/change-password` exists and is unused.

### M7. Auth relies on localStorage only; verbose token logging
Login returns the JWT in the JSON body and the app stores it in `localStorage` (never as the httpOnly cookie the router/`logout` assume). Works, but means XSS can read the token. Also `authMiddleware.js` and `api.js` `console.log` token fragments on every request — noisy and a minor info leak; remove before production.

---

## LOW / CLEANUP
- `src/router/admin.js` is a second router that's never imported — dead code (delete to avoid confusion).
- `backend/test.js` defines `checkAdmin()` but never calls it and is truncated — dead file.
- Folder is named `src/assests` (typo for "assets") — harmless but confusing.
- Root `package.json` mixes backend deps (express 5, mongoose 9) while `backend/package.json` pins express 4 / mongoose 7; running the backend from the repo root could load incompatible major versions. Keep backend deps only in `backend/`.
- `QUICK_START.md` references docs that don't exist in the repo (`ENV_REFERENCE.md`, `backend/SETUP_GUIDE.md`, `backend/DATABASE_AND_SETUP.md`, `backend/SUPPORT_AI_WIDGET.md`).
- ChatWidget is a front-end-only simulated bot; the "AI support" API mentioned in QUICK_START isn't implemented.
- Discount usage isn't per-user and `usedCount` increments without a transaction (minor race under load).
- `createOrder` for `paymentMethod: 'online'` leaves order `status: 'pending'` and creates a `provider: 'mock'` payment before `initiate` swaps it to zarinpal — works, but the intermediate state is messy.

---

## Suggested fix order
1. C1, C2 (login usable) → C3 (payment result correct) → C5 (orders visible).
2. H2, H1, H3 (product browse + order images correct).
3. H4, H6 (admin persistence + ports) so the environment is stable.
4. C4, M-series, then Low cleanup.
