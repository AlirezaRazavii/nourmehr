require('dotenv').config();
const axios = require('axios');

const BASE = (process.env.TOROBPAY_BASE_URL || 'https://cpg.torobpay.com').replace(/\/+$/, '');

async function main() {
  const basic = Buffer.from(process.env.TOROBPAY_CLIENT_ID + ':' + process.env.TOROBPAY_CLIENT_SECRET).toString('base64');
  const { data: tok } = await axios.post(BASE + '/api/online/v1/oauth/token',
    { username: process.env.TOROBPAY_USERNAME, password: process.env.TOROBPAY_PASSWORD },
    { headers: { Authorization: 'Basic ' + basic }, timeout: 20000 });
  const jwt = (tok && (tok.access_token || (tok.response && tok.response.access_token))) || null;
  if (!jwt) { console.error('JWT دریافت نشد:', JSON.stringify(tok)); process.exit(1); }
  console.log('✅ JWT OK');

  const payload = {
    amount: 250000,
    discountAmount: 0,
    externalSourceAmount: 0,
    mobile: '09120000000',
    paymentMethodTypeDto: 'ONLINE_CREDIT',
    returnURL: 'https://nourmehr.ir/api/payments/torobpay/callback',
    transactionId: 'probe-' + Date.now(),
    cartList: [{
      cartId: 'probe-cart-1',
      totalAmount: 250000,
      taxAmount: 0,
      shippingAmount: 0,
      isTaxIncluded: false,
      isShipmentIncluded: false,
      cartItems: [{ id: 'probe-item-1', name: 'کالای تستی', count: 1, amount: 250000, category: 'عمومی', commissionType: 0 }],
    }],
    address: 'تهران، خیابان تست، پلاک ۱',
    postalCode: '1234567890',
    customer_full_name: 'تست ترب‌پی',
    city: 'تهران',
    province: 'تهران',
    registration_phone_number: '09120000000',
  };

  const CANDIDATES = [
    '/api/online/payment/v1/token',
    '/api/online/payment/v1/initiate',
    '/api/online/payment/v1/purchase',
    '/api/online/v1/payment/token',
  ];

  for (const path of CANDIDATES) {
    console.log('\n──── POST ' + path + ' ────');
    try {
      const res = await axios.post(BASE + path, payload, {
        headers: { Authorization: 'Bearer ' + jwt },
        timeout: 25000,
        validateStatus: () => true,
      });
      console.log('HTTP', res.status);
      console.log(JSON.stringify(res.data, null, 2));
      if (res.status === 200 && res.data && res.data.successful) {
        console.log('\n✅✅✅ مسیر درست این است: ' + path);
        return;
      }
      if (res.status !== 404) {
        console.log('\n⚠️ مسیر پیدا شد اما پاسخ موفق نبود — همین خروجی را برایم بفرست.');
        return;
      }
    } catch (e) {
      console.log('خطای شبکه:', e.message);
    }
  }
  console.log('\n🔴 هیچ‌کدام از مسیرها جواب نداد — خروجی کامل را بفرست.');
}

main().catch((e) => { console.error('خطا:', e.message); process.exit(1); });
