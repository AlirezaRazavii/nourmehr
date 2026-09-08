/**
 * احراز هویت ترب — Torob Product API v3
 * ---------------------------------------------------------------
 * ترب درخواست‌هایش را با JWT امضاشده با کلید خصوصی خودش می‌فرستد
 * (الگوریتم EdDSA / ed25519). ما فقط امضا را با «کلید عمومی» ترب
 * تأیید می‌کنیم — هیچ secret مشترکی در کار نیست.
 *
 * هدرهای درخواست ترب:
 *   X-Torob-Token         → JWT امضاشده
 *   X-Torob-Token-Version → نسخهٔ طرح توکن (فعلاً فقط «1»)
 *
 * Claims داخل توکن:
 *   aud → مخاطب توکن؛ باید با hostname سرور ما مطابقت کند
 *   exp → انقضا (کتابخانه خودش چک می‌کند)
 *   nbf → اعتبار از (کتابخانه خودش چک می‌کند)
 *
 * مستندات رسمی: Torob-Sync/torob_api_token_guide.md
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const IS_PROD = process.env.NODE_ENV === 'production';

/* کلید عمومی ترب — ثابت است و در مستندات رسمی ترب منتشر شده */
const TOROB_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAt6Mu4T0pBORY11W+QeM35UsmLO3vsf+6yKpFDEImFk0=
-----END PUBLIC KEY-----`;

/* کلید فقط یک بار در زمان بوت ساخته می‌شود
   (نمونهٔ Go در مستندات ترب هم همین توصیه را دارد) */
let torobKey = null;
try {
  torobKey = crypto.createPublicKey(TOROB_PUBLIC_KEY_PEM);
} catch (err) {
  // معمولاً یعنی نسخهٔ Node قدیمی است (Ed25519 نیازمند Node 16+)
  console.error('🔴 [torobAuth] ساخت کلید عمومی Ed25519 ناموفق بود:', err.message);
}

const verifyTorobToken = (req, res, next) => {
  /* حالت تست لوکال: فقط وقتی production نیست و صریحاً فعال شده.
     در production حتی اگر متغیر leaked شود، این شاخه هرگز اجرا نمی‌شود. */
  if (!IS_PROD && process.env.TOROB_DEV_BYPASS === 'true') {
    console.warn('🟡 [torobAuth] TOROB_DEV_BYPASS فعال است — احراز هویت رد شد (فقط dev)');
    return next();
  }

  if (!torobKey) {
    return res.status(500).json({ error: 'Torob public key not loaded' });
  }

  const token = req.headers['x-torob-token'];
  const tokenVersion = req.headers['x-torob-token-version'];

  if (!token) {
    return res.status(401).json({ error: 'X-Torob-Token header is missing' });
  }
  if (tokenVersion !== '1') {
    return res.status(401).json({ error: 'Unsupported X-Torob-Token-Version' });
  }

  try {
    const expectedAudience = (
      process.env.TOROB_AUDIENCE || req.headers.host || ''
    ).toString().toLowerCase().trim();

    jwt.verify(token, torobKey, {
      algorithms: ['EdDSA'], // فقط EdDSA — توکن با الگوریتم دیگر پذیرفته نمی‌شود
      audience: expectedAudience,
    });

    next();
  } catch (err) {
    if (!IS_PROD) console.error('[torobAuth] token verification failed:', err.message);
    // پیام خطا عمداً کلی است تا به بیرون نشت اطلاعات نکند
    return res.status(401).json({ error: 'Invalid Torob token' });
  }
};

module.exports = { verifyTorobToken };