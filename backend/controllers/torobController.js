const crypto = require('crypto');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { getOrSet } = require('../utils/cache');

const IS_PROD = process.env.NODE_ENV === 'production';

const SITE_URL = (process.env.SITE_URL || 'https://nourmehr.ir').replace(/\/+$/, '');
const absoluteUrl = (p = '') => (/^https?:\/\//.test(p) ? p : `${SITE_URL}${p}`);

const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];
const PRODUCT_PAGE_SIZE = 100;
const CACHE_TTL = 300;
const VALID_SORTS = ['date_added_desc', 'date_updated_desc'];

/* ------------------------------ ابزارهای کمکی ------------------------------ */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pick = (value, lang = 'fa') => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value[lang] || value.fa || value.en || '';
  return '';
};

const hashKey = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);

const fail = (res, error, code = 500) => {
  console.error('[torobController]', error);
  res.status(code).json({ error: IS_PROD ? 'خطای داخلی سرور' : error.message });
};

const extractSlug = (url) => {
  try {
    const u = new URL(String(url));
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.lastIndexOf('product');
    let s = idx >= 0 && idx + 1 < parts.length ? parts[idx + 1] : parts[parts.length - 1] || '';
    try { s = decodeURIComponent(s); } catch { /* نامعتبر بود — همان خام */ }
    return s;
  } catch {
    const raw = String(url).split('/').filter(Boolean).pop() || '';
    try { return decodeURIComponent(raw); } catch { return raw; }
  }
};

/* ---------------- تبدیل محصول مونگو به فرمت Torob API v3 ---------------- */
const formatProductForTorob = (product) => {
  /* ---------- قیمت ----------
     محصولِ سایزدار: هر سایز قیمت اصلی + تخفیف مخصوص خودش.
     قیمت ترب = قیمت نهاییِ ارزان‌ترین سایزِ موجود؛ old_price = قیمت اصلی همان سایز.
     بدون سایز: منطق سطح محصول. */
  const sizes = (Array.isArray(product.sizes) ? product.sizes : []).filter(
    (s) => s && toNum(s.price) > 0
  );

  let basePrice = toNum(product.price);
  let discount = toNum(product.discountPercent);
  let sizeStockSum = 0;
  let sizeBased = false;

  if (sizes.length > 0) {
    sizeBased = true;

    /* قیمت نهایی هر سایز با تخفیف «خودش» — مستقل، بدون تداخل */
    const sizeFinal = (s) => {
      const p = toNum(s.price);
      const d = toNum(s.discountPercent);
      return d > 0 && d < 100 ? Math.round(p * (1 - d / 100)) : p;
    };

    /* ارزان‌ترین سایزِ موجود؛ اگر هیچ سایزی موجود نیست: ارزان‌ترین همه */
    const inStockSizes = sizes.filter((s) => toNum(s.stock) > 0);
    const pool = inStockSizes.length > 0 ? inStockSizes : sizes;
    const cheapest = pool.reduce((a, b) => (sizeFinal(a) <= sizeFinal(b) ? a : b));

    basePrice = toNum(cheapest.price);
    discount = toNum(cheapest.discountPercent);
    sizeStockSum = sizes.reduce((sum, s) => sum + toNum(s.stock), 0);
  }

  const finalPrice =
    discount > 0 && discount < 100 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;

  /* old_price:
     - سایزدار: قیمت اصلی همان سایز
     - بدون سایز: بزرگ‌ترینِ price / oldPrice / finalPrice */
  const oldPrice = sizeBased
    ? basePrice
    : Math.max(basePrice, toNum(product.oldPrice), finalPrice);

  /* موجودی — همان منطق سایت (virtual مدل): status === 'active' و موجودی > 0.
     موجودی مؤثر = بزرگ‌ترینِ موجودی سطح محصول و مجموع موجودی سایزها
     (ادمین ممکن است فقط موجودی سطح محصول را پر کند و موجودی سایزها را خالی
     بگذارد، یا برعکس — هر دو حالت پشتیبانی می‌شود) */
  const stockQty = Math.max(toNum(product.stock), sizeStockSum);
  const inStock = product.status === 'active' && stockQty > 0;

  /* تصاویر: اولی همیشه عکس اصلی؛ نسبی → مطلق؛ حداکثر ۲۰ */
  const imageLinks = [...new Set([product.mainImage, ...(product.images || [])].filter(Boolean))]
    .slice(0, 20)
    .map(absoluteUrl);

  /* spec الزامی است — حتی دیکشنری خالی */
  const spec = {};
  const material = pick(product.material);
  const weight = String(product.weight || '').trim();
  const dimensions = String(product.dimensions || '').trim();
  const craftsman = pick(product.craftsman);
  if (material) spec['جنس'] = material;
  if (weight) spec['وزن'] = weight;
  if (dimensions) spec['ابعاد'] = dimensions;
  if (craftsman) spec['استادکار'] = craftsman;

  return {
    page_unique: String(product._id),
    page_url: `${SITE_URL}/fa/product/${product.slug}`,
    title: (pick(product.name) || 'محصول').slice(0, 500),
    subtitle: pick(product.shortDesc).slice(0, 500),
    current_price: finalPrice,
    old_price: oldPrice,
    availability: inStock,
    category_name: pick(product.category?.name).slice(0, 200),
    image_links: imageLinks,
    spec: spec,
    guarantee: pick(product.warranty).slice(0, 200),
    date_added: product.createdAt,
    date_updated: product.updatedAt,
  };
};

/* ---------------- اعتبارسنجی بدنهٔ درخواست طبق مستندات ترب ---------------- */
const validateTorobRequest = (body) => {
  if (Array.isArray(body.page_urls) && body.page_urls.length >= 1) {
    return { type: 'urls', page_urls: body.page_urls.map(String).slice(0, 100) };
  }
  if (Array.isArray(body.page_uniques) && body.page_uniques.length >= 1) {
    return { type: 'uniques', page_uniques: body.page_uniques.map(String).slice(0, 100) };
  }
  if (body.page !== undefined || body.sort !== undefined) {
    const page = Number(body.page);
    if (!Number.isInteger(page) || page < 1) {
      return { error: 'page parameter is invalid' };
    }
    if (!VALID_SORTS.includes(String(body.sort))) {
      return { error: 'sort parameter is not provided' };
    }
    return { type: 'list', page: page, sort: String(body.sort) };
  }
  return { error: 'no valid parameters provided' };
};

/* ---------------------- حالت لیست صفحه‌بندی‌شده ---------------------- */
const handleListRequest = async (validated) => {
  const cacheKey = 'torob:v3:list:' + validated.page + ':' + validated.sort;
  return getOrSet(cacheKey, CACHE_TTL, async () => {
    const filter = { status: { $in: PUBLIC_PRODUCT_STATUSES } };

    const mongoSort =
      validated.sort === 'date_updated_desc'
        ? { updatedAt: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };

    const [docs, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .sort(mongoSort)
        .skip((validated.page - 1) * PRODUCT_PAGE_SIZE)
        .limit(PRODUCT_PAGE_SIZE)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return {
      total: total,
      products: docs.map(formatProductForTorob),
    };
  });
};

/* --------------- محصولات خاص (URL یا unique) --------------- */
const handleSpecificRequest = async (validated) => {
  let filter = { status: { $in: PUBLIC_PRODUCT_STATUSES } };
  let slugs = [];

  if (validated.type === 'uniques') {
    const ids = validated.page_uniques
      .filter((s) => /^[0-9a-f]{24}$/i.test(s))
      .map((s) => new mongoose.Types.ObjectId(s));

    if (ids.length === 0) return { products: [] };
    filter._id = { $in: ids };
  } else {
    slugs = [...new Set(validated.page_urls.map(extractSlug).filter(Boolean))];
    if (slugs.length === 0) return { products: [] };

    filter.$or = [
      { slug: { $in: slugs } },
      { oldSlugs: { $in: slugs } },
    ];
    const ids = slugs
      .filter((s) => /^[0-9a-f]{24}$/i.test(s))
      .map((s) => new mongoose.Types.ObjectId(s));
    if (ids.length) filter.$or.push({ _id: { $in: ids } });
  }

  const rawKey =
    validated.type === 'uniques'
      ? validated.page_uniques.slice().sort().join(',')
      : slugs.slice().sort().join(',');
  const cacheKey = 'torob:v3:' + validated.type + ':' + hashKey(rawKey);

  const docs = await getOrSet(
    cacheKey,
    CACHE_TTL,
    () => Product.find(filter).populate('category', 'name').lean(),
    { negativeTtl: 30 }
  );

  return { products: (docs || []).map(formatProductForTorob) };
};

/* ------------------------------ هندلر اصلی ------------------------------ */
const getTorobProducts = async (req, res) => {
  try {
    const validated = validateTorobRequest(req.body || {});
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    if (validated.type === 'list') {
      const payload = await handleListRequest(validated);
      return res.json({
        api_version: 'torob_api_v3',
        current_page: validated.page,
        total: payload.total,
        max_pages: Math.max(1, Math.ceil(payload.total / PRODUCT_PAGE_SIZE)),
        products: payload.products,
      });
    }

    const result = await handleSpecificRequest(validated);
    return res.json({
      api_version: 'torob_api_v3',
      current_page: 1,
      total: result.products.length,
      max_pages: 1,
      products: result.products,
    });
  } catch (error) {
    fail(res, error);
  }
};

module.exports = { getTorobProducts };