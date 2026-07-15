const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
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
const seedAdmin = require('./utils/seedAdmin');
const seedCategories = require('./utils/seedCategories');
const compression = require('compression');
const ticketRoutes = require('./routes/ticketRoutes');

dotenv.config();

connectDB();

const mongoose = require('mongoose');
const seedCollections = require('./utils/seedCollections');

mongoose.connection.once('open', () => {
  console.log('🟢 MongoDB connection is open. Seeding admin, categories and collections...');
  seedAdmin().catch(console.error);
  seedCategories().catch(console.error);
  seedCollections().catch(console.error);
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 MongoDB connection error:', err);
});

const app = express();

// مهم: اگر پشت پراکسی (Nginx/هاست/کلادفلر) هستید، این خط برای تشخیص IP واقعی و درست کار کردن rate limit لازم است
app.set('trust proxy', 1);

app.use(compression());

// محدودیت عمومی (ضد DDoS سبک) - حداکثر ۱۰۰ درخواست در ۱۵ دقیقه از هر IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'درخواست‌های بیش از حد. لطفاً بعداً تلاش کنید.' }
});
app.use('/api', limiter);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    const allowed = process.env.CLIENT_URL;
    if (!origin || origin === allowed) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// این دو خط حتما باید قبل از مسیرها باشند تا req.body پر شود
app.use(express.json({ limit: '10kb' })); // محدودیت حجم بدنه برای جلوگیری از حملات payload بزرگ
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(passport.initialize());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// مسیرها
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/discounts', require('./routes/discountRoutes'));
app.use('/api/images', imageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/reviews', reviewRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
