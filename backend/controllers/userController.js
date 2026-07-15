const User = require('../models/User');

// دریافت پروفایل کاربر جاری
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// به‌روزرسانی پروفایل (فقط نام - شماره موبایل هویت کاربر است و تغییر نمی‌کند)
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'نام و نام خانوادگی باید حداقل ۳ حرف باشد' });
    }
    if (name.trim().length > 60) {
      return res.status(400).json({ success: false, message: 'نام بیش از حد طولانی است' });
    }

    user.name = name.trim();
    // اگر کاربر تازه نامش را کامل کرده، پروفایلش را کامل علامت بزن
    if (!user.isProfileComplete) user.isProfileComplete = true;

    await user.save();
    res.json({
      success: true,
      user: {
        _id: user._id, name: user.name, phone: user.phone,
        role: user.role, addresses: user.addresses, createdAt: user.createdAt,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===================== مدیریت آدرس‌ها =====================
const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addAddress = async (req, res) => {
  try {
    const { title, fullName, phone, province, city, address, postalCode, isDefault } = req.body;
    if (!title || !fullName || !phone || !province || !city || !address || !postalCode)
      return res.status(400).json({ success: false, message: 'تمامی فیلدهای ضروری را پر کنید' });
    if (!/^09\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: 'شماره موبایل نامعتبر است' });
    if (!/^\d{10}$/.test(postalCode)) return res.status(400).json({ success: false, message: 'کد پستی باید ۱۰ رقم باشد' });
    if (address.length < 10) return res.status(400).json({ success: false, message: 'آدرس حداقل ۱۰ کاراکتر' });

    const user = await User.findById(req.user._id);
    if (isDefault) user.addresses.forEach(addr => { addr.isDefault = false; });
    const shouldBeDefault = isDefault || user.addresses.length === 0;
    user.addresses.push({ title, fullName, phone, province, city, address, postalCode, isDefault: shouldBeDefault });
    await user.save();
    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const updates = req.body;
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    const allowed = ['title', 'fullName', 'phone', 'province', 'city', 'address', 'postalCode', 'isDefault'];
    for (let key of allowed) {
      if (updates[key] !== undefined) {
        if (key === 'phone' && !/^09\d{9}$/.test(updates[key]))
          return res.status(400).json({ success: false, message: 'شماره موبایل نامعتبر است' });
        if (key === 'postalCode' && !/^\d{10}$/.test(updates[key]))
          return res.status(400).json({ success: false, message: 'کد پستی نامعتبر است' });
        if (key === 'address' && updates[key].length < 10)
          return res.status(400).json({ success: false, message: 'آدرس حداقل ۱۰ کاراکتر' });
        address[key] = updates[key];
      }
    }
    if (updates.isDefault === true) {
      user.addresses.forEach(addr => { if (addr._id.toString() !== addressId) addr.isDefault = false; });
    }
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    const wasDefault = address.isDefault;
    user.addresses.pull({ _id: addressId });
    if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    let found = false;
    user.addresses.forEach(addr => {
      if (addr._id.toString() === addressId) { addr.isDefault = true; found = true; }
      else addr.isDefault = false;
    });
    if (!found) return res.status(404).json({ success: false, message: 'Address not found' });
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// آمار کاربر
const getDashboardStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, stats: { addressesCount: user.addresses.length, ordersCount: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getProfile, updateProfile,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
  getDashboardStats,
};
