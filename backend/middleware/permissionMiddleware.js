// بررسی اینکه کاربر مجوز مشخصی دارد یا خیر
// superadmin همیشه اجازه دارد
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    // مدیرکل به همه چیز دسترسی دارد
    if (req.user.isSuperAdmin) {
      return next();
    }
    // بررسی مجوز مشخص
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'شما به این بخش دسترسی ندارید' });
  };
};

// فقط مدیرکل اجازه دارد (برای مدیریت ادمین‌ها)
const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.isSuperAdmin) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'فقط مدیر کل به این بخش دسترسی دارد' });
};

module.exports = { hasPermission, superAdminOnly };
