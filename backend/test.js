require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'admin@example.com' });
    if (user) {
      console.log('User found:', user.email);
      console.log('Role:', user.role);
      console.log('ID:', user._id);
    } else {
      console.log('Admin user not found!');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

