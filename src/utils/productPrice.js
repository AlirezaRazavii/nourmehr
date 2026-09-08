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

  let minPrice = 0;
  let oldPrice = null;
  let hasDiscount = false;

  // ═══ حالت ۱: اگر سایزها وجود دارند ═══
  if (sizes.length > 0) {
    let bestSize = null;
    let bestFinalPrice = Infinity;
    let bestOldPrice = null;

    // پیدا کردن سایزی که کمترین قیمت نهایی را دارد
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

        // ⭐ اگر این سایز قیمت نهایی کمتری دارد
        if (finalPrice < bestFinalPrice) {
          bestFinalPrice = finalPrice;
          // قیمت قدیمی مربوط به همین سایز
          bestOldPrice = effectiveDiscount > 0 ? sizePrice : null;
          bestSize = s;
        }
      }
    });

    minPrice = bestFinalPrice;
    oldPrice = bestOldPrice;
    hasDiscount = oldPrice !== null && oldPrice > minPrice;
  }
  // ═══ حالت ۲: اگر سایز وجود ندارد، از قیمت پایه استفاده کن ═══
  else {
    const basePrice = Number(product.price) || 0;

    if (basePrice > 0) {
      const prodDiscount = Number(product.discountPercent) || 0;

      let finalBasePrice;

      // اگر finalPrice از backend معتبر است
      if (
        product.finalPrice !== undefined &&
        product.finalPrice !== null &&
        Number(product.finalPrice) > 0 &&
        Number(product.finalPrice) <= basePrice
      ) {
        finalBasePrice = Number(product.finalPrice);
      } else {
        // محاسبه با تخفیف
        finalBasePrice =
          prodDiscount > 0 && prodDiscount < 100
            ? Math.round(basePrice * (1 - prodDiscount / 100))
            : basePrice;
      }

      minPrice = finalBasePrice;

      // قیمت قدیمی (هم از همان محصول)
      if (product.oldPrice && Number(product.oldPrice) > finalBasePrice) {
        oldPrice = Number(product.oldPrice);
      } else if (prodDiscount > 0 && basePrice > finalBasePrice) {
        oldPrice = basePrice;
      }

      hasDiscount = oldPrice !== null && oldPrice > minPrice;
    }
  }

  return {
    minPrice,
    oldPrice: hasDiscount ? oldPrice : null,
    hasMultipleSizes,
    hasDiscount,
  };
};