// dotenv باید مطلقاً اولین خط اجرایی باشد؛
// وگرنه ماژول‌هایی مثل config/passport که در زمان require مقدار
// process.env را می‌خوانند، undefined دریافت می‌کنند.
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const multer = require('multer');

const passport = require('./config/passport');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const imageRoutes = require('./routes/imageRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const blogRoutes = require('./routes/blogRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const heroRoutes = require('./routes/heroRoutes');
const heroImageRoutes = require('./routes/heroImageRoutes');
const discountRoutes = require('./routes/discountRoutes');

const seedAdmin = require('./utils/seedAdmin');
const seedCategories = require('./utils/seedCategories');
const seedCollections = require('./utils/seedCollections');
const { invalidateCategoryCache, invalidateProductCache } = require('./utils/cache');

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3001;

/* ------------------------- بررسی متغیرهای حیاتی محیط ------------------------- */
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k] && !process.env[k.replace('MONGO_URI', 'MONGODB_URI')]);
if (missingEnv.length) {
  console.error('🔴 متغیرهای محیطی زیر تعریف نشده‌اند:', missingEnv.join(', '));
  if (IS_PROD) process.exit(1);
}
if (IS_PROD && !process.env.CLIENT_URL) {
  console.error('🔴 در حالت production مقدار CLIENT_URL الزامی است.');
  process.exit(1);
}

/* ---------------------------------- دیتابیس --------------------------------- */
connectDB();

mongoose.connection.once('open', async () => {
  console.log('🟢 MongoDB connection is open. Seeding admin, categories and collections...');
  try {
    await seedAdmin();
    await seedCategories();
    await seedCollections();
    // بعد از seed، کش عمومی باید باطل شود وگرنه تا ۱۰ دقیقه لیست خالی سرو می‌شود
    invalidateCategoryCache();
    invalidateProductCache();
    console.log('✅ Seeding finished.');
  } catch (err) {
    console.error('🔴 Seeding error:', err);
  }
});

mongoose.connection.on('error', (err) => console.error('🔴 MongoDB connection error:', err));
mongoose.connection.on('disconnected', () => console.warn('🟡 MongoDB disconnected'));

/* ----------------------------------- اپ ------------------------------------ */
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.set('etag', 'strong');

// هدرهای امنیتی قبل از هر چیز، تا فایل‌های استاتیک را هم پوشش بدهد
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
  })
);

const allowedOrigins = String(process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!IS_PROD) return callback(null, true);
    if (!origin) return callback(null, true); // curl / same-origin / server-to-server
    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) return callback(null, true);
    return callback(Object.assign(new Error('Not allowed by CORS'), { status: 403 }));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(compression({ level: 6, threshold: 1024 }));

/* ------------------------------ فایل‌های استاتیک ----------------------------- */
const UPLOADS_DIR = path.join(__dirname, '../uploads');
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    etag: true,
    lastModified: true,
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // جلوگیری از اجرای محتوای غیرتصویری که ممکن است آپلود شده باشد
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    },
  })
);

/* -------------------------------- Rate limit -------------------------------- */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { success: false, message: 'درخواست‌های بیش از حد. لطفاً کمی بعد تلاش کنید.' },
});
app.use('/api', apiLimiter);

// فقط روی عملیات نوشتنی احراز هویت (login/register/otp) سخت‌گیر باشیم،
// نه روی GET هایی مثل /api/auth/me که در هر بار رفرش صفحه صدا زده می‌شوند.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS',
  message: { success: false, message: 'تلاش‌های ناموفق زیاد. لطفاً ۱۵ دقیقه صبر کنید.' },
});
app.use('/api/auth', authLimiter);

/* ------------------------------- Body parsers ------------------------------- */
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());
app.use(passport.initialize());

/* --------------------------------- Healthcheck ------------------------------- */
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    uptime: Math.round(process.uptime()),
    db: states[mongoose.connection.readyState] || 'unknown',
    env: process.env.NODE_ENV || 'development',
  });
});

/* ---------------------------------- Routes ---------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/hero-images', heroImageRoutes);

/* ----------------------------------- 404 ------------------------------------ */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.originalUrl });
});

/* ------------------------------ Error handler ------------------------------- */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.status || err.statusCode || 500;
  let message = 'خطای داخلی سرور';

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'حجم فایل بیش از حد مجاز است' : 'خطا در آپلود فایل';
  } else if (err.message === 'Not allowed by CORS') {
    status = 403;
    message = 'دسترسی از این دامنه مجاز نیست';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'حجم داده ارسالی بیش از حد مجاز است';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'ساختار JSON ارسالی نامعتبر است';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors || {}).map((e) => e.message).join('، ') || 'داده ورودی نامعتبر است';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'شناسه ارسال‌شده نامعتبر است';
  } else if (err.code === 11000) {
    status = 409;
    message = 'رکورد تکراری است';
  } else if (status < 500) {
    message = err.message || message;
  }

  if (status >= 500) console.error('🔴', req.method, req.originalUrl, '\n', err.stack || err);

  res.status(status).json({
    success: false,
    message,
    ...(IS_PROD ? {} : { detail: err.message }),
  });
});

/* --------------------------------- Bootstrap -------------------------------- */
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}  [${process.env.NODE_ENV || 'development'}]`);
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

const shutdown = (signal) => async () => {
  console.log(`\n🟡 ${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await mongoose.connection.close(false);
      console.log('✅ Closed cleanly.');
    } catch (e) {
      console.error('🔴 Shutdown error:', e.message);
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err);
  if (IS_PROD) shutdown('uncaughtException')();
});

module.exports = app;
