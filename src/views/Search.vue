<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/products'

const productStore = useProductStore()
const route = useRoute()
const router = useRouter()

// Products from store
const products = computed(() => productStore.products)
const categories = computed(() => productStore.categories.map(cat => ({
  value: cat.slug || cat._id,
  label: cat.name
})))

const searchQuery = ref(route.query.search || '')
const selectedCategory = ref('همه')
const sortBy = ref('newest')

// Fetch products on mount
onMounted(async () => {
  // همهٔ محصولات را بگیر تا جستجو روی کل کاتالوگ کار کند (نه فقط ۱۲ تای اول)
  await productStore.fetchProducts({ limit: 100 })
  await productStore.fetchCategories()
})

const filteredProducts = computed(() => {
  let result = products.value || []
  
  // فیلتر جستجو
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      (p.name || '').toLowerCase().includes(query) ||
      (p.category?.name || p.category || '').toLowerCase().includes(query) ||
      (p.shortDesc || '').toLowerCase().includes(query)
    )
  }
  
  // فیلتر دسته‌بندی
  if (selectedCategory.value !== 'همه') {
    result = result.filter(p =>
      p.category?.slug === selectedCategory.value ||
      p.category?.name === selectedCategory.value ||
      p.category === selectedCategory.value
    )
  }
  
  // مرتب‌سازی
  if (sortBy.value === 'price-low') {
    result = [...result].sort((a, b) => (a.price || 0) - (b.price || 0))
  } else if (sortBy.value === 'price-high') {
    result = [...result].sort((a, b) => (b.price || 0) - (a.price || 0))
  } else if (sortBy.value === 'discount') {
    result = [...result].sort((a, b) => (b.discountPercent || b.discount || 0) - (a.discountPercent || a.discount || 0))
  }
  
  return result
})

const goToProduct = (id) => {
  router.push(`/product/${id}`)
}

watch(() => route.query.search, (newSearch) => {
  searchQuery.value = newSearch || ''
})
</script>

<template>
  <div class="search-page">
    <div class="container">
      <!-- هدر جستجو -->
      <div class="search-header">
        <h1>نتایج جستجو</h1>
        <div class="search-bar glass">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="جستجو کنید..." 
            class="search-input"
          />
          <span v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</span>
        </div>
      </div>
      
      <!-- فیلترها -->
      <div class="filters-section">
        <div class="filter-group glass">
          <label>دسته‌بندی:</label>
          <select v-model="selectedCategory">
            <option value="همه">همه محصولات</option>
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>
        
        <div class="filter-group glass">
          <label>مرتب‌سازی:</label>
          <select v-model="sortBy">
            <option value="newest">جدیدترین</option>
            <option value="price-low">ارزان‌ترین</option>
            <option value="price-high">گران‌ترین</option>
            <option value="discount">بیشترین تخفیف</option>
          </select>
        </div>
      </div>
      
      <!-- نتایج -->
      <div class="results-info">
        <span v-if="searchQuery">نتایج برای "{{ searchQuery }}"</span>
        <span class="count">{{ filteredProducts.length }} محصول یافت شد</span>
      </div>
      
      <!-- حالت خالی -->
      <div v-if="filteredProducts.length === 0" class="empty-state glass">
        <span class="empty-icon">🔍</span>
        <h3>محصولی یافت نشد</h3>
        <p>متأسفانه، محصولی با مشخصات جستجو شده پیدا نشد.</p>
        <div class="suggestions">
          <p>پیشنهادات:</p>
          <ul>
            <li>کلمات جستجو را کوتاه‌تر کنید</li>
            <li>دسته‌بندی دیگری را امتحان کنید</li>
            <li><router-link to="/products">مشاهده همه محصولات</router-link></li>
          </ul>
        </div>
      </div>
      
      <!-- گرید محصولات -->
      <TransitionGroup v-else name="products" tag="div" class="products-grid">
        <article
          v-for="product in filteredProducts"
          :key="product._id || product.id"
          class="product-card glass"
          @click="goToProduct(product._id || product.id)"
        >
          <span v-if="product.discountPercent || product.discount" class="discount-badge">
            {{ product.discountPercent || product.discount }}٪
          </span>
          
          <div class="card-image">
            <img :src="product.mainImage || product.image || '/products/placeholder.png'" :alt="product.name" />
          </div>
          
          <div class="card-content">
            <span class="card-category">{{ product.category?.name || product.category }}</span>
            <h3 class="card-title">{{ product.name }}</h3>
            <p class="card-desc">{{ product.shortDesc }}</p>
            
            <div class="card-footer">
              <div class="price-block">
                <span v-if="product.oldPrice" class="old-price">{{ product.oldPriceFormatted || Number(product.oldPrice).toLocaleString('fa-IR') }}</span>
                <span class="current-price">{{ product.priceFormatted || Number(product.price).toLocaleString('fa-IR') }} تومان</span>
              </div>
            </div>
          </div>
        </article>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
  padding: 120px 40px 80px;
  background: #050814;
  color: #fff;
  direction: rtl;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.search-header {
  text-align: center;
  margin-bottom: 40px;
}

.search-header h1 {
  font-size: 2rem;
  margin: 0 0 24px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
  padding: 16px 20px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 1rem;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.clear-btn {
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.25s;
}

.clear-btn:hover {
  opacity: 1;
}

.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 999px;
}

.filter-group label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.filter-group select {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 23, 42, 0.8);
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  outline: none;
}

.results-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.9rem;
}

.count {
  color: #facc6b;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 60px 40px;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 1.4rem;
  margin: 0 0 12px;
}

.empty-state p {
  opacity: 0.7;
  margin: 0 0 24px;
}

.suggestions {
  text-align: right;
  max-width: 400px;
  margin: 0 auto;
}

.suggestions p {
  font-weight: 600;
  margin-bottom: 8px;
}

.suggestions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestions li {
  opacity: 0.8;
  margin-bottom: 6px;
}

.suggestions a {
  color: #facc6b;
  text-decoration: none;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}

.product-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(5, 8, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
}

.product-card:hover {
  transform: translateY(-8px);
  border-color: rgba(197, 160, 89, 0.5);
}

.discount-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 2;
}

.card-image {
  height: 200px;
  background: rgba(15, 23, 42, 0.8);
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 20px;
  transition: transform 0.3s ease;
}

.product-card:hover .card-image img {
  transform: scale(1.05);
}

.card-content {
  padding: 18px;
}

.card-category {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(197, 160, 89, 0.15);
  color: #facc6b;
  font-size: 0.7rem;
  margin-bottom: 8px;
}

.card-title {
  font-size: 1rem;
  margin: 0 0 6px;
  font-weight: 600;
}

.card-desc {
  font-size: 0.85rem;
  opacity: 0.7;
  margin: 0 0 12px;
  line-height: 1.6;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-block {
  display: flex;
  flex-direction: column;
}

.old-price {
  font-size: 0.8rem;
  text-decoration: line-through;
  opacity: 0.5;
}

.current-price {
  font-size: 1rem;
  font-weight: 700;
  color: #facc6b;
}

/* انیمیشن */
.products-enter-active,
.products-leave-active {
  transition: all 0.4s ease;
}

.products-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.products-leave-active {
  position: absolute;
}

.products-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ریسپانسیو */
@media (max-width: 768px) {
  .search-page {
    padding: 100px 20px 60px;
  }
  
  .search-header h1 {
    font-size: 1.6rem;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .filter-group {
    justify-content: space-between;
  }
  
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
