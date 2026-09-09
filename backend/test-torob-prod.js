/**
 * تست امنیت endpoint ترب روی production — اجرا: node test-torob-prod.js
 * ۳ حمله شبیه‌سازی می‌کند؛ هر سه باید 401 بگیرند.
 */
const crypto = require('crypto');
const BASE = 'https://nourmehr.ir/api/torob/v3/products';

const test = async (name, headers, body) => {
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`\n[${res.status}] ${name}\n    → ${text.slice(0, 150)}`);
  } catch (err) {
    console.error(`\n❌ ${name}:`, err.message);
  }
};

(async () => {
  const body = { page: 1, sort: 'date_added_desc' };

  /* ۱) بدون توکن */
  await test('حمله ۱ — بدون توکن (انتظار: 401)', {}, body);

  /* ۲) توکن خراب */
  await test('حمله ۲ — توکن خراب (انتظار: 401)', {
    'X-Torob-Token': 'faketoken123',
    'X-Torob-Token-Version': '1',
  }, body);

  /* ۳) توکن REAL EdDSA اما با کلید جعلی — سخت‌ترین تست:
     ساختار کامل و درست، امضای Ed25519 واقعی، claims معقول —
     فقط کلید خصوصی مال مهاجم است. تنها چیزی که آن را رد می‌کند
     تطابق امضا با کلید عمومی ترب است. */
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  const b64u = (b) => b.toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })));
  const p = b64u(Buffer.from(JSON.stringify({ aud: 'nourmehr.ir', exp: now + 300, nbf: now - 10 })));
  const sig = crypto.sign(null, Buffer.from(`${h}.${p}`), privateKey);
  const forged = `${h}.${p}.${b64u(sig)}`;

  await test('حمله ۳ — توکن کامل با کلید جعلی (انتظار: 401)', {
    'X-Torob-Token': forged,
    'X-Torob-Token-Version': '1',
  }, body);

  console.log('\n' + '—'.repeat(60));
  console.log('اگر هر ۳ تست 401 برگرداندند: endpoint روی production امن است.');
  console.log('فقط ترب با کلید خصوصی واقعی خودش می‌تواند پاس بگیرد.');
})();