/**
 * تست اتصال به درگاه ترب‌پی
 * اجرا:  node scripts/test-torobpay.js
 */
require('dotenv').config();
const axios = require('axios');

const BASE = (process.env.TOROBPAY_BASE_URL || 'https://cpg.torobpay.com').replace(/\/+$/, '');
const CLIENT_ID = process.env.TOROBPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.TOROBPAY_CLIENT_SECRET;
const USERNAME = process.env.TOROBPAY_USERNAME;
const PASSWORD = process.env.TOROBPAY_PASSWORD;

for (const [k, v] of Object.entries({ CLIENT_ID, CLIENT_SECRET, USERNAME, PASSWORD })) {
  if (!v) { console.error(`🔴 ${k} در .env تعریف نشده`); process.exit(1); }
}

const extractToken = (d) => d?.response?.access_token || d?.access_token || null;

async function requestToken(label, id, secret) {
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  try {
    const res = await axios.post(
      `${BASE}/api/online/v1/oauth/token`,
      { username: USERNAME, password: PASSWORD },
      { headers: { Authorization: `Basic ${basic}` }, validateStatus: () => true, timeout: 20000 }
    );
    console.log(`\n───── ${label} ─────`);
    console.log('HTTP', res.status);
    console.log(JSON.stringify(res.data, null, 2));
    return extractToken(res.data);
  } catch (err) {
    console.error(`\n🔴 ${label} — خطای شبکه:`, err.message);
    return null;
  }
}

async function testEligible(token) {
  const amount = 10000000; // ریال = ۱,۰۰۰,۰۰۰ تومان (بالای حداقلِ ۲۰۰,۰۰۰ ریال)
  try {
    const res = await axios.get(`${BASE}/api/online/offer/v1/eligible`, {
      params: { amount },
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
      timeout: 20000,
    });
    console.log(`\n───── eligible (amount=${amount} ریال) ─────`);
    console.log('HTTP', res.status);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('\n🔴 eligible — خطای شبکه:', err.message);
  }
}

(async () => {
  console.log('Base URL:', BASE);
  // ترکیب ۱: کد پذیرنده + کلید (محتمل‌ترین طبق مستندات)
  let token = await requestToken('ترکیب ۱: Basic(کد پذیرنده : کلید)', CLIENT_ID, CLIENT_SECRET);
  // اگر نشد، ترکیب ۲ را امتحان می‌کنیم
  if (!token) token = await requestToken('ترکیب ۲: Basic(نام کاربری : رمز عبور)', USERNAME, PASSWORD);

  if (token) {
    console.log('\n✅ توکن JWT دریافت شد');
    await testEligible(token);
  } else {
    console.log('\n🔴 دریافت توکن ناموفق بود — خروجی کامل را برایم بفرست.');
  }
})();