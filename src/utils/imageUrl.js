const PLACEHOLDER = '/products/placeholder.png'

export const getImageUrl = (path) => {
  if (!path) return PLACEHOLDER
  if (path.startsWith('http') || path.startsWith('/')) return path
  return PLACEHOLDER
}

export const getProductImages = (product) => {
  if (!product) return [PLACEHOLDER]
  const ids = []
  if (product.mainImage) ids.push(product.mainImage)
  if (product.images && product.images.length) {
    product.images.forEach(id => { if (id && id !== product.mainImage) ids.push(id) })
  }
  if (!ids.length) return [PLACEHOLDER]
  return ids.map(getImageUrl)
}
