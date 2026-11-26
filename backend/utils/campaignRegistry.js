// backend/utils/campaignRegistry.js
/**
 * رجیستری کمپین‌ها در حافظه — خواندنِ همگام (sync) برای pricing.js.
 * چرا حافظه؟ چون resolveUnitPrice همه‌جا sync صدا زده می‌شود و نمی‌تواند await کند.
 *
 * نکتهٔ حیاتی: بازهٔ زمانی «موقع خواندن» چک می‌شود (startsAt/endsAt).
 * پس حتی اگر cron عقب بیفتد، کمپینِ شروع‌نشده اعمال نمی‌شود و کمپینِ منقضی فوراً کنار می‌رود.
 */
const Campaign = require('../models/Campaign');
const { setCampaignProvider } = require('./pricing');

let index = new Map(); // productId -> [target]
let loading = null;

const buildIndex = (docs) => {
  const map = new Map();
  for (const doc of docs || []) {
    if (doc.status === 'draft' || doc.status === 'archived') continue;
    const starts = doc.startsAt ? new Date(doc.startsAt).getTime() : null;
    const ends = doc.endsAt ? new Date(doc.endsAt).getTime() : null;
    for (const t of doc.targets || []) {
      const percent = Number(t.percent) || 0;
      if (!t.product || percent <= 0) continue;
      const pid = String(t.product);
      const entry = {
        campaignId: String(doc._id),
        percent,
        sizes: (t.sizes || []).map((s) => String(s)),
        starts,
        ends,
      };
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(entry);
    }
  }
  return map;
};

const refreshCampaignRegistry = async () => {
  if (loading) return loading;
  loading = (async () => {
    try {
      const docs = await Campaign.find({ status: { $in: ['scheduled', 'active'] } })
        .select('status startsAt endsAt targets')
        .lean();
      index = buildIndex(docs);
    } catch (err) {
      console.error('[campaignRegistry]', err.message);
    } finally {
      loading = null;
    }
    return index;
  })();
  return loading;
};

// فقط کمپین‌هایی که «الان» در بازهٔ زمانی‌شان هستیم
const getCampaignTargets = (productId) => {
  if (!productId) return [];
  const list = index.get(String(productId));
  if (!list || !list.length) return [];
  const now = Date.now();
  return list.filter(
    (e) => (e.starts === null || now >= e.starts) && (e.ends === null || now < e.ends)
  );
};

// تزریق به pricing — pricing.js هیچ مدلی را require نمی‌کند (خالص می‌ماند)
setCampaignProvider(getCampaignTargets);

module.exports = { refreshCampaignRegistry, getCampaignTargets };