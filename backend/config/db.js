const mongoose = require('mongoose');

const MAX_RETRIES = 10;
const BASE_DELAY = 3000;

mongoose.set('strictQuery', true);

const buildOptions = () => ({
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 20,
  minPoolSize: 2,
  // در پروداکشن ایندکس‌ها را هنگام استارت نساز (کند و پرمصرف است)
  autoIndex: process.env.NODE_ENV !== 'production',
  retryWrites: true,
});

const registerEvents = () => {
  const c = mongoose.connection;
  c.on('connected', () => console.log('✅ MongoDB connected'));
  c.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
  c.on('reconnected', () => console.log('🔄 MongoDB reconnected'));
  c.on('error', (err) => console.error(`❌ MongoDB error: ${err.message}`));
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ متغیر محیطی MONGODB_URI تعریف نشده است.');
    process.exit(1);
  }

  registerEvents();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, buildOptions());

      // در پروداکشن ایندکس‌ها را یک بار و آگاهانه همگام کن
      if (process.env.NODE_ENV === 'production' && process.env.SYNC_INDEXES === 'true') {
        await Promise.all(
          Object.values(mongoose.models).map(m => m.syncIndexes().catch(e =>
            console.warn(`index sync failed for ${m.modelName}: ${e.message}`)
          ))
        );
        console.log('📌 Indexes synced');
      }
      return mongoose.connection;
    } catch (error) {
      const delay = Math.min(BASE_DELAY * attempt, 30000);
      console.error(`❌ MongoDB connection failed (${attempt}/${MAX_RETRIES}): ${error.message}`);
      if (attempt === MAX_RETRIES) {
        console.error('🛑 اتصال به دیتابیس ممکن نشد. خروج از برنامه.');
        process.exit(1);
      }
      console.log(`⏳ تلاش مجدد در ${delay / 1000} ثانیه...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

const closeDB = async () => {
  try {
    await mongoose.connection.close(false);
    console.log('🔌 MongoDB connection closed');
  } catch (e) {
    console.error('خطا در بستن اتصال دیتابیس:', e.message);
  }
};

['SIGINT', 'SIGTERM'].forEach(sig =>
  process.on(sig, async () => { await closeDB(); process.exit(0); })
);

module.exports = connectDB;
module.exports.closeDB = closeDB;
