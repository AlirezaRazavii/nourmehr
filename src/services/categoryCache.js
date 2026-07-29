import {
  getPublicCategories,
  clearCategoriesCache as clearApiCache,
} from './categoryApi'

/**
 * لایهٔ نازک روی categoryApi.
 *
 * categoryApi خودش کش (۱۰ دقیقه) و single-flight دارد،
 * پس اینجا فقط pass-through می‌کنیم تا:
 *  ۱) درخواست تکراری به سرور نرود
 *  ۲) پاک‌کردن کش از هر دو نقطه یک اثر داشته باشد
 *  ۳) پارامتر force واقعاً به لایهٔ پایین برسد
 */
export const fetchCategoriesCached = async (force = false) => {
  const data = await getPublicCategories({ force })
  return Array.isArray(data) ? data : []
}

export const clearCategoriesCache = () => clearApiCache()

export default { fetchCategoriesCached, clearCategoriesCache }
