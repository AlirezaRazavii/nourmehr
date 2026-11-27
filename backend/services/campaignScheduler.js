const Campaign = require('../models/Campaign');
const { delByPrefix, invalidateProductCache, invalidateSeoCache } = require('../utils/cache');
const { refreshCampaignRegistry } = require('../utils/campaignRegistry');

/**
 * cron کمپین‌ها — فقط کار «نظافتی» می‌کند:
 *   scheduled → active   وقتی زمان شروع رسید
 *   active    → expired/archived  وقتی زمان پایان گذشت
 *
 * نکتهٔ معماری: انقضا یک واقعیت زمانی است، نه یک عملیات نوشتن.
 * قیمت‌ها در فاز ۳b-2 با مقایسهٔ now و endsAt محاسبه می‌شوند؛
 * پس حتی اگر این cron اجرا نشود، تخفیفِ منقضی اعمال نمی‌شود.
 */
const runCampaignScheduler = async () => {
  try {
    const now = new Date();
    const docs = await Campaign.find({ status: { $in: ['scheduled', 'active'] } }).lean();
    let changed = 0;

    for (const doc of docs) {
      const next = Campaign.computeStatus(doc, now);
      if (next === doc.status) continue;

      const set = { status: next };
      if (['expired', 'archived'].includes(next)) set.expiredAt = now;
      // تمدید کمپین منقضی: expiredAt پاک شود
      if (next === 'active' || next === 'scheduled') set.expiredAt = null;

      await Campaign.updateOne({ _id: doc._id, status: doc.status }, { $set: set });
      changed++;
      console.log(`[campaignScheduler] «${doc.name?.fa || doc.slug}» : ${doc.status} → ${next}`);
    }

    // ⭐ رجیستری هر دقیقه تازه شود (حتی وقتی وضعیت‌ها عوض نشده‌اند)
    await refreshCampaignRegistry();

    if (changed > 0) {
      delByPrefix('public:campaigns');
      delByPrefix('torob:v3:'); // ⭐ فید ترب هم تازه شود
      invalidateProductCache();
      invalidateSeoCache();
      console.log(`[campaignScheduler] ${changed} کمپین به‌روزرسانی شد`);
    }
    return changed;
  } catch (err) {
    console.error('[campaignScheduler] error:', err.message);
    return 0;
  }
};

const startCampaignScheduler = () => {
  // بارگذاری فوری تا اولین درخواست‌ها هم کمپین فعال را ببینند
  refreshCampaignRegistry().catch(() => {});
  // یک‌بار بعد از بالا آمدن (جبران عقب‌ماندگی وقتی سرور خواب بوده)
  const t = setTimeout(() => runCampaignScheduler(), 10_000);
  if (typeof t.unref === 'function') t.unref();

  const timer = setInterval(() => runCampaignScheduler(), 60_000);
  if (typeof timer.unref === 'function') timer.unref();
  console.log('🟢 Campaign scheduler فعال شد (هر ۶۰ ثانیه)');
};

module.exports = { runCampaignScheduler, startCampaignScheduler };