
const ADMIN_TOKEN = process.argv[2];
const PRODUCT_URL = process.argv[3] || 'https://nourmehr.ir/fa/product/lale';

if (!ADMIN_TOKEN) {
  console.error('❌ توکن ادمین لازم است!');
  console.error('   node test-torob-live.js <auth_token از کوکی سایت>');
  console.error('   (F12 → Application → Cookies → auth_token)');
  process.exit(1);
}

const BASE = 'https://nourmehr.ir/api/torob/v3/preview';

const call = async (body) => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
};

(async () => {
  /* ۱) محصول خاص — JSON کامل، همان چیزی که ترب می‌گیرد */
  console.log(`\n🔍 محصول: ${PRODUCT_URL}`);
  try {
    const { status, json } = await call({ page_urls: [PRODUCT_URL] });
    if (status === 200 && json.products && json.products.length > 0) {
      console.log(`[${status}] ✓ این دقیقاً همان پاسخی است که ترب می‌گیرد:\n`);
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log(`[${status}]`, JSON.stringify(json).slice(0, 300));
    }
  } catch (e) {
    console.error('❌ خطا:', e.message);
  }

  /* ۲) خلاصهٔ قیمت همهٔ محصولات — برای چک سریع مغایرت */
  console.log(`\n📋 خلاصهٔ کل محصولات (صفحه ۱):`);
  try {
    const { status, json } = await call({ page: 1, sort: 'date_added_desc' });
    if (status === 200 && Array.isArray(json.products)) {
      console.log(`   total: ${json.total} | max_pages: ${json.max_pages}\n`);
      for (const p of json.products) {
        console.log(
          `   • ${(p.title || '').slice(0, 35).padEnd(35)} | قیمت: ${p.current_price.toLocaleString('fa-IR').padStart(15)} | قبل تخفیف: ${p.old_price.toLocaleString('fa-IR').padStart(15)} | موجود: ${p.availability ? '✓' : '✗'}`
        );
      }
    } else {
      console.log(`[${status}]`, JSON.stringify(json).slice(0, 300));
    }
  } catch (e) {
    console.error('❌ خطا:', e.message);
  }
})();