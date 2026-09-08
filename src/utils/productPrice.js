/**
 * محاسبه اطلاعات قیمت محصول جهت نمایش در کارت محصولات
 */
export const getProductPriceInfo = (product) => {
  if (!product) {
    return { minPrice: 0, oldPrice: null, hasMultipleSizes: false, hasDiscount: false };
  }

  const sizes = Array.isArray(product.sizes)
    ? product.sizes.filter((s) => s && Number(s.price) > 0)
    : [];

  const hasMultipleSizes = sizes.length > 1;

  let finalPrices = [];
  let oldPrices = [];

  // ═══ ۱: اگر سایزها وجود دارند، فقط از آن‌ها استفاده کن ═══
  if (sizes.length > 0) {
    sizes.forEach((s) => {
      const sizePrice = Number(s.price) || 0;
      if (sizePrice > 0) {
        const sizeDiscount = Number(s.discountPercent) || 0;
        const prodDiscount = Number(product.discountPercent) || 0;
        const effectiveDiscount = sizeDiscount > 0 ? sizeDiscount : prodDiscount;

        const finalPrice =
          effectiveDiscount > 0 && effectiveDiscount < 100
            ? Math.round(sizePrice * (1 - effectiveDiscount / 100))
            : sizePrice;

        finalPrices.push(finalPrice);
        if (effectiveDiscount > 0) {
          oldPrices.push(sizePrice);
        }
      }
    });
  }
  // ═══ ۲: فقط اگر سایز وجود ندارد، قیمت پایه را محاسبه کن ═══
  else {
    const basePrice = Number(product.price) || 0;
    
    if (basePrice > 0) {
      const prodDiscount = Number(product.discountPercent) || 0;
      
      // محاسبه قیمت نهایی
      let finalBasePrice;
      
      // اگر finalPrice از backend معتبر است
      if (
        product.finalPrice !== undefined &&
        product.finalPrice !== null &&
        Number(product.finalPrice) > 0 &&
        Number(product.finalPrice) <= basePrice  // ⭐ قیمت نهایی نباید بیشتر از قیمت اصلی باشد
      ) {
        finalBasePrice = Number(product.finalPrice);
      } else {
        // محاسبه با تخفیف
        finalBasePrice =
          prodDiscount > 0 && prodDiscount < 100
            ? Math.round(basePrice * (1 - prodDiscount / 100))
            : basePrice;
      }

      finalPrices.push(finalBasePrice);

      // قیمت قدیمی
      if (product.oldPrice && Number(product.oldPrice) > finalBasePrice) {
        oldPrices.push(Number(product.oldPrice));
      } else if (prodDiscount > 0 && basePrice > finalBasePrice) {
        oldPrices.push(basePrice);
      }
    }
  }

  const minPrice = finalPrices.length > 0 ? Math.min(...finalPrices) : 0;
  const maxOldPrice = oldPrices.length > 0 ? Math.max(...oldPrices) : null;
  const hasDiscount = maxOldPrice !== null && maxOldPrice > minPrice;

  return {
    minPrice,
    oldPrice: hasDiscount ? maxOldPrice : null,
    hasMultipleSizes,
    hasDiscount,
  };
};