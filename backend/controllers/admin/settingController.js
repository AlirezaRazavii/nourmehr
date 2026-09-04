const Setting = require('../../models/Setting');
const { getOrSet, del } = require('../../utils/cache');

const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    if (!settings.shippingOptions || settings.shippingOptions.length === 0) {
      settings.shippingOptions = [
        { id: 'express', title: 'ارسال پیشتاز', description: '۲ تا ۴ روز کاری', cost: 150000, icon: '🚀', isActive: true, minOrder: 0 },
        { id: 'normal', title: 'ارسال سفارشی', description: '۴ تا ۷ روز کاری', cost: 80000, icon: '📦', isActive: true, minOrder: 0 }
      ];
      await settings.save();
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) settings = new Setting();
    Object.assign(settings, req.body);
    await settings.save();
    del('public:settings');
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// نسخهٔ عمومی برای صفحات فرانت (مثل صفحه تماس و چه‌ک‌اوت) — فیلدهای لازم
const getPublicSettings = async (req, res) => {
  try {
    const data = await getOrSet('public:settings', 600, async () => {
      let settings = await Setting.findOne();
      if (!settings) { settings = new Setting(); await settings.save(); }
      if (!settings.shippingOptions || settings.shippingOptions.length === 0) {
        settings.shippingOptions = [
          { id: 'express', title: 'ارسال پیشتاز', description: '۲ تا ۴ روز کاری', cost: 150000, icon: '🚀', isActive: true, minOrder: 0 },
          { id: 'normal', title: 'ارسال سفارشی', description: '۴ تا ۷ روز کاری', cost: 80000, icon: '📦', isActive: true, minOrder: 0 }
        ];
        await settings.save();
      }
      return {
        siteName: settings.siteName,
        siteTagline: settings.siteTagline,
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        contactPhone: settings.contactPhone || '',
        contactEmail: settings.contactEmail || '',
        address: settings.address || '',
        contactHours: settings.contactHours || '',
        mapUrl: settings.mapUrl || '',
        socialMedia: settings.socialMedia || {},
        enableRegistration: settings.enableRegistration,
        enableGoogleLogin: settings.enableGoogleLogin,
        enableSmsLogin: settings.enableSmsLogin,
        shippingMethods: settings.shippingMethods || [],
        shippingOptions: settings.shippingOptions || [],
        seo: settings.seo || {},
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSettings, updateSettings, getPublicSettings };