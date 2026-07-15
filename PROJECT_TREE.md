# NourmehrWebsite — Project Map (reference)

Persian/RTL e-commerce "Noor Mehr" (نورمهر). Vue 3 + Vite frontend, Express + MongoDB backend.

## Stack
- Frontend: Vue 3 (script setup), Pinia, vue-router, axios, @google/model-viewer (3D .glb), Google Sign-In.
- Backend: Express, Mongoose, JWT auth, bcryptjs, passport-google-oauth20, multer (uploads), Zarinpal payment, SMS (Kavenegar/Melipayamak/log).
- Dev: Vite dev server on :5000 proxies `/api` and `/uploads` to backend on :3001.

## Root
```
index.html              # entry, lang=fa, loads Google GSI + model-viewer
vite.config.js          # :5000, proxy /api + /uploads -> :3001
package.json            # frontend deps (also lists backend deps - express5/mongoose9)
.replit                 # runs frontend(:5000) + backend(node backend/server.js :3001)
.env.development.example # VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID
QUICK_START.md          # Persian setup guide (admin@example.com / Admin123!)
```

## Backend (`/backend`)  — entry: server.js (PORT env || 5000)
```
server.js               # express app, rate limit, helmet, cors, routes, seeds on mongo 'open'
config/
  db.js                 # mongoose connect w/ retry
  passport.js           # google oauth strategy (conditional on env)
middleware/
  authMiddleware.js     # protect (JWT) + admin guard  (verbose console logs)
  upload.js             # multer disk -> ../../uploads/products, 5MB, image filter
models/
  User.js  Product.js  Category.js  Cart.js  Order.js
  Payment.js  Discount.js  Ticket.js  Setting.js
routes/
  authRoutes  userRoutes  productRoutes  cartRoutes
  orderRoutes  paymentRoutes  adminRoutes  imageRoutes
controllers/
  authController  userController  productController
  cartController  orderController  paymentController  imageController
  admin/ dashboard, order, user, payment, ticket, discount, product, category, setting
services/
  zarinpalService.js    # initiate/verify payment
  smsService.js         # log | kavenegar | melipayamak
utils/
  generateToken.js  smsStore.js (in-memory)  seedAdmin.js  seedCategories.js
test.js                 # dead/incomplete admin-check script
```

### Backend API surface
```
/api/auth     register, login, me, logout, sms/request, sms/verify, google, google/callback
/api/user     profile(GET/PUT), change-password, addresses CRUD, dashboard/stats
/api/products (GET), /categories, /:id
/api/cart     get, add, item/:id (PUT/DEL), clear
/api/orders   validate-discount, create, list, :id, :id/cancel
/api/payments verify(public), initiate, status/:authority
/api/admin    dashboard, orders, users, payments, tickets, discounts, products, categories, settings
/api/images   :filename
```

## Frontend (`/src`)  — entry: main.js -> App.vue
```
main.js                 # createApp + pinia + router + main.css
App.vue                 # Navbar/Footer/ChatWidget hidden on /admin
router.js               # ACTIVE router (guards admin + requiresAuth via localStorage)
router/admin.js         # DUPLICATE/unused router (dead code)
services/
  api.js                # axios instance, JWT from localStorage, 401 -> /login   (NO contentApi export)
  adminApi.js           # all /admin endpoints
  paymentApi.js         # initiate / verify(stub) / status / retry
utils/imageUrl.js       # getImageUrl, getProductImages
data/products.js        # legacy STATIC product data (old shape: details/discount/oldPriceFormatted)
stores/
  auth.js   cart.js   products.js   orders.js
  addresses.js   wishlist.js (localStorage)   content.js (imports missing contentApi)
components/
  Navbar  Hero  Products  ProductDetails  Toast  ChatWidget(mock)
  Footer  Features  Testimonials  Announcements
views/
  Home  About  Contact  Collection  Search  Cart  Checkout
  Login  PaymentCallback  NotFound
  user/   UserLayout, UserDashboard, UserProfile, UserOrders, UserAddresses, UserWishlist
  admin/  AdminLayout, AdminDashboard, AdminProducts, AdminOrders, AdminUsers,
          AdminPayments, AdminTickets, AdminDiscounts, AdminSettings, AdminCategories
assests/  main.css, fonts/DimaShekasteh.ttf, logo, backgrounds   (note: "assests" misspelling)
```

## Data-shape note (source of several bugs)
- Legacy `data/products.js` shape: `id, image, details, discount, price(number), oldPriceFormatted, priceFormatted`.
- API/Mongo Product shape: `_id, mainImage, description, discountPercent, price(number), oldPrice(number), priceFormatted/finalPriceFormatted` (added by productController for list/detail).
- Several components still read the legacy fields, so they render blank or raw numbers when fed API data.
