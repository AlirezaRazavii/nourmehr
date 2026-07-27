const mongoose = require('mongoose')
const { GridFSBucket, ObjectId } = require('mongoose').mongo

const BUCKET_NAME = 'heroImages'

// ---- کش متادیتای فایل‌ها در حافظه (جلوگیری از کوئری تکراری به Mongo) ----
const META_TTL = 15 * 60 * 1000 // 15 دقیقه
const metaCache = new Map()

function getBucket() {
  const db = mongoose.connection.db
  if (!db) throw new Error('Database connection is not ready')
  return new GridFSBucket(db, { bucketName: BUCKET_NAME })
}

function isPureObjectId(value) {
  return ObjectId.isValid(value) && String(new ObjectId(value)) === String(value)
}

function normalizeKey(input) {
  // فقط نام فایل انتهای مسیر را برمی‌داریم و از path traversal جلوگیری می‌کنیم
  return String(input || '').split('/').pop().split('?')[0].trim()
}

async function findFileMeta(key) {
  const cached = metaCache.get(key)
  if (cached && cached.expires > Date.now()) return cached.file

  const bucket = getBucket()
  let file = null

  if (isPureObjectId(key)) {
    const rows = await bucket.find({ _id: new ObjectId(key) }).limit(1).toArray()
    file = rows[0] || null
  }
  if (!file) {
    const rows = await bucket.find({ filename: key }).limit(1).toArray()
    file = rows[0] || null
  }

  if (file) {
    metaCache.set(key, { file, expires: Date.now() + META_TTL })
    // کلید دوم (id) هم کش شود تا هر دو حالت سریع باشند
    metaCache.set(String(file._id), { file, expires: Date.now() + META_TTL })
  }
  return file
}

function invalidateMeta(file, key) {
  if (key) metaCache.delete(key)
  if (file) {
    metaCache.delete(String(file._id))
    metaCache.delete(String(file.filename))
  }
}

// ---- سرو تصویر از دیتابیس با نام فایل یا شناسه ----
exports.getHeroImage = async (req, res) => {
  try {
    const key = normalizeKey(req.params.id)
    if (!key) return res.status(400).json({ message: 'شناسه تصویر نامعتبر است' })

    const file = await findFileMeta(key)
    if (!file) {
      res.set('Cache-Control', 'public, max-age=60')
      return res.status(404).json({ message: 'تصویر یافت نشد' })
    }

    const etag = `"${file._id}-${file.length}"`
    const lastModified = new Date(file.uploadDate || Date.now()).toUTCString()

    res.set({
      'Content-Type': file.contentType || 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': etag,
      'Last-Modified': lastModified,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
    })

    // ---- پاسخ 304 برای مرورگرهایی که نسخه کش‌شده دارند ----
    const inm = req.headers['if-none-match']
    const ims = req.headers['if-modified-since']
    if ((inm && inm === etag) || (ims && new Date(ims) >= new Date(lastModified))) {
      return res.status(304).end()
    }

    const bucket = getBucket()
    const range = req.headers.range

    // ---- درخواست Range (پخش تدریجی) ----
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      const [startRaw, endRaw] = range.replace('bytes=', '').split('-')
      const start = startRaw ? parseInt(startRaw, 10) : 0
      const end = endRaw ? Math.min(parseInt(endRaw, 10), file.length - 1) : file.length - 1

      if (Number.isNaN(start) || start >= file.length || start > end) {
        res.set('Content-Range', `bytes */${file.length}`)
        return res.status(416).end()
      }

      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Content-Length': end - start + 1,
      })

      if (req.method === 'HEAD') return res.end()

      const stream = bucket.openDownloadStream(file._id, { start, end: end + 1 })
      stream.on('error', () => res.destroy())
      req.on('close', () => stream.destroy())
      return stream.pipe(res)
    }

    res.set('Content-Length', file.length)
    if (req.method === 'HEAD') return res.end()

    const stream = bucket.openDownloadStream(file._id)
    stream.on('error', (err) => {
      console.error('heroImage stream error:', err)
      invalidateMeta(file, key)
      if (!res.headersSent) res.status(404).end()
      else res.destroy()
    })
    req.on('close', () => stream.destroy())
    stream.pipe(res)
  } catch (err) {
    console.error('getHeroImage error:', err)
    if (!res.headersSent) res.status(500).json({ message: 'خطا در دریافت تصویر' })
  }
}

// ---- حذف فایل تصویر از دیتابیس (وقتی اسلاید حذف/ویرایش می‌شود) ----
exports.deleteHeroImageFile = async (filenameOrUrl) => {
  try {
    if (!filenameOrUrl) return
    const key = normalizeKey(filenameOrUrl)
    if (!key) return

    const file = await findFileMeta(key)
    invalidateMeta(file, key)
    if (!file) return

    const bucket = getBucket()
    await bucket.delete(file._id)
  } catch (err) {
    console.error('deleteHeroImageFile error:', err)
  }
}

// ---- خالی کردن کش متادیتا (در صورت نیاز از بیرون) ----
exports.clearHeroImageMetaCache = () => metaCache.clear()
