const Hero = require('../models/Hero')

// دریافت هیرو برای نمایش در سایت (محلی‌سازی‌شده بر اساس زبان)
exports.getPublicHero = async (req, res) => {
  try {
    const lang = req.language === 'en' ? 'en' : 'fa'

    let hero = await Hero.findOne({ key: 'main' }).lean()

    if (!hero) {
      return res.json({ enabled: false, slides: [], settings: {} })
    }

    if (hero.settings && hero.settings.isEnabled === false) {
      return res.json({ enabled: false, slides: [], settings: hero.settings })
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
      }))

    res.json({ enabled: true, slides, settings: hero.settings || {} })
  } catch (err) {
    console.error('getPublicHero error:', err)
    res.status(500).json({ message: 'خطا در دریافت اطلاعات هیرو' })
  }
}
