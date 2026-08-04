const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isDev = process.env.NODE_ENV !== 'production';

/** استخراج توکن از هدر Authorization یا کوکی */
const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer')) {
    return header.split(' ')[1]?.trim().replace(/^["']|["']$/g, '') || null;
  }
  if (req.cookies && req.cookies.auth_token) return req.cookies.auth_token;
  return null;
};

const protect = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    // algorithms را صریح می‌دهیم تا توکن با الگوریتم دیگر پذیرفته نشود
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // ابطال سشن: اگر کاربر logout کرده یا ادمین سشن‌ها را بسته باشد
    if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({
        success: false,
        message: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.',
      });
    }

    // فقط حساب فعال اجازه دارد (قبلاً inactive عبور می‌کرد)
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message:
          user.status === 'blocked'
            ? 'حساب کاربری شما مسدود شده است'
            : 'حساب کاربری شما غیرفعال است',
      });
    }

    req.user = user;
    if (isDev) console.log(`[AUTH] ✅ ${user.phone} | role: ${user.role}`);
    next();
  } catch (err) {
    if (isDev) console.error('[AUTH] token verification failed:', err.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Not authorized as admin' });
};

module.exports = { protect, admin };
