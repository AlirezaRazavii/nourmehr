/**
 * تست تأیید JWT ترب (EdDSA) — اجرا: node test-jwt-eddsa.js
 * جفت‌کلید ed25519 تستی می‌سازد، توکن امضا می‌کند و با منطق
 * واقعی middleware (verifyTorobJwt) تأیید می‌کند + تست‌های منفی.
 */
const crypto = require('crypto');
const { verifyTorobJwt } = require('./middleware/torobAuth');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const b64u = (buf) => buf.toString('base64url');
const makeToken = (payload, alg = 'EdDSA') => {
  const h = b64u(Buffer.from(JSON.stringify({ alg, typ: 'JWT' })));
  const p = b64u(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.sign(null, Buffer.from(`${h}.${p}`), privateKey);
  return `${h}.${p}.${b64u(sig)}`;
};

let pass = 0, fail = 0;
const check = (name, fn, shouldThrow = false) => {
  try {
    fn();
    if (shouldThrow) { console.log(`❌ ${name} — باید رد می‌شد ولی قبول شد!`); fail++; }
    else { console.log(`✅ ${name}`); pass++; }
  } catch (e) {
    if (shouldThrow) { console.log(`✅ ${name} — رد شد (${e.code})`); pass++; }
    else { console.log(`❌ ${name} — ${e.message}`); fail++; }
  }
};

const now = Math.floor(Date.now() / 1000);

/* ۱) توکن سالم */
const good = makeToken({ aud: 'nourmehr.ir', exp: now + 60, nbf: now - 5 });
check('توکن سالم پذیرفته می‌شود', () => {
  const payload = verifyTorobJwt(good, ['nourmehr.ir'], publicKey);
  if (payload.aud !== 'nourmehr.ir') throw new Error('payload اشتباه');
});

/* ۲) audience غلط */
check('audience غلط رد می‌شود', () => {
  verifyTorobJwt(good, ['other.com'], publicKey);
}, true);

/* ۳) توکن منقضی */
const expired = makeToken({ aud: 'nourmehr.ir', exp: now - 100, nbf: now - 200 });
check('توکن منقضی رد می‌شود', () => {
  verifyTorobJwt(expired, ['nourmehr.ir'], publicKey);
}, true);

/* ۴) امضای دستکاری‌شده */
check('امضای دستکاری‌شده رد می‌شود', () => {
  verifyTorobJwt(good.slice(0, -4) + 'AAAA', ['nourmehr.ir'], publicKey);
}, true);

/* ۵) الگوریتم غیر EdDSA */
check('الگوریتم غیر EdDSA رد می‌شود', () => {
  verifyTorobJwt(makeToken({ aud: 'nourmehr.ir', exp: now + 60 }, 'HS256'), ['nourmehr.ir'], publicKey);
}, true);

/* ۶) امضای کلید جعلی */
const fake = crypto.generateKeyPairSync('ed25519');
const forged = (() => {
  const h = b64u(Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })));
  const p = b64u(Buffer.from(JSON.stringify({ aud: 'nourmehr.ir', exp: now + 60 })));
  const sig = crypto.sign(null, Buffer.from(`${h}.${p}`), fake.privateKey);
  return `${h}.${p}.${b64u(sig)}`;
})();
check('امضای کلید جعلی رد می‌شود', () => {
  verifyTorobJwt(forged, ['nourmehr.ir'], publicKey);
}, true);

/* ۷) nbf در آینده */
check('nbf آینده رد می‌شود', () => {
  verifyTorobJwt(makeToken({ aud: 'nourmehr.ir', exp: now + 600, nbf: now + 300 }), ['nourmehr.ir'], publicKey);
}, true);

/* ۸) ساختار خراب */
check('توکن خراب رد می‌شود', () => {
  verifyTorobJwt('not.a.jwt.token', ['nourmehr.ir'], publicKey);
}, true);

console.log(`\n${fail === 0 ? '🎉 همه تست‌ها پاس شد' : '⚠️ ' + fail + ' تست fail شد'} — ${pass} pass / ${fail} fail`);