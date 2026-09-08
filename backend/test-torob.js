/**
 * تست لوکال Torob Product API v3 — بدون مشکل escape پاورشل
 * اجرا (از پوشه backend): node test-torob.js
 * پیش‌نیاز: سرور در حال اجرا + TOROB_DEV_BYPASS=true فعال
 */
const BASE = 'http://localhost:3001/torob_api/v3/products';

const test = async (name, body) => {
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    const summary =
      Array.isArray(json.products)
        ? `${json.total} محصول | اولی: ${json.products[0]?.title || '—'}`
        : JSON.stringify(json);
    console.log(`\n[${res.status}] ${name} → ${summary}`);
    if (json.products && json.products[0]) {
      console.log(JSON.stringify(json.products[0], null, 2));
    }
  } catch (err) {
    console.error(`\n❌ ${name}:`, err.message);
  }
};

(async () => {
  await test('۱) لیست صفحه ۱', { page: 1, sort: 'date_added_desc' });
  await test('۲) با URL — slug انگلیسی', { page_urls: ['https://nourmehr.ir/fa/product/khatam-nut-server'] });
  await test('۳) با URL — slug فارسی', { page_urls: ['https://nourmehr.ir/fa/product/آجیل-خوری-1782836570955'] });
  await test('۴) با unique — _id', { page_uniques: ['6a43ee77b65e72639ea613a0'] });
  await test('۵) بدون sort — باید 400', { page: 1 });
  await test('۶) بدنه خالی — باید 400', {});
})();