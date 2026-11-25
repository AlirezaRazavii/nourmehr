/**
 * تست موتور تخفیف — بخش‌های خالص (بدون نیاز به دیتابیس)
 * اجرا: node scripts/test-discount-engine.js
 *
 * سناریوهای پوشش‌داده‌شده (مطابق تصمیم‌های قفل‌شده):
 *  ۱. کد بدون محدودیت → همه اقلام مجاز، درصد روی قیمت اصلی کل سبد
 *  ۲. کد محدود به دسته → درصد فقط روی اقلام همان دسته (قیمت اصلی)
 *  ۳. کد محدود به چند محصول → فقط همان محصولات
 *  ۴. کد تومانی محدود → از سقف جمع اقلام مجاز بیشتر نمی‌شود
 *  ۵. کد درصدی با maxDiscount → سقف اعمال می‌شود
 *  ۶. لیست سفید درگاه → روش مسدود رد می‌شود، خالی = همه
 *  ۷. minPurchase روی جمع اقلام مجاز سنجیده می‌شود
 *  ۸. کد محدود ولی سبد بدون قلم مجاز → eligibleSubtotal صفر
 */
const {
  calcDiscountAmount,
  computeEligibility,
  isRestricted,
  getAllowedPaymentMethods,
  isPaymentMethodAllowed,
} = require('../utils/discountEngine');

let passed = 0;
let failed = 0;

const assert = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}\n      انتظار: ${JSON.stringify(expected)}\n      واقعی:  ${JSON.stringify(actual)}`);
  }
};

// اقلام نمونه سبد — ۲ قلم دسته «الماس‌تراش» + ۱ قلم دسته «حلقه»
const items = [
  { productId: 'p1', quantity: 1, unitPrice: 4000000, originalUnitPrice: 5000000, categories: ['catDmd'] },
  { productId: 'p2', quantity: 1, unitPrice: 3000000, originalUnitPrice: 3000000, categories: ['catDmd'] },
  { productId: 'p3', quantity: 2, unitPrice: 1000000, originalUnitPrice: 1200000, categories: ['catRing'] },
];

const plain = { type: 'percent', value: 10, products: [], categories: [], allowedPaymentMethods: [] };
const byCategory = { type: 'percent', value: 10, products: [], categories: ['catDmd'], allowedPaymentMethods: [] };
const byProducts = { type: 'percent', value: 20, products: ['p1', 'p3'], categories: [], allowedPaymentMethods: [] };
const fixedCat = { type: 'fixed', value: 5000000, products: [], categories: ['catDmd'], allowedPaymentMethods: [] };
const capped = { type: 'percent', value: 50, maxDiscount: 2000000, products: [], categories: [], allowedPaymentMethods: [] };
const gatewayOnly = { type: 'percent', value: 5, products: [], categories: [], allowedPaymentMethods: ['online', 'cod'] };

console.log('— محدودیت و درگاه —');
assert('بدون محدودیت → isRestricted=false', isRestricted(plain), false);
assert('با دسته → isRestricted=true', isRestricted(byCategory), true);
assert('لیست سفید خالی → همه مجاز (null)', getAllowedPaymentMethods(plain), null);
assert('لیست سفید درگاه', getAllowedPaymentMethods(gatewayOnly), ['online', 'cod']);
assert('درگاه مجاز قبول', isPaymentMethodAllowed(gatewayOnly, 'online'), true);
assert('درگاه مسدود رد', isPaymentMethodAllowed(gatewayOnly, 'snappay'), false);
assert('کد بدون محدودیت → هر درگاهی', isPaymentMethodAllowed(plain, 'digipay'), true);

console.log('— اقلام مجاز —');
let e = computeEligibility(plain, items);
assert('بدون محدودیت → همه ۳ قلم', [e.eligibleCount, e.totalCount], [3, 3]);
assert('بدون محدودیت → جمع کامل', e.eligibleOriginalSubtotal, 5000000 + 3000000 + 2400000);

e = computeEligibility(byCategory, items);
assert('دسته الماس → ۲ قلم', e.eligibleCount, 2);
assert('جمع اصلی اقلام مجاز', e.eligibleOriginalSubtotal, 8000000);
assert('جمع قابل پرداخت اقلام مجاز', e.eligibleSubtotal, 7000000);
assert('قلم غیرمجاز در لیست نمی‌آید', e.eligibleItems.map((i) => i.productId), ['p1', 'p2']);

e = computeEligibility(byProducts, items);
assert('محصولی p1+p3 → ۲ قلم', e.eligibleCount, 2);
assert('جمع اصلی p1+p3 (p3 دوتایی)', e.eligibleOriginalSubtotal, 5000000 + 2400000);

e = computeEligibility(byCategory, [{ productId: 'p9', quantity: 1, unitPrice: 100, originalUnitPrice: 100, categories: ['catX'] }]);
assert('بدون قلم مجاز → صفر', [e.eligibleCount, e.eligibleSubtotal], [0, 0]);

console.log('— محاسبه مبلغ —');
// درصد روی قیمت اصلی اقلام مجاز: ۱۰٪ × ۸,۰۰۰,۰۰۰ = ۸۰۰,۰۰۰
assert('درصد روی قیمت اصلی اقلام مجاز',
  calcDiscountAmount(byCategory, computeEligibility(byCategory, items).eligibleOriginalSubtotal, computeEligibility(byCategory, items).eligibleSubtotal),
  800000);

// تومانی: ۵,۰۰۰,۰۰۰ ولی سقف = جمع قابل پرداخت اقلام مجاز ۷,۰۰۰,۰۰۰ → ۵,۰۰۰,۰۰۰
e = computeEligibility(fixedCat, items);
assert('تومانی زیر سقف اقلام', calcDiscountAmount(fixedCat, e.eligibleOriginalSubtotal, e.eligibleSubtotal), 5000000);

// تومانی بزرگ‌تر از سقف → کوتاه به ۷,۰۰۰,۰۰۰
const fixedHuge = { type: 'fixed', value: 9000000, products: [], categories: ['catDmd'], allowedPaymentMethods: [] };
e = computeEligibility(fixedHuge, items);
assert('تومانی کوتاه به سقف اقلام مجاز', calcDiscountAmount(fixedHuge, e.eligibleOriginalSubtotal, e.eligibleSubtotal), 7000000);

// درصد با maxDiscount: ۵۰٪ × کل (۱۰,۴۰۰,۰۰۰) = ۵,۲۰۰,۰۰۰ → سقف ۲,۰۰۰,۰۰۰
assert('سقف maxDiscount', calcDiscountAmount(capped, 10400000, 10400000), 2000000);

// درصد هرگز از قابل‌پرداخت بیشتر نشود: ۹۰٪ × اصلی ۱۰,۴۰۰,۰۰۰ = ۹,۳۶۰,۰۰۰ → سقف ۱۰,۴۰۰,۰۰۰ قابل پرداخت؟
// (قیمت اصلی ≥ قابل پرداخت؛ کپ نهایی = قابل پرداخت کل)
const percent90 = { type: 'percent', value: 90, products: [], categories: [], allowedPaymentMethods: [] };
assert('درصد سقف‌دار به قابل پرداخت', calcDiscountAmount(percent90, 10400000, 8000000), 8000000);

// minPurchase منطق سنجش (در validate) روی eligibleSubtotal است — اینجا فقط محاسبه جمع مجاز:
e = computeEligibility(byCategory, items);
assert('minPurchase مقابل جمع اقلام مجاز (۷,۰۰۰,۰۰۰ ≥ ۵,۰۰۰,۰۰۰؟)', e.eligibleSubtotal >= 5000000, true);

console.log('-------------------------------------------');
console.log(`نتیجه: ${passed} موفق / ${failed} ناموفق`);
process.exit(failed ? 1 : 0);
