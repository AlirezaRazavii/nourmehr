<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { discountApi } from '../services/discountApi'

const { t, locale } = useI18n()
const loading = ref(true)
const discounts = ref([])
const copiedCode = ref('')

const formatPrice = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US')
}

// تابع کمکی: توضیحات دوزبانه را بر اساس زبان فعال برمی‌گرداند
// هم آبجکت { fa, en } و هم رشته‌ی قدیمی را پشتیبانی می‌کند
const getLocalizedDesc = (desc) => {
  if (!desc) return ''
  if (typeof desc === 'string') return desc
  return desc[locale.value] || desc.fa || desc.en || ''
}

const discountLabel = (d) => {
  if (d.type === 'freeShipping') return t('discounts_type_free_shipping')
  if (d.type === 'percent') return t('discounts_type_percent', { value: d.value })
  return t('discounts_type_fixed', { value: formatPrice(d.value) })
}

// روش fallback برای موبایل و مرورگرهای قدیمی یا کانتکست غیر امن (HTTP)
const fallbackCopy = (text) => {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    // خارج از دید کاربر ولی قابل انتخاب
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.width = '1px'
    textarea.style.height = '1px'
    textarea.style.padding = '0'
    textarea.style.border = 'none'
    textarea.style.outline = 'none'
    textarea.style.boxShadow = 'none'
    textarea.style.background = 'transparent'
    textarea.style.opacity = '0'
    textarea.setAttribute('readonly', '')
    document.body.appendChild(textarea)

    // برای iOS نیاز به انتخاب دستی رنج است
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)

    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch (e) {
    return false
  }
}

const copyCode = async (code) => {
  let success = false

  // اول تلاش با Clipboard API مدرن (فقط در کانتکست امن کار می‌کند)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(code)
      success = true
    } catch (e) {
      success = false
    }
  }

  // اگر روش مدرن در دسترس نبود یا شکست خورد، از روش fallback استفاده کن
  if (!success) {
    success = fallbackCopy(code)
  }

  if (success) {
    copiedCode.value = code
    setTimeout(() => { copiedCode.value = '' }, 2000)
  }
}

const fetchDiscounts = async () => {
  loading.value = true
  try {
    const res = await discountApi.getActiveDiscounts()
    if (res.success) discounts.value = res.data || []
  } catch (e) {
    discounts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchDiscounts)
</script>

<template>
  <section class="discounts-page">
    <div class="container">
      <div class="page-head">
        <h1>{{ $t('discounts_page_title') }}</h1>
        <p>{{ $t('discounts_page_subtitle') }}</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>{{ $t('discounts_loading') }}</span>
      </div>

      <div v-else-if="discounts.length === 0" class="empty-state">
        <span class="empty-icon">🎫</span>
        <p>{{ $t('discounts_empty') }}</p>
      </div>

      <div v-else class="discounts-grid">
        <div v-for="d in discounts" :key="d._id" class="discount-card glass">
          <div class="card-top">
            <span class="discount-badge">{{ discountLabel(d) }}</span>
            <span v-if="d.firstPurchaseOnly" class="first-badge">{{ $t('discounts_first_purchase') }}</span>
          </div>

          <p v-if="getLocalizedDesc(d.description)" class="card-desc">{{ getLocalizedDesc(d.description) }}</p>

          <div class="card-info">
            <div v-if="d.minPurchase" class="info-row">
              <span>{{ $t('discounts_min_purchase') }}</span>
              <span>{{ formatPrice(d.minPurchase) }} {{ $t('discounts_currency') }}</span>
            </div>
            <div v-if="d.maxDiscount" class="info-row">
              <span>{{ $t('discounts_max_discount') }}</span>
              <span>{{ formatPrice(d.maxDiscount) }} {{ $t('discounts_currency') }}</span>
            </div>
            <div class="info-row">
              <span>{{ $t('discounts_valid_until') }}</span>
              <span>{{ formatDate(d.endDate) }}</span>
            </div>
          </div>

          <div class="code-box" @click="copyCode(d.code)">
            <span class="code-text">{{ d.code }}</span>
            <span class="copy-hint">{{ copiedCode === d.code ? $t('discounts_copied') : $t('discounts_copy_hint') }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* استایل دقیقاً همان نسخه‌ی قبلی است — تغییری نکرده */
.discounts-page {
  min-height: 100vh;
  padding: 120px 20px 80px;
  background: radial-gradient(circle at top, rgba(197,160,89,0.12), transparent 50%), #050814;
  color: #fff;
}
.container { max-width: 1100px; margin: 0 auto; }
.page-head { text-align: center; margin-bottom: 40px; }
.page-head h1 { font-size: 1.8rem; margin: 0 0 8px; }
.page-head p { color: rgba(255,255,255,0.5); font-size: 0.95rem; margin: 0; }

.glass {
  background: rgba(15,18,32,0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
}

.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 80px 0; color: rgba(255,255,255,0.5);
}
.empty-icon { font-size: 2.5rem; }
.spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(197,160,89,0.2);
  border-top-color: #c5a059; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.discounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.discount-card {
  padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
  transition: transform 0.25s ease, border-color 0.25s ease;
}
.discount-card:hover { transform: translateY(-4px); border-color: rgba(197,160,89,0.3); }

.card-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.discount-badge { font-size: 1.1rem; font-weight: 700; color: #facc6b; }
.first-badge {
  font-size: 0.72rem; padding: 4px 10px; border-radius: 999px;
  background: rgba(197,160,89,0.15); color: #facc6b;
}
.card-desc { font-size: 0.9rem; color: rgba(255,255,255,0.65); line-height: 1.7; margin: 0; }

.card-info { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; justify-content: space-between; font-size: 0.85rem; color: rgba(255,255,255,0.6); }

.code-box {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px; border-radius: 12px; cursor: pointer;
  background: rgba(197,160,89,0.1); border: 1px dashed rgba(197,160,89,0.4);
  transition: background 0.2s ease;
}
.code-box:hover { background: rgba(197,160,89,0.18); }
.code-text {
  font-size: 1.2rem; font-weight: 700; letter-spacing: 0.15em;
  color: #facc6b; font-family: ui-monospace, monospace;
}
.copy-hint { font-size: 0.75rem; color: rgba(255,255,255,0.5); }

@media (max-width: 768px) {
  .discounts-page { padding: 100px 15px 60px; }
}
</style>
