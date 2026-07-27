const Hero = require('../models/Hero');
const { getOrSet, KEYS } = require('../utils/cache');

const HERO_CACHE_TTL = 600;
const HERO_EMPTY_TTL = 60;

const buildPayload = (hero, lang) => {
  if (!hero) {
    return { enabled: false, slides: [], settings: {} };
  }

  if (hero.settings && hero.settings.isEnabled === false) {
    return { enabled: false, slides: [], settings: hero.settings };
  }

  const slides = (hero.slides || [])
    .filter((s) => s.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((s) => ({
      id: s._id,
      title: s.title?.[lang] || s.title?.fa || '',
      subtitle: s.subtitle?.[lang] || s.subtitle?.fa || '',
      description: s.description?.[lang] || s.description?.fa || '',
      buttonText: s.buttonText?.[lang] || s.buttonText?.fa || '',
      buttonLink: s.buttonLink || '/products',
      image: s.productImage || '',
      bgImage: s.bgImage || '',
      themeColor: s.themeColor || '#0db9e9',
      bgBrightness: typeof s.bgBrightness === 'number' ? s.bgBrightness : 0.35,
    }));

  return { enabled: true, slides, settings: hero.settings || {} };
};

// دریافت هیرو برای نمایش در سایت (محلی‌سازی‌شده بر اساس زبان)
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

    res.set(
      'Cache-Control',
      isEmpty
        ? `public, max-age=${HERO_EMPTY_TTL}, stale-while-revalidate=120`
        : 'public, max-age=120, stale-while-revalidate=600'
    );

    res.vary('Accept-Language');
    res.vary('X-Lang');

    res.json(data);
  } catch (err) {
    console.error('getPublicHero error:', err);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ message: 'خطا در دریافت اطلاعات هیرو' });
  }
};
