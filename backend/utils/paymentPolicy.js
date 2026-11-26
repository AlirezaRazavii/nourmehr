// backend/utils/paymentPolicy.js
/**
 * ⭐ سیاست درگاه اعتباری — تنها مرجع تصمیم‌گیری.
 *
 * قانون: اگر تخفیف مؤثر یک قلم (تخفیف سایز، وگرنه تخفیف محصول) به آستانه
 *        برسد یا بیشتر باشد، آن قلم با درگاه اعتباری قابل خرید نیست.
 *
 * نکته‌ها:
 *  - «کد تخفیف» عمداً لحاظ نمی‌شود؛ کوپن‌ها لیست سفید درگاه خودشان را دارند.
 *  - عدد تخفیف از pricing.js می‌آید (تک‌مرجع قیمت) — اینجا محاسبه قیمت نداریم.
 *  - تصمیم در لحظه ثبت سفارش روی order.creditBlocked قفل می‌شود تا تغییر بعدی
 *    آستانه، سفارش‌های در انتظار پرداخت را قفل نکند.
 *
 * آستانه با env قابل تغییر است: CREDIT_BLOCK_THRESHOLD=40
 */
const Product = require('../models/Product');
const { resolveUnitPrice } = require('./pricing');

const envNum = Number(process.env.CREDIT_BLOCK_THRESHOLD);
const CREDIT_BLOCK_THRESHOLD =
  Number.isFinite(envNum) && envNum > 0 && envNum <= 100 ? envNum : 50;

const CREDIT_PAYMENT_METHODS = ['torobpay', 'snappay', 'digipay'];
const ALL_PAYMENT_METHODS = ['online', ...CREDIT_PAYMENT_METHODS];

const METHOD_LABELS = {
  online: 'پرداخت آنلاین',
  torobpay: 'ترب‌پی',
  snappay: 'اسنپ‌پی',
  digipay: 'دیجی‌پی',
};

const fa = (n) => Number(n || 0).toLocaleString('fa-IR');

const localizedName = (name) => {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name.fa || name.en || '';
};

// آیا این درصد درگاه اعتباری را می‌بندد؟ (۵۰ خودش هم بسته است)
const blocksCredit = (percent) => {
  const p = Number(percent) || 0;
  return p > 0 && p >= CREDIT_BLOCK_THRESHOLD;
};

// اگر نام سایز خودش با «سایز» شروع شود، پیشوند تکراری اضافه نکن
const sizeLabel = (size) => {
  const s = String(size || '').trim();
  if (!s) return '';
  return s.startsWith('سایز') ? s : `سایز ${s}`;
};

const itemLabel = (b) => {
  const sz = sizeLabel(b.size);
  return `«${b.name}${sz ? ` — ${sz}` : ''}»`;
};

/**
 * پیام گویا برای کاربر.
 * @param {Array} blocking   اقلام مسدودکننده
 * @param {string} method    درگاه انتخابی
 * @param {number} totalItems تعداد کل اقلام سبد/سفارش
 *
 * پیشنهاد «تفکیک سفارش» فقط وقتی داده می‌شود که حداقل یک قلمِ آزاد در سبد باشد؛
 * برای سبد تک‌قلمی (یا سبدی که همه اقلامش مسدودند) تفکیک بی‌معنی است.
 */
const buildBlockMessage = (blocking, method, totalItems = 0) => {
  const label = METHOD_LABELS[method] || 'درگاه اعتباری';
  const list = blocking || [];
  const th = fa(CREDIT_BLOCK_THRESHOLD);
  const rule = `${label} برای تخفیف‌های ${th}٪ و بیشتر قابل استفاده نیست.`;

  if (!list.length) {
    return `برخی اقلام سبد شما ${th}٪ یا بیشتر تخفیف دارند. ${rule} لطفاً «پرداخت آنلاین» را انتخاب کنید.`;
  }

  const canSplit = Number(totalItems) > list.length;
  const single = list.length === 1;

  const head = single
    ? `تخفیف ${itemLabel(list[0])} ${fa(list[0].percent)}٪ است. ${rule}`
    : `تخفیف این اقلام ${th}٪ یا بیشتر است: ${list
        .map((b) => `${itemLabel(b)} با ${fa(b.percent)}٪`)
        .join('، ')}. ${rule}`;

  let solution;
  if (canSplit) {
    solution = single
      ? 'برای خرید این محصول یا «پرداخت آنلاین» را انتخاب کنید، یا آن را در یک سفارش جداگانه ثبت کنید.'
      : 'برای خرید این اقلام یا «پرداخت آنلاین» را انتخاب کنید، یا آن‌ها را از بقیه سبد جدا کرده و در دو سفارش جداگانه ثبت کنید.';
  } else {
    solution = single
      ? 'برای خرید این محصول «پرداخت آنلاین» را انتخاب کنید.'
      : 'برای خرید این اقلام «پرداخت آنلاین» را انتخاب کنید.';
  }

  return `${head} ${solution}`;
};

// اقلام مسدودکننده از سبد زنده
const blockingFromCart = (cartItems = []) => {
  const out = [];
  for (const item of cartItems) {
    const p = item.product;
    if (!p) continue;
    const r = resolveUnitPrice(p, item.size);
    if (blocksCredit(r.percent)) {
      out.push({ name: localizedName(p.name), size: item.size || '', percent: r.percent });
    }
  }
  return out;
};

// سیاست کامل برای فرانت (مرحله بعد از آن استفاده می‌کند)
const resolvePaymentPolicy = (cartItems = []) => {
  const blocking = blockingFromCart(cartItems);
  // فقط اقلامی که محصولشان موجود است شمرده شوند (هم‌مبنای blockingFromCart)
  const totalItems = (cartItems || []).filter((i) => i && i.product).length;
  return {
    creditBlockThreshold: CREDIT_BLOCK_THRESHOLD,
    creditBlocked: blocking.length > 0,
    creditBlockedItems: blocking,
    allowedPaymentMethods: blocking.length ? ['online'] : [...ALL_PAYMENT_METHODS],
    creditBlockMessage: blocking.length ? buildBlockMessage(blocking, null, totalItems) : '',
  };
};

// فقط برای سفارش‌های قدیمی که اسنپ‌شات تخفیف ندارند
const blockingFromOrderLive = async (order) => {
  const items = order.items || [];
  const ids = items.map((i) => i.product).filter(Boolean);
  const products = ids.length
    ? await Product.find({ _id: { $in: ids } }).select('name price discountPercent sizes').lean()
    : [];
  const map = new Map(products.map((p) => [String(p._id), p]));
  const out = [];
  for (const i of items) {
    const p = map.get(String(i.product));
    if (!p) continue;
    const r = resolveUnitPrice(p, i.size);
    if (blocksCredit(r.percent)) {
      out.push({ name: i.name || localizedName(p.name), size: i.size || '', percent: r.percent });
    }
  }
  return out;
};

// گیت لایه initiate — آنلاین همیشه مجاز است
const assertCreditGatewayAllowed = async (order) => {
  if (!CREDIT_PAYMENT_METHODS.includes(order.paymentMethod)) return { allowed: true };

  const orderItems = order.items || [];

  // تصمیمِ قفل‌شده در لحظه ثبت سفارش، ملاک نهایی است
  if (typeof order.creditBlocked === 'boolean') {
    if (!order.creditBlocked) return { allowed: true };
    // ⭐ فقط اقلامی که واقعاً از آستانه گذشته‌اند (نه هر تخفیفی)
    const blocking = orderItems
      .filter((i) => blocksCredit(i.discountPercent))
      .map((i) => ({ name: i.name || '', size: i.size || '', percent: Number(i.discountPercent) }));
    return {
      allowed: false,
      message: buildBlockMessage(blocking, order.paymentMethod, orderItems.length),
    };
  }

  // سفارش قدیمی (قبل از این آپدیت) → محاسبه زنده
  const blocking = await blockingFromOrderLive(order);
  return blocking.length
    ? {
        allowed: false,
        message: buildBlockMessage(blocking, order.paymentMethod, orderItems.length),
      }
    : { allowed: true };
};

module.exports = {
  CREDIT_BLOCK_THRESHOLD,
  CREDIT_PAYMENT_METHODS,
  ALL_PAYMENT_METHODS,
  METHOD_LABELS,
  blocksCredit,
  buildBlockMessage,
  blockingFromCart,
  resolvePaymentPolicy,
  assertCreditGatewayAllowed,
};