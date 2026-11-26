const mongoose = require('mongoose');
const Campaign = require('../../models/Campaign');
const Product = require('../../models/Product');
const { delByPrefix, invalidateProductCache, invalidateSeoCache } = require('../../utils/cache');

const MAX_TARGETS = 500;
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const invalidateCampaignCaches = () => {
  delByPrefix('public:campaigns');
  invalidateProductCache();
  invalidateSeoCache();
};

const handleError = (res, error) => {
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: 'این slug قبلاً استفاده شده است؛ مقدار دیگری انتخاب کنید' });
  }
  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors).map((e) => e.message).join(' | '),
    });
  }
  if (error?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'شناسه ارسال‌شده نامعتبر است' });
  }
  console.error('[AdminCampaign]', error);
  return res.status(500).json({ success: false, message: 'خطای داخلی سرور' });
};

const toDateOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// پاکسازی اهداف: ObjectId معتبر، درصد ۱..۹۹، سایزهای یکتا، بدون محصول تکراری
const sanitizeTargets = async (raw) => {
  if (!Array.isArray(raw)) return [];
  const map = new Map();
  for (const t of raw.slice(0, MAX_TARGETS)) {
    const pid = String(t?.product || t?.productId || '');
    if (!isValidId(pid)) continue;
    const percent = Math.round(Number(t?.percent));
    if (!Number.isFinite(percent) || percent < 1 || percent > 99) continue;
    const sizes = [
      ...new Set(
        (Array.isArray(t?.sizes) ? t.sizes : [])
          .map((s) => String(s || '').trim())
          .filter(Boolean)
      ),
    ].slice(0, 50);
    map.set(pid, { product: pid, sizes, percent });
  }
  const list = [...map.values()];
  if (!list.length) return [];
  const found = await Product.find({ _id: { $in: list.map((t) => t.product) } })
    .select('_id')
    .lean();
  const ok = new Set(found.map((p) => String(p._id)));
  return list.filter((t) => ok.has(t.product));
};

// فیلدهای مجازِ ورودی (جلوگیری از نوشتن مستقیم req.body)
const buildPayload = async (body, { isCreate }) => {
  const out = {};
  if (body.name && typeof body.name === 'object') {
    out.name = {
      fa: String(body.name.fa || '').trim(),
      en: String(body.name.en || '').trim(),
    };
  }
  if (body.description && typeof body.description === 'object') {
    out.description = {
      fa: String(body.description.fa || ''),
      en: String(body.description.en || ''),
    };
  }
  if (body.slug !== undefined) out.slug = slugify(body.slug);
  if (body.startsAt !== undefined) out.startsAt = toDateOrNull(body.startsAt);
  if (body.endsAt !== undefined) out.endsAt = toDateOrNull(body.endsAt);
  if (body.priority !== undefined) out.priority = Number(body.priority) || 0;
  if (body.expiryAction !== undefined) {
    out.expiryAction = body.expiryAction === 'hide' ? 'hide' : 'archive';
  }
  if (body.showCountdown !== undefined) out.showCountdown = body.showCountdown === true;
  if (body.countdownLabel && typeof body.countdownLabel === 'object') {
    out.countdownLabel = {
      fa: String(body.countdownLabel.fa || '').trim(),
      en: String(body.countdownLabel.en || '').trim(),
    };
  }
  if (body.bannerImage !== undefined) out.bannerImage = String(body.bannerImage || '').trim();
  if (body.themeColor !== undefined) out.themeColor = String(body.themeColor || '').trim();
  if (body.targets !== undefined) out.targets = await sanitizeTargets(body.targets);

  if (isCreate) {
    out.status = ['draft', 'scheduled', 'active'].includes(body.status) ? body.status : 'draft';
  } else if (body.status !== undefined) {
    if (['draft', 'scheduled', 'active', 'archived'].includes(body.status)) out.status = body.status;
  }
  return out;
};

const validateDates = (startsAt, endsAt) =>
  startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)
    ? 'زمان پایان باید بعد از زمان شروع باشد'
    : '';

/* --------------------------------- READ ---------------------------------- */
const getCampaigns = async (req, res) => {
  try {
    const list = await Campaign.find()
      .sort({ priority: -1, createdAt: -1 })
      .populate('targets.product', 'name slug mainImage')
      .lean();
    const now = new Date();
    const data = list.map((c) => ({
      ...c,
      targetCount: (c.targets || []).length,
      effectiveStatus: Campaign.computeStatus(c, now),
    }));
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data, serverTime: now.getTime() });
  } catch (error) {
    handleError(res, error);
  }
};

const getCampaignById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'شناسه کمپین نامعتبر است' });
    }
    const doc = await Campaign.findById(req.params.id)
      .populate('targets.product', 'name slug mainImage sizes')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'کمپین یافت نشد' });
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: doc });
  } catch (error) {
    handleError(res, error);
  }
};

/* -------------------------------- CREATE --------------------------------- */
const createCampaign = async (req, res) => {
  try {
    const payload = await buildPayload(req.body || {}, { isCreate: true });
    if (!payload.name?.fa) {
      return res.status(400).json({ success: false, message: 'نام فارسی کمپین الزامی است' });
    }
    const dateErr = validateDates(payload.startsAt, payload.endsAt);
    if (dateErr) return res.status(400).json({ success: false, message: dateErr });

    if (!payload.slug) payload.slug = `${slugify(payload.name.fa) || 'campaign'}-${Date.now()}`;
    payload.status = Campaign.computeStatus(payload, new Date());

    const doc = await Campaign.create(payload);
    invalidateCampaignCaches();
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    handleError(res, error);
  }
};

/* -------------------------------- UPDATE --------------------------------- */
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'شناسه کمپین نامعتبر است' });
    }
    const existing = await Campaign.findById(id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'کمپین یافت نشد' });

    const payload = await buildPayload(req.body || {}, { isCreate: false });
    const dateErr = validateDates(
      payload.startsAt !== undefined ? payload.startsAt : existing.startsAt,
      payload.endsAt !== undefined ? payload.endsAt : existing.endsAt
    );
    if (dateErr) return res.status(400).json({ success: false, message: dateErr });

    const ops = { $set: payload };
    if (payload.slug && payload.slug !== existing.slug && !(existing.oldSlugs || []).includes(existing.slug)) {
      ops.$push = { oldSlugs: existing.slug };
    }

    let doc = await Campaign.findByIdAndUpdate(id, ops, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!doc) return res.status(404).json({ success: false, message: 'کمپین یافت نشد' });

    // وضعیت مؤثر بلافاصله اعمال شود (بدون انتظار برای cron)
    const next = Campaign.computeStatus(doc.toObject(), new Date());
    if (next !== doc.status) {
      doc.status = next;
      if (['expired', 'archived'].includes(next) && !doc.expiredAt) doc.expiredAt = new Date();
      await doc.save();
    }

    invalidateCampaignCaches();
    res.json({ success: true, data: doc });
  } catch (error) {
    handleError(res, error);
  }
};

/* -------------------------------- DELETE --------------------------------- */
const deleteCampaign = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'شناسه کمپین نامعتبر است' });
    }
    const doc = await Campaign.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'کمپین یافت نشد' });
    invalidateCampaignCaches();
    res.json({ success: true, message: 'کمپین حذف شد' });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};