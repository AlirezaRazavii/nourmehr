const Discount = require('../../models/Discount');
const { ALLOWED_PAYMENT_METHODS } = require('../../models/Discount');
const { invalidateDiscountCache } = require('../../utils/cache');

/* ------------------------------------------------------------------------
 * ⭐ رفع باگ mass assignment: فقط این فیلدها از بدنه‌ی درخواست قبول می‌شوند
 *   (قبلاً new Discount(req.body) هر فیلدی را می‌پذیرفت — حتی usedCount!)
 * ------------------------------------------------------------------------ */
const toObjectIdArray = (v) => {
  const arr = Array.isArray(v) ? v : [];
  return arr
    .map((x) => {
      try { return new (require('mongoose').Types.ObjectId)(String(x)); }
      catch { return null; }
    })
    .filter(Boolean);
};

const dedupe = (arr) => Array.from(new Set(arr.map(String)));

const sanitizePayload = (body = {}) => {
  const b = body || {};
  const out = {};

  if (b.code !== undefined) out.code = String(b.code).trim().toUpperCase();

  if (b.type !== undefined) {
    if (!['percent', 'fixed'].includes(b.type)) {
      const e = new Error('نوع تخفیف نامعتبر است');
      e.statusCode = 400;
      throw e;
    }
    out.type = b.type;
  }

  if (b.value !== undefined) {
    const v = Number(b.value);
    if (!Number.isFinite(v) || v < 0) {
      const e = new Error('مقدار تخفیف نامعتبر است');
      e.statusCode = 400;
      throw e;
    }
    out.value = v;
  }

  for (const numField of ['minPurchase', 'maxDiscount', 'usageLimit', 'perUserLimit']) {
    if (b[numField] !== undefined && b[numField] !== null && b[numField] !== '') {
      const v = Number(b[numField]);
      if (!Number.isFinite(v) || v < 0) {
        const e = new Error(`مقدار فیلد ${numField} نامعتبر است`);
        e.statusCode = 400;
        throw e;
      }
      out[numField] = v;
    }
  }

  if (b.firstPurchaseOnly !== undefined) out.firstPurchaseOnly = !!b.firstPurchaseOnly;
  if (b.startDate !== undefined && b.startDate !== '') out.startDate = b.startDate;
  if (b.endDate !== undefined) out.endDate = b.endDate === '' || b.endDate === null ? null : b.endDate;
  if (b.status !== undefined && ['active', 'inactive', 'expired'].includes(b.status)) out.status = b.status;
  if (b.isPublic !== undefined) out.isPublic = !!b.isPublic;

  if (b.description !== undefined) {
    const d = b.description || {};
    out.description = {
      fa: (typeof d === 'string' ? d : d.fa) || '',
      en: (typeof d === 'string' ? '' : d.en) || '',
    };
  }

  // ⭐ محدودیت‌ها — آرایه خالی = نامحدود
  if (b.products !== undefined) out.products = toObjectIdArray(b.products);
  if (b.categories !== undefined) out.categories = toObjectIdArray(b.categories);
  if (b.allowedPaymentMethods !== undefined) {
    out.allowedPaymentMethods = dedupe(
      (Array.isArray(b.allowedPaymentMethods) ? b.allowedPaymentMethods : [])
        .map(String)
        .filter((m) => ALLOWED_PAYMENT_METHODS.includes(m))
    );
  }

  return out;
};

const isValidationError = (error) =>
  error.name === 'ValidationError' ||
  error.message.includes('تاریخ') ||
  error.message.includes('درصدی');

/* -------------------------------- CRUD -------------------------------- */

const getDiscounts = async (req, res) => {
  try {
    // نام محصول/دسته برای نمایش محدودیت‌ها در پنل (chips)
    const discounts = await Discount.find()
      .populate('products', 'name')
      .populate('categories', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: discounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDiscount = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    const discount = new Discount(payload);
    await discount.save();
    invalidateDiscountCache(); // ⭐ صفحه‌ی عمومی فوراً به‌روز شود
    res.status(201).json({ success: true, data: discount });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'این کد تخفیف قبلاً ثبت شده است' });
    }
    if (isValidationError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDiscount = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    const discount = await Discount.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!discount) return res.status(404).json({ success: false, message: 'کد تخفیف یافت نشد' });
    invalidateDiscountCache();
    res.json({ success: true, data: discount });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'این کد تخفیف قبلاً ثبت شده است' });
    }
    if (isValidationError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ success: false, message: 'کد تخفیف یافت نشد' });
    invalidateDiscountCache();
    res.json({ success: true, message: 'کد تخفیف حذف شد' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ------------------------ تولید گروهی کد یکتا ------------------------ */
// الفبا بدون کاراکترهای مبهم (O/0 و I/1) تا کپی/خواندن خطا ندهد
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = (prefix, length) => {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return (prefix || '') + s;
};

/**
 * POST /admin/discounts/bulk
 * بدنه: { count (۱..۵۰۰), prefix, codeLength (۴..۱۶), ...فیلدهای مشترک کد تخفیف }
 * خروجی: لیست کدهای ساخته‌شده — CSV در فرانت ساخته می‌شود
 */
const createDiscountsBulk = async (req, res) => {
  try {
    const count = Number(req.body.count);
    const prefix = String(req.body.prefix || '').trim().toUpperCase();
    const codeLength = Math.min(16, Math.max(4, Number(req.body.codeLength) || 8));

    if (!Number.isInteger(count) || count < 1 || count > 500) {
      return res.status(400).json({ success: false, message: 'تعداد کدها باید بین ۱ تا ۵۰۰ باشد' });
    }
    if (prefix && !/^[A-Z0-9\-_]{1,10}$/.test(prefix)) {
      return res.status(400).json({ success: false, message: 'پیشوند فقط حروف انگلیسی/عدد/خط تیره (حداکثر ۱۰ کاراکتر)' });
    }

    // فیلدهای مشترک (type/value/محدودیت‌ها/...) — بدون code (تک‌تک ساخته می‌شود)
    const { count: _c, prefix: _p, codeLength: _l, ...rest } = req.body;
    const shared = sanitizePayload(rest);
    delete shared.code;

    const created = [];
    let failed = 0;

    for (let i = 0; i < count; i++) {
      // تلاش تا ۳ بار برای کد یکتا (برخورد ۱۱۰۰۰ → کد جدید)
      let doc = null;
      for (let attempt = 0; attempt < 3 && !doc; attempt++) {
        try {
          doc = await Discount.create({ ...shared, code: generateCode(prefix, codeLength) });
        } catch (e) {
          if (e.code === 11000) continue; // یکتایی — کد دیگری بساز
          throw e; // خطای دیگر (اعتبارسنجی/...) → همان ماجرای CRUD
        }
      }
      if (doc) created.push(doc);
      else failed++;
    }

    invalidateDiscountCache();

    return res.status(201).json({
      success: true,
      data: {
        created: created.map((d) => ({
          _id: d._id,
          code: d.code,
          type: d.type,
          value: d.value,
        })),
        failed,
      },
      message: `${created.length} کد ساخته شد${failed ? ` — ${failed} کد به دلیل یکتایی ساخته نشد (دوباره تلاش کنید)` : ''}`,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'برخورد یکتایی کد — دوباره تلاش کنید' });
    }
    if (isValidationError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  createDiscountsBulk,
};
