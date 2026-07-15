const User = require('../../models/User');
const Order = require('../../models/Order');
const { PERMISSIONS } = require('../../config/permissions');

const VALID_PERMISSIONS = Object.values(PERMISSIONS);

const getUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    if (role && role !== 'all') filter.role = role;
    if (status && status !== 'all') filter.status = status;
    const skip = (page - 1) * limit;
    const users = await User.find(filter).select('-password').skip(skip).limit(parseInt(limit));
    const total = await User.countDocuments(filter);

    const userIds = users.map(u => u._id);
    let stats = [];
    if (userIds.length > 0) {
      stats = await Order.aggregate([
        { $match: { user: { $in: userIds }, paymentStatus: 'paid' } },
        { $group: { _id: '$user', ordersCount: { $sum: 1 }, totalSpent: { $sum: '$total' } } }
      ]);
    }
    const statsMap = {};
    stats.forEach(s => { statsMap[s._id.toString()] = { ordersCount: s.ordersCount, totalSpent: s.totalSpent }; });

    const usersWithStats = users.map(u => {
      const userObj = u.toObject ? u.toObject() : u;
      const stat = statsMap[userObj._id.toString()] || { ordersCount: 0, totalSpent: 0 };
      return { ...userObj, ordersCount: stat.ordersCount, totalSpent: stat.totalSpent };
    });

    res.json({ success: true, data: usersWithStats, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'inactive', 'blocked'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    // محافظت: مدیرکل را نمی‌توان مسدود/غیرفعال کرد
    if (target.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'وضعیت مدیر کل قابل تغییر نیست' });
    }

    target.status = status;
    await target.save();
    const user = target.toObject();
    delete user.password;
    res.json({ success: true, message: 'User status updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    if (target.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'نقش مدیر کل قابل تغییر نیست' });
    }

    target.role = role;
    // اگر نقش به کاربر عادی تغییر کرد، دسترسی‌ها را پاک کن
    if (role === 'user') target.permissions = [];
    await target.save();
    const user = target.toObject();
    delete user.password;
    res.json({ success: true, message: 'User role updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// فقط مدیرکل: تنظیم دسترسی‌های یک ادمین
const updateUserPermissions = async (req, res) => {
  try {
    let { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'permissions باید آرایه باشد' });
    }
    // فقط دسترسی‌های معتبر را نگه دار
    permissions = permissions.filter(p => VALID_PERMISSIONS.includes(p));

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    if (target.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'دسترسی‌های مدیر کل قابل تغییر نیست (به همه‌چیز دسترسی دارد)' });
    }

    // ست‌کردن دسترسی‌ها به کاربر؛ اگر دسترسی داده شد نقش را admin کن
    target.permissions = permissions;
    if (permissions.length > 0) target.role = 'admin';
    await target.save();

    const user = target.toObject();
    delete user.password;
    res.json({ success: true, message: 'دسترسی‌ها بروزرسانی شد', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsers, updateUserStatus, updateUserRole, updateUserPermissions };
