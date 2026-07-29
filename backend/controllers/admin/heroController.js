const mongoose = require('mongoose')
const crypto = require('crypto')
const path = require('path')
const { GridFSBucket } = require('mongoose').mongo

const Hero = require('../../models/Hero')
const { deleteHeroImageFile } = require('../heroImageController')
const { invalidateHeroCache } = require('../../utils/cache')

/* ─────────── helpers ─────────── */

async function getOrCreateHero() {
  let hero = await Hero.findOne({ key: 'main' })
  if (!hero) {
    hero = await Hero.create({ key: 'main', slides: [], settings: {} })
  }
  return hero
}

/** ذخیره + بروزرسانی updatedAt + باطل‌کردن کش عمومی (هر دو زبان) */
async function saveAndInvalidate(hero) {
  hero.markModified('slides')
  hero.markModified('settings')
  hero.updatedAt = new Date()
  await hero.save()
  invalidateHeroCache()
}

const clamp01 = (v, def = 0.35) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.min(1, Math.max(0, n))
}

const bilingual = (v) => ({
  fa: (v && typeof v === 'object' ? v.fa : '') || '',
  en: (v && typeof v === 'object' ? v.en : '') || '',
})

const isHexColor = (c) => typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)

/* ─────────── read ─────────── */

// GET /api/admin/hero
exports.getHero = async (req, res) => {
  try {
    const hero = await getOrCreateHero()
    res.set('Cache-Control', 'no-store')
    res.json(hero)
  } catch (err) {
    console.error('admin getHero error:', err)
    res.status(500).json({ message: 'خطا در دریافت هیرو' })
  }
}

/* ─────────── upload (GridFS) ─────────── */

// POST /api/admin/hero/upload
exports.uploadHeroImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'فایلی ارسال نشده است' })
    }

    const db = mongoose.connection.db
    if (!db) return res.status(503).json({ message: 'اتصال دیتابیس آماده نیست' })

    const bucket = new GridFSBucket(db, { bucketName: 'heroImages' })

    const ext = (path.extname(req.file.originalname) || '').toLowerCase()
    const filename = `hero-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: {
        originalName: req.file.originalname,
        uploadedBy: req.user?._id || null,
        size: req.file.size,
      },
    })

    uploadStream.end(req.file.buffer)

    uploadStream.on('finish', () => {
      res.status(201).json({
        url: `/api/hero-images/${filename}`,
        filename,
        id: uploadStream.id,
      })
    })

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err)
      if (!res.headersSent) res.status(500).json({ message: 'خطا در ذخیره تصویر در دیتابیس' })
    })
  } catch (err) {
    console.error('uploadHeroImage error:', err)
    if (!res.headersSent) res.status(500).json({ message: 'خطا در آپلود تصویر' })
  }
}

/* ─────────── slides CRUD ─────────── */

// POST /api/admin/hero/slides
exports.addSlide = async (req, res) => {
  try {
    const hero = await getOrCreateHero()
    const b = req.body || {}

    const hasContent =
      b.productImage || b.bgImage ||
      b.title?.fa || b.title?.en ||
      b.subtitle?.fa || b.subtitle?.en

    if (!hasContent) {
      return res.status(400).json({ message: 'حداقل یک تصویر یا عنوان برای اسلاید لازم است' })
    }

    const maxOrder = hero.slides.reduce((m, s) => Math.max(m, s.order || 0), 0)

    hero.slides.push({
      title: bilingual(b.title),
      subtitle: bilingual(b.subtitle),
      description: bilingual(b.description),
      buttonText: bilingual(b.buttonText),
      buttonLink: b.buttonLink || '/products',
      productImage: b.productImage || '',
      bgImage: b.bgImage || '',
      themeColor: isHexColor(b.themeColor) ? b.themeColor : '#c5a059',
      bgBrightness: clamp01(b.bgBrightness, 0.35),
      order: maxOrder + 1,
      isActive: b.isActive !== false,
    })

    await saveAndInvalidate(hero)

    res.status(201).json(hero.slides[hero.slides.length - 1])
  } catch (err) {
    console.error('addSlide error:', err)
    res.status(500).json({ message: 'خطا در افزودن اسلاید' })
  }
}

// PUT /api/admin/hero/slides/:slideId
exports.updateSlide = async (req, res) => {
  try {
    const { slideId } = req.params
    if (!mongoose.Types.ObjectId.isValid(slideId)) {
      return res.status(400).json({ message: 'شناسه اسلاید نامعتبر است' })
    }

    const hero = await getOrCreateHero()
    const slide = hero.slides.id(slideId)
    if (!slide) return res.status(404).json({ message: 'اسلاید یافت نشد' })

    const b = req.body || {}

    // اگر تصویر عوض شد، فایل قدیمی از GridFS حذف شود تا فضا هدر نرود
    if (b.productImage !== undefined && slide.productImage && b.productImage !== slide.productImage) {
      await deleteHeroImageFile(slide.productImage)
    }
    if (b.bgImage !== undefined && slide.bgImage && b.bgImage !== slide.bgImage) {
      await deleteHeroImageFile(slide.bgImage)
    }

    if (b.title !== undefined) slide.title = bilingual(b.title)
    if (b.subtitle !== undefined) slide.subtitle = bilingual(b.subtitle)
    if (b.description !== undefined) slide.description = bilingual(b.description)
    if (b.buttonText !== undefined) slide.buttonText = bilingual(b.buttonText)
    if (b.buttonLink !== undefined) slide.buttonLink = b.buttonLink || '/products'
    if (b.productImage !== undefined) slide.productImage = b.productImage || ''
    if (b.bgImage !== undefined) slide.bgImage = b.bgImage || ''
    if (b.themeColor !== undefined && isHexColor(b.themeColor)) slide.themeColor = b.themeColor
    if (b.bgBrightness !== undefined) slide.bgBrightness = clamp01(b.bgBrightness, slide.bgBrightness)
    if (b.isActive !== undefined) slide.isActive = !!b.isActive
    if (b.order !== undefined && Number.isFinite(Number(b.order))) slide.order = Number(b.order)

    await saveAndInvalidate(hero)

    res.json(slide)
  } catch (err) {
    console.error('updateSlide error:', err)
    res.status(500).json({ message: 'خطا در ویرایش اسلاید' })
  }
}

// DELETE /api/admin/hero/slides/:slideId
exports.deleteSlide = async (req, res) => {
  try {
    const { slideId } = req.params
    if (!mongoose.Types.ObjectId.isValid(slideId)) {
      return res.status(400).json({ message: 'شناسه اسلاید نامعتبر است' })
    }

    const hero = await getOrCreateHero()
    const slide = hero.slides.id(slideId)
    if (!slide) return res.status(404).json({ message: 'اسلاید یافت نشد' })

    const oldProduct = slide.productImage
    const oldBg = slide.bgImage

    slide.deleteOne()

    // مرتب‌سازی مجدد order تا شماره‌ها پیوسته بمانند
    hero.slides
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((s, i) => { s.order = i + 1 })

    await saveAndInvalidate(hero)

    // حذف فایل‌ها بعد از موفقیت ذخیره
    if (oldProduct) await deleteHeroImageFile(oldProduct)
    if (oldBg) await deleteHeroImageFile(oldBg)

    res.json({ message: 'اسلاید حذف شد', slideId })
  } catch (err) {
    console.error('deleteSlide error:', err)
    res.status(500).json({ message: 'خطا در حذف اسلاید' })
  }
}

// PUT /api/admin/hero/slides-order   body: { order: [slideId, ...] }
exports.reorderSlides = async (req, res) => {
  try {
    const { order } = req.body || {}
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: 'order باید آرایه‌ای از شناسه‌ها باشد' })
    }

    const hero = await getOrCreateHero()

    order.forEach((slideId, i) => {
      const slide = hero.slides.id(slideId)
      if (slide) slide.order = i + 1
    })

    // اسلایدهایی که در آرایه نبودند، به انتها منتقل شوند
    let tail = order.length
    hero.slides.forEach((s) => {
      if (!order.includes(String(s._id))) s.order = ++tail
    })

    hero.slides.sort((a, b) => (a.order || 0) - (b.order || 0))

    await saveAndInvalidate(hero)

    res.json({ message: 'ترتیب اسلایدها به‌روزرسانی شد', slides: hero.slides })
  } catch (err) {
    console.error('reorderSlides error:', err)
    res.status(500).json({ message: 'خطا در مرتب‌سازی اسلایدها' })
  }
}

/* ─────────── settings ─────────── */

const ALLOWED_TRANSITIONS = ['slide', 'fade', 'zoom']

// PUT /api/admin/hero/settings
exports.updateSettings = async (req, res) => {
  try {
    const hero = await getOrCreateHero()
    const b = req.body || {}

    const current = hero.settings?.toObject?.() || hero.settings || {}
    const next = { ...current }

    const bools = [
      'isEnabled', 'autoplay', 'pauseOnHover', 'showTimer',
      'showCounter', 'showBgTypography', 'showCornerDeco', 'enableFloat',
    ]
    bools.forEach((k) => { if (b[k] !== undefined) next[k] = !!b[k] })

    if (b.autoplayDelay !== undefined) {
      const d = Number(b.autoplayDelay)
      next.autoplayDelay = Number.isFinite(d) ? Math.min(30000, Math.max(2000, d)) : 6000
    }

    if (b.transitionType !== undefined && ALLOWED_TRANSITIONS.includes(b.transitionType)) {
      next.transitionType = b.transitionType
    }

    if (b.heroHeight !== undefined) {
      next.heroHeight = typeof b.heroHeight === 'string' ? b.heroHeight.trim() : ''
    }

    hero.settings = next
    await saveAndInvalidate(hero)

    res.json(hero.settings)
  } catch (err) {
    console.error('updateSettings error:', err)
    res.status(500).json({ message: 'خطا در به‌روزرسانی تنظیمات' })
  }
}
