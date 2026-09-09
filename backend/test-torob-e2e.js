/**
 * شبیه‌سازی ۱۰۰٪ کامل ترب — end-to-end
 * دقیقاً همان هدرها، همان JWT، همان الگوریتم — فقط با کلید تستی خودمان
 * اجرا: node test-torob-e2e.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEY_FILE = path.join(__dirname, '.torob-test-key.json');
const BASE = 'http://localhost:3001/api/torob/v3/products';

/* ۱. جفت‌کلید تستی — یک بار ساخته و در فایل ذخیره می‌شود */
let privateKey, publicKey;
if (fs.existsSync(KEY_FILE)) {
  const saved = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  privateKey = crypto.createPrivateKey(saved.privatePem);
  publicKey = crypto.createPublicKey(privateKey); // از روی private هم می‌شود
} else {
  const pair = crypto.generateKeyPairSync('ed25519');
  privateKey = pair.privateKey;
  publicKey = pair.publicKey;
  fs.writeFileSync(KEY_FILE, JSON.stringify({
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  }, null, 2));
}
const pubB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

/* ۲. ساخت JWT — دقیقاً مثل ترب: EdDSA + aud + exp + nbf */
const b64u = (b) => b.toString('base64url');
const now = Math.floor(Date.now() / 1000);
const h = b64u(Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })));
const p = b64u(Buffer.from(JSON.stringify({
  aud: 'nourmehr.ir',
  exp: now + 300,
  nbf: now - 5,
})));
const sig = crypto.sign(null, Buffer.from(`${h}.${p}`), privateKey);
const token = `${h}.${p}.${b64u(sig)}`;

/* ۳. درخواست HTTP — دقیقاً مثل ترب */
(async () => {
  console.log('🎫 توکن JWT (شبیه ترب):', token.slice(0, 60) + '...\n');
  console.log(`📨 POST ${BASE}\n   X-Torob-Token: <jwt>\n   X-Torob-Token-Version: 1\n`);

  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Torob-Token': token,
      'X-Torob-Token-Version': '1',
    },
    body: JSON.stringify({ page: 1, sort: 'date_added_desc' }),
  });

  const json = await res.json();

  if (res.status === 200 && json.api_version === 'torob_api_v3') {
    console.log('✅✅✅ موفق! [200]');
    console.log(`   api_version: ${json.api_version}`);
    console.log(`   total: ${json.total} محصول | max_pages: ${json.max_pages}`);
    if (json.products && json.products[0]) {
      const pr = json.products[0];
      console.log(`   اولین محصول: ${pr.title} — ${pr.current_price.toLocaleString('fa-IR')} تومان (موجود: ${pr.availability})`);
    }
    console.log('\n🎉 این دقیقاً همان چیزی است که ترب خواهد دید.');
  } else {
    console.log(`❌ [${res.status}]`, JSON.stringify(json).slice(0, 200));
    console.log('\n📌 این خط را به .env لوکال اضافه کن، سرور را ری‌استارت کن (rs) و دوباره اجرا کن:');
    console.log(`TOROB_TEST_PUBLIC_KEY=${pubB64}`);
    console.log('و مطمئن شو: TOROB_DEV_BYPASS=false');
  }
})();