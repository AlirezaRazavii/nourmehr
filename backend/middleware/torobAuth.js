/**
 * احراز هویت ترب — Torob Product API v3 (EdDSA با crypto خام)
 * ---------------------------------------------------------------
 * ⚠️ چرا jsonwebtoken استفاده نمی‌کنیم؟
 * کتابخانه jsonwebtoken الگوریتم EdDSA را پشتیبانی نمی‌کند
 * (خطای «"algorithm" must be a valid string enum value»).
 * پس JWT را با ماژول crypto خود Node تأیید می‌کنیم:
 *   ۱) جداکردن header.payload.signature
 *   ۲) بررسی alg == EdDSA
 *   ۳) تأیید امضای Ed25519 روی متن خام «header.payload»
 *   ۴) بررسی claims: exp / nbf / aud
 */
const crypto = require('crypto');

const IS_PROD = process.env.NODE_ENV === 'production';

/* کلید عمومی ترب — از مستندات رسمی Torob-Sync */
const TOROB_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAt6Mu4T0pBORY11W+QeM35UsmLO3vsf+6yKpFDEImFk0=
-----END PUBLIC KEY-----`;

/* جبران اختلاف ساعت کوچک بین سرور ما و ترب (ثانیه) */
const CLOCK_TOLERANCE_SEC = 30;

let torobKey = null;
try {
  torobKey = crypto.createPublicKey(TOROB_PUBLIC_KEY_PEM);
} catch (err) {
  console.error('🔴 [torobAuth] ساخت کلید عمومی Ed25519 ناموفق بود:', err.message);
}

/* دیکد base64url (سازگار با همه نسخه‌های Node) */
const b64uDecode = (s) => {
  let b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return Buffer.from(b64, 'base64');
};

/* ---------------------------------------------------------------
 * تابع خالص تأیید JWT ترب — جدا از middleware تا تست‌پذیر باشد.
 * موفق: payload را برمی‌گرداند. ناموفق: خطا با .code پر می‌دهد.
 * --------------------------------------------------------------- */
const verifyTorobJwt = (token, expectedAudiences, key) => {
  const parts = String(token).split('.');
  if (parts.length !== 3) {
    throw Object.assign(new Error('token structure invalid'), { code: 'TOROB_JWT_MALFORMED' });
  }
  const [h, p, s] = parts;

  /* ۱) هدر */
  let header;
  try {
    header = JSON.parse(b64uDecode(h).toString('utf8'));
  } catch {
    throw Object.assign(new Error('header decode failed'), { code: 'TOROB_JWT_MALFORMED' });
  }
  if (!header || header.alg !== 'EdDSA') {
    throw Object.assign(new Error(`unsupported alg: ${header && header.alg}`), { code: 'TOROB_JWT_ALG' });
  }

  /* ۲) امضای Ed25519 روی متن خام «header.payload» */
  let sig;
  try {
    sig = b64uDecode(s);
  } catch {
    throw Object.assign(new Error('signature decode failed'), { code: 'TOROB_JWT_MALFORMED' });
  }
  const data = Buffer.from(`${h}.${p}`, 'utf8');
  const sigOk = crypto.verify(null, data, key, sig);
  if (!sigOk) {
    throw Object.assign(new Error('signature mismatch'), { code: 'TOROB_JWT_SIGNATURE' });
  }

  /* ۳) payload */
  let payload;
  try {
    payload = JSON.parse(b64uDecode(p).toString('utf8'));
  } catch {
    throw Object.assign(new Error('payload decode failed'), { code: 'TOROB_JWT_MALFORMED' });
  }
  if (!payload || typeof payload !== 'object') {
    throw Object.assign(new Error('payload invalid'), { code: 'TOROB_JWT_MALFORMED' });
  }

  /* ۴) claims */
  const nowSec = Math.floor(Date.now() / 1000);

  // exp — الزامی طبق مستندات ترب
  if (typeof payload.exp !== 'number') {
    throw Object.assign(new Error('exp claim missing'), { code: 'TOROB_JWT_EXP' });
  }
  if (nowSec - CLOCK_TOLERANCE_SEC >= payload.exp) {
    throw Object.assign(new Error('token expired'), { code: 'TOROB_JWT_EXP' });
  }

  // nbf — اختیاری
  if (typeof payload.nbf === 'number' && nowSec + CLOCK_TOLERANCE_SEC < payload.nbf) {
    throw Object.assign(new Error('token not yet valid (nbf)'), { code: 'TOROB_JWT_NBF' });
  }

  // aud — مخاطب باید در لیست قابل قبول ما باشد
  const tokenAud = payload.aud;
  const audOk = Array.isArray(tokenAud)
    ? tokenAud.some((a) => expectedAudiences.includes(String(a)))
    : expectedAudiences.includes(String(tokenAud));
  if (!audOk) {
    throw Object.assign(
      new Error(`audience mismatch — token aud: ${JSON.stringify(tokenAud)}`),
      { code: 'TOROB_JWT_AUD' }
    );
  }

  return payload;
};

/* ------------------------------ middleware ------------------------------ */
const verifyTorobToken = (req, res, next) => {
  /* حالت تست لوکال: فقط وقتی production نیست و صریحاً فعال شده */
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

  /* مخاطب قابل قبول: env + Host هدر + واریانت بدون www */
  const envAud = String(process.env.TOROB_AUDIENCE || '').toLowerCase().trim();
  const hostAud = String(req.headers.host || '').toLowerCase().trim();
  const expectedAudiences = [
    ...new Set(
      [envAud, hostAud, envAud.replace(/^www\./, ''), hostAud.replace(/^www\./, '')]
        .filter(Boolean)
    ),
  ];

  try {
    verifyTorobJwt(token, expectedAudiences, torobKey);
    next();
  } catch (err) {
    /* 🔍 لاگ کامل — علت دقیق رد شدن را نشان می‌دهد */
    console.error(
      '[torobAuth] token verification failed:',
      err.code || 'UNKNOWN', '—', err.message,
      '| expected aud:', JSON.stringify(expectedAudiences),
      '| Host header:', JSON.stringify(req.headers.host)
    );
    return res.status(401).json({ error: 'Invalid Torob token' });
  }
};

module.exports = { verifyTorobToken, verifyTorobJwt };