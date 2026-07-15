const jwt = require('jsonwebtoken');
const User = require('../models/User');

// اگر توکن معتبر بود req.user را ست می‌کند، در غیر این صورت بدون خطا رد می‌شود
const optionalAuth = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    token = token.trim().replace(/^["']|["']$/g, '');
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token || token === 'null' || token === 'undefined') {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user && user.status !== 'blocked') {
      req.user = user;
    }
  } catch (err) {
    // توکن نامعتبر بود، به‌عنوان مهمان ادامه بده
  }
  next();
};

module.exports = { optionalAuth };
