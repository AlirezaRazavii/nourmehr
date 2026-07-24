const mongoose = require('mongoose')
const { GridFSBucket, ObjectId } = require('mongoose').mongo

// سرو تصویر از دیتابیس با نام فایل یا شناسه
exports.getHeroImage = async (req, res) => {
  try {
    const db = mongoose.connection.db
    const bucket = new GridFSBucket(db, { bucketName: 'heroImages' })

    const { id } = req.params
    let file

    if (ObjectId.isValid(id)) {
      const files = await bucket.find({ _id: new ObjectId(id) }).toArray()
      file = files[0]
    }
    if (!file) {
      const files = await bucket.find({ filename: id }).toArray()
      file = files[0]
    }

    if (!file) {
      return res.status(404).json({ message: 'تصویر یافت نشد' })
    }

    res.set('Content-Type', file.contentType || 'image/webp')
    res.set('Cache-Control', 'public, max-age=31536000, immutable')

    const stream = bucket.openDownloadStream(file._id)
    stream.on('error', () => res.status(404).end())
    stream.pipe(res)
  } catch (err) {
    console.error('getHeroImage error:', err)
    res.status(500).json({ message: 'خطا در دریافت تصویر' })
  }
}

// حذف فایل تصویر از دیتابیس (وقتی اسلاید حذف/ویرایش می‌شود)
exports.deleteHeroImageFile = async (filenameOrUrl) => {
  try {
    if (!filenameOrUrl) return
    const db = mongoose.connection.db
    const bucket = new GridFSBucket(db, { bucketName: 'heroImages' })

    // فقط نام فایل را از انتهای URL جدا می‌کنیم
    const key = String(filenameOrUrl).split('/').pop()

    let file
    if (ObjectId.isValid(key)) {
      const files = await bucket.find({ _id: new ObjectId(key) }).toArray()
      file = files[0]
    }
    if (!file) {
      const files = await bucket.find({ filename: key }).toArray()
      file = files[0]
    }
    if (file) await bucket.delete(file._id)
  } catch (err) {
    console.error('deleteHeroImageFile error:', err)
  }
}
