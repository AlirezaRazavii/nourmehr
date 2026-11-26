/**
 * اطلاعات قیمت کارت محصولات — حالا فقط یک پوستهٔ نازک روی مرجع واحد pricing.js
 * (منطق محاسبه این‌جا نیست؛ در utils/pricing.js است — هم‌قانون با بک‌اند)
 */
import { getPriceInfo } from './pricing'

export const getProductPriceInfo = (product) => getPriceInfo(product)

// درصد تخفیف مؤثر برای بج کارت‌ها (از قیمت واقعی محاسبه می‌شود، نه فیلد خام)
export const getProductDiscountPercent = (product) => {
  const info = getPriceInfo(product)
  if (!info.hasDiscount || !info.oldPrice) return 0
  return Math.round((1 - info.minPrice / info.oldPrice) * 100)
}