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
        // ⭐ متادیتا برای نوتیف صفحهٔ محصول (روی قیمت‌ها اثری ندارد)
        name: doc.name,
        slug: doc.slug,
        themeColor: doc.themeColor,
        countdownLabel: doc.countdownLabel,
        showCountdown: doc.showCountdown,
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
        .select('status startsAt endsAt targets name slug themeColor countdownLabel showCountdown')
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

/**
 * ⭐ اطلاعات کمپینِ فعال برای نوتیف صفحهٔ محصول.
 * اگر چند کمپین روی یک محصول باشند، همان که بیشترین درصد را می‌دهد برنده است
 * (هم‌قانون با pricing). خروجی روی پاسخ API می‌نشیند، نه در دیتابیس.
 */
const buildCampaignOffers = (product) => {
  if (!product || !product._id) return null;
  const targets = getCampaignTargets(product._id);
  if (!targets.length) return null;

  const byCampaign = new Map();
  for (const t of targets) {
    if (!byCampaign.has(t.campaignId)) byCampaign.set(t.campaignId, { meta: t, targets: [], max: 0, min: 100 });
    const g = byCampaign.get(t.campaignId);
    g.targets.push(t);
    g.max = Math.max(g.max, t.percent);
    g.min = Math.min(g.min, t.percent);
  }
  let winner = null;
  for (const g of byCampaign.values()) if (!winner || g.max > winner.max) winner = g;

  const meta = winner.meta;
  const productSizes = Array.isArray(product.sizes) ? product.sizes : [];
  const nameOf = (s) =>
    typeof s?.name === 'string'
      ? { fa: s.name, en: s.name }
      : { fa: s?.name?.fa || '', en: s?.name?.en || '' };

  const sizes = [];
  let allSizes = false;
  for (const t of winner.targets) {
    if (!t.sizes.length) { allSizes = true; continue; }
    for (const raw of t.sizes) {
      const match = productSizes.find((s) => {
        const n = nameOf(s);
        return n.fa === raw || n.en === raw;
      });
      const name = match ? nameOf(match) : { fa: raw, en: raw };
      const key = name.fa || name.en;
      const ex = sizes.find((x) => (x.name.fa || x.name.en) === key);
      if (ex) ex.percent = Math.max(ex.percent, t.percent);
      else sizes.push({ name, percent: t.percent });
    }
  }

  return {
    campaign: {
      name: meta.name,
      slug: meta.slug,
      startsAt: meta.starts,
      endsAt: meta.ends,
      themeColor: meta.themeColor,
      countdownLabel: meta.countdownLabel,
      showCountdown: meta.showCountdown !== false,
    },
    serverTime: Date.now(),
    allSizes,
    maxPercent: winner.max,
    minPercent: winner.min,
    sizes,
  };
};

module.exports = { refreshCampaignRegistry, getCampaignTargets, buildCampaignOffers };