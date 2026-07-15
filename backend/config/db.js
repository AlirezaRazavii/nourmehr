const mongoose = require('mongoose');

const connectDB = async () => {
  const retryDelay = 5000; // 5 seconds
  let retries = 0;

  const connectWithRetry = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error(`❌ MongoDB connection error: ${error.message}`);
      console.log(`Retrying in ${retryDelay / 1000} seconds... (attempt ${++retries})`);
      setTimeout(connectWithRetry, retryDelay);
    }
  };

  await connectWithRetry();
};

module.exports = connectDB;
