const Setting = require('../../models/Setting');
const { getOrSet, del } = require('../../utils/cache');

const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
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

// نسخهٔ عمومی برای صفحات فرانت (مثل صفحه تماس) — فقط فیلدهای امن
const getPublicSettings = async (req, res) => {
  try {
    const data = await getOrSet('public:settings', 600, async () => {
      let settings = await Setting.findOne();
      if (!settings) { settings = new Setting(); await settings.save(); }
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
        seo: settings.seo || {},
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSettings, updateSettings, getPublicSettings };