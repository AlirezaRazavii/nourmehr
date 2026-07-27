const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const PRODUCTS_DIR = path.join(__dirname, '../../uploads/products');

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const getImage = async (req, res) => {
  try {
    // جلوگیری از path traversal
    const filename = path.basename(String(req.params.filename || ''));
    if (!filename || filename.startsWith('.')) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }

    const filePath = path.join(PRODUCTS_DIR, filename);
    if (!filePath.startsWith(PRODUCTS_DIR)) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    let stat;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      res.set('Cache-Control', 'public, max-age=60');
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    if (!stat.isFile()) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
    const lastModified = stat.mtime.toUTCString();

    res.set({
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': etag,
      'Last-Modified': lastModified,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
    });

    const inm = req.headers['if-none-match'];
    const ims = req.headers['if-modified-since'];
    if ((inm && inm === etag) || (ims && new Date(ims) >= new Date(lastModified))) {
      return res.status(304).end();
    }

    res.set('Content-Length', stat.size);
    if (req.method === 'HEAD') return res.end();

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    req.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (error) {
    console.error('getImage error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getImage };
