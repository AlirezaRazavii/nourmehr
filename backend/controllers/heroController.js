const Hero = require('../models/Hero');
const { getOrSet, KEYS } = require('../utils/cache');

const HERO_CACHE_TTL = 600;   // ۱۰ دقیقه — با invalidate از پنل ادمین فوراً باطل می‌شود
const HERO_EMPTY_TTL = 60;    // وقتی هیرو خالی/غیرفعال است

/** متن دوزبانه را با fallback امن برمی‌گرداند */
const pick = (field, lang) => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  const primary = field[lang];
  if (primary && String(primary).trim()) return primary;
  const fallback = lang === 'fa' ? field.en : field.fa;
  return (fallback && String(fallback).trim()) ? fallback : '';
};

const clamp01 = (v, def = 0.35) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(1, Math.max(0, n));
};

const buildPayload = (hero, lang) => {
  if (!hero) {
    return { enabled: false, slides: [], settings: {}, version: null };
  }

  const settings = hero.settings || {};
  const version = hero.updatedAt ? new Date(hero.updatedAt).getTime() : null;

  if (settings.isEnabled === false) {
    return { enabled: false, slides: [], settings, version };
  }

  const slides = (hero.slides || [])
    .filter((s) => s && s.isActive !== false)
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((s) => ({
      id: String(s._id),
      title: pick(s.title, lang),
      subtitle: pick(s.subtitle, lang),
      description: pick(s.description, lang),
      buttonText: pick(s.buttonText, lang),
      buttonLink: s.buttonLink || '/products',
      image: s.productImage || '',
      bgImage: s.bgImage || '',
      themeColor: s.themeColor || '#c5a059',
      bgBrightness: clamp01(s.bgBrightness, 0.35),
    }))
    // اسلایدی که نه تصویر دارد نه متن، عملاً خالی است و نباید رندر شود
    .filter((s) => s.image || s.bgImage || s.title || s.subtitle);

  return {
    enabled: slides.length > 0,
    slides,
    settings,
    version,
  };
};

/**
 * GET /api/hero
 * خروجی محلی‌سازی‌شده بر اساس زبان درخواست
 */
exports.getPublicHero = async (req, res) => {
  try {
    const lang = req.language === 'en' ? 'en' : 'fa';
    const cacheKey = `${KEYS.HERO}${lang}`;

    const data = await getOrSet(cacheKey, HERO_CACHE_TTL, async () => {
      const hero = await Hero.findOne({ key: 'main' })
        .select('slides settings updatedAt')
        .lean();
      return buildPayload(hero, lang);
    });

    const isEmpty = !data || data.enabled === false || !data.slides?.length;

    // must-revalidate تا افزودن اسلاید بلافاصله در مرورگر دیده شود،
    // ولی stale-while-revalidate سرعت را حفظ می‌کند
    res.set(
      'Cache-Control',
      isEmpty
        ? `public, max-age=${HERO_EMPTY_TTL}, must-revalidate`
        : 'public, max-age=0, must-revalidate, stale-while-revalidate=300'
    );

    if (data?.version) res.set('ETag', `W/"hero-${lang}-${data.version}"`);

    res.vary('Accept-Language');
    res.vary('X-Lang');

    res.json(data);
  } catch (err) {
    console.error('getPublicHero error:', err);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ message: 'خطا در دریافت اطلاعات هیرو' });
  }
};
