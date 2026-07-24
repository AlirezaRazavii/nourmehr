const mongoose = require('mongoose')
const crypto = require('crypto')
const path = require('path')
const { GridFSBucket } = require('mongoose').mongo
const Hero = require('../../models/Hero')
const { deleteHeroImageFile } = require('../heroImageController')

// دریافت یا ساخت سند تکی هیرو
async function getOrCreateHero() {
  let hero = await Hero.findOne({ key: 'main' })
  if (!hero) {
    hero = await Hero.create({ key: 'main', slides: [], settings: {} })
  }
  return hero
}

// ---- دریافت کل هیرو برای ادمین ----
exports.getHero = async (req, res) => {
  try {
    const hero = await getOrCreateHero()
    res.json(hero)
  } catch (err) {
    console.error('admin getHero error:', err)
    res.status(500).json({ message: 'خطا در دریافت هیرو' })
  }
}

// ---- آپلود تصویر به دیتابیس (GridFS) ----
exports.uploadHeroImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'فایلی ارسال نشده است' })
    }

    const db = mongoose.connection.db
    const bucket = new GridFSBucket(db, { bucketName: 'heroImages' })

    const ext = path.extname(req.file.originalname) || ''
    const filename = `hero-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: {
        originalName: req.file.originalname,
        uploadedBy: req.user?._id || null,
      },
    })

    uploadStream.end(req.file.buffer)

    uploadStream.on('finish', () => {
      res.json({ url: `/api/hero-images/${filename}`, filename, id: uploadStream.id })
    })

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err)
      res.status(500).json({ message: 'خطا در ذخیره تصویر در دیتابیس' })
    })
  } catch (err) {
    console.error('uploadHeroImage error:', err)
    res.status(500).json({ message: 'خطا در آپلود تصویر' })
  }
}

// ---- افزودن اسلاید ----
exports.addSlide = async (req, res) => {
  try {
    const hero = await getOrCreateHero()
    const {
      title, subtitle, description, buttonText, buttonLink,
      productImage, bgImage, themeColor, bgBrightness, isActive,
    } = req.body

    const maxOrder = hero.slides.reduce((m, s) => Math.max(m, s.order || 0), 0)

    hero.slides.push({
      title: title || { fa: '', en: '' },
      subtitle: subtitle || { fa: '', en: '' },
      description: description || { fa: '', en: '' },
      buttonText: buttonText || { fa: '', en: '' },
      buttonLink: buttonLink || '/products',
      productImage: productImage || '',
      bgImage: bgImage || '',
      themeColor: themeColor || '#0db9e9',
      bgBrightness: typeof bgBrightness === 'number' ? bgBrightness : 0.35,
      order: maxOrder + 1,
      isActive: isActive !== false,
    })

    await hero.save()
    res.status(201).json(hero.slides[hero.slides.length - 1])
  } catch (err) {
    console.error('addSlide error:', err)
    res.status(500).json({ message: 'خطا در افزودن اسلاید' })
  }
}

// ---- ویرایش اسلاید ----
exports.updateSlide = async (req, res) => {
  try {
    const { slideId } = req.params
    const hero = await getOrCreateHero()
    const slide = hero.slides.id(slideId)
    if (!slide) return res.status(404).json({ message: 'اسلاید یافت نشد' })

    // اگر تصویر عوض شد، تصویر قدیمی را از دیتابیس حذف کن
    if (req.body.productImage !== undefined && slide.productImage && req.body.productImage !== slide.productImage) {
      await deleteHeroImageFile(slide.productImage)
    }
    if (req.body.bgImage !== undefined && slide.bgImage && req.body.bgImage !== slide.bgImage) {
      await deleteHeroImageFile(slide.bgImage)
    }

    const fields = [
      'title', 'subtitle', 'description', 'buttonText', 'buttonLink',
      'productImage', 'bgImage', 'themeColor', 'bgBrightness', 'isActive', 'order',
    ]
    fields.forEach((f) => {
      if (req.body[f] !== undefined) slide[f] = req.body[f]
    })

    await hero.save()
    res.json(slide)
  } catch (err) {
    console.error('updateSlide error:', err)
    res.status(500).json({ message: 'خطا در ویرایش اسلاید' })
  }
}

// ---- حذف اسلاید ----
exports.deleteSlide = async (req, res) => {
  try {
    const { slideId } = req.params
    const hero = await getOrCreateHero()
    const slide = hero.slides.id(slideId)
    if (!slide) return res.status(404).json({ message: 'اسلاید یافت نشد' })

    if (slide.productImage) await deleteHeroImageFile(slide.productImage)
    if (slide.bgImage) await deleteHeroImageFile(slide.bgImage)

    slide.deleteOne()
    await hero.save()
    res.json({ message: 'اسلاید حذف شد', slideId })
  } catch (err) {
    console.error('deleteSlide error:', err)
    res.status(500).json({ message: 'خطا در حذف اسلاید' })
  }
}

// ---- مرتب‌سازی اسلایدها ----
// انتظار: { order: [slideId1, slideId2, ...] }
exports.reorderSlides = async (req, res) => {
  try {
    const { order } = req.body
    if (!Array.isArray(order)) {
      return res.status(400).json({ message: 'order باید آرایه باشد' })
    }
    const hero = await getOrCreateHero()

    order.forEach((slideId, index) => {
      const slide = hero.slides.id(slideId)
      if (slide) slide.order = index + 1
    })

    hero.slides.sort((a, b) => (a.order || 0) - (b.order || 0))
    await hero.save()
    res.json({ message: 'ترتیب اسلایدها به‌روزرسانی شد', slides: hero.slides })
  } catch (err) {
    console.error('reorderSlides error:', err)
    res.status(500).json({ message: 'خطا در مرتب‌سازی اسلایدها' })
  }
}

// ---- به‌روزرسانی تنظیمات کلی ----
exports.updateSettings = async (req, res) => {
  try {
    const hero = await getOrCreateHero()
    hero.settings = { ...hero.settings.toObject(), ...req.body }
    await hero.save()
    res.json(hero.settings)
  } catch (err) {
    console.error('updateSettings error:', err)
    res.status(500).json({ message: 'خطا در به‌روزرسانی تنظیمات' })
  }
}
