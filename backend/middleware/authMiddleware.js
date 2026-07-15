const jwt = require('jsonwebtoken');
const User = require('../models/User');
const isDev = process.env.NODE_ENV !== 'production';

const protect = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    // حذف هر گونه فاصله یا نقل قول اضافی
    token = token.trim().replace(/^["']|["']$/g, '');
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'حساب کاربری شما مسدود شده است' });
    }
    req.user = user;
    if (isDev) console.log(`[AUTH] ✅ User authenticated: ${user.email}, Role: ${user.role}`);
    next();
  } catch (err) {
    if (isDev) console.error('[AUTH] Token verification failed:', err.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as admin' });
  }
};

module.exports = { protect, admin };