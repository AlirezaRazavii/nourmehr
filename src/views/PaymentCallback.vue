<template>
  <section class="callback-page">
    <div class="container">
      <!-- Loading state -->
      <div v-if="isVerifying" class="verifying glass">
        <div class="loader-ring"></div>
        <h2>{{ $t('payment_verifying_title') }}</h2>
        <p>{{ $t('payment_verifying_desc') }}</p>
      </div>

      <!-- Success state -->
      <div v-else-if="paymentSuccess" class="payment-result success glass">
        <div class="success-icon">✅</div>
        <h1>{{ $t('payment_success_title') }}</h1>
        <p class="result-desc">{{ $t('payment_success_desc') }}</p>
        <div v-if="refId" class="detail-box">
          <span>{{ $t('payment_ref_id') }}:</span>
          <strong>{{ refId }}</strong>
        </div>
        <div v-if="orderRef" class="detail-box">
          <span>{{ $t('payment_order_ref') }}:</span>
          <strong>{{ orderRef }}</strong>
        </div>
        <div class="actions">
          <button class="primary-btn" @click="goToHome">{{ $t('payment_back_home') }}</button>
          <button class="secondary-btn" @click="goToOrders">{{ $t('payment_view_orders') }}</button>
        </div>
      </div>

      <!-- Failed state -->
      <div v-else class="payment-result failed glass">
        <div class="failed-icon">❌</div>
        <h1>{{ $t('payment_failed_title') }}</h1>
        <p class="result-desc">{{ errorMessage }}</p>
        <div v-if="orderRef" class="detail-box">
          <span>{{ $t('payment_order_ref') }}:</span>
          <strong>{{ orderRef }}</strong>
        </div>
        <div class="actions">
          <button class="primary-btn" @click="goToHome">{{ $t('payment_back_home') }}</button>
          <button class="secondary-btn" @click="goToOrders">{{ $t('payment_view_orders') }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCart } from '../stores/cart'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const cartStore = useCart()

const isVerifying = ref(true)
const paymentSuccess = ref(false)
const refId = ref('')
const orderRef = ref('')
const errorMessage = ref('')

// نگاشت کدهای خطای بک‌اند به پیام فارسی قابل‌فهم
const errorMap = {
  AuthorityNotFound: 'payment_err_authority_not_found',
  PaymentCanceled: 'payment_err_canceled',
  PaymentNotFound: 'payment_err_not_found',
  OrderNotFound: 'payment_err_order_not_found',
  OrderCancelled: 'payment_err_order_cancelled',
  PaymentProcessing: 'payment_err_processing',
  VerifyFailed: 'payment_err_verify_failed',
  ServerError: 'payment_err_server',
  InvalidCallback: 'payment_err_invalid_callback',
  AmountMismatch: 'payment_err_amount_mismatch',
}

const resolveErrorMessage = (code) => {
  if (!code) return t('payment_err_generic')
  const key = errorMap[code]
  if (key) {
    const translated = t(key)
    // اگر کلید ترجمه وجود نداشت، از پیام عمومی استفاده کن
    return translated === key ? t('payment_err_generic') : translated
  }
  // کد ناشناخته: پیام عمومی (پیام خام انگلیسی را به کاربر نشان نده)
  return t('payment_err_generic')
}

const goToHome = () =>
  router.push({ name: 'Home', params: { lang: locale.value } })

const goToOrders = () => {
  if (orderRef.value) {
    router.push({ name: 'UserOrders', params: { lang: locale.value }, query: { orderRef: orderRef.value } })
  } else {
    router.push({ name: 'UserOrders', params: { lang: locale.value } })
  }
}

// ثبت سفارش موفق در Matomo — فقط یک بار برای هر orderRef
// اسنپ‌شات سبد هنگام ثبت سفارش در Checkout ذخیره شده است.
const trackMatomoOrder = () => {
  try {
    if (!window._paq || !orderRef.value) return

    // لایهٔ ۱ ضدتکرار: در همین تب قبلاً ثبت شده است
    const dedupeKey = 'matomo_order_' + orderRef.value
    if (sessionStorage.getItem(dedupeKey)) return

    // اسنپ‌شات سفارش (اگر قبلاً مصرف شده باشد، یعنی تکرار است — رد شو)
    const raw = localStorage.getItem('matomo_pending_' + orderRef.value)
    if (!raw) return
    const snapshot = JSON.parse(raw)

    window._paq.push(['clearEcommerceCart'])
    ;(snapshot.items || []).forEach((item) => {
      if (!item.productId) return
      const sku = [item.productId, item.color || '', item.size || ''].join('::')
      const name = (typeof item.name === 'string' && item.name)
        ? item.name
        : ((item.name && (item.name.fa || item.name.en)) || sku)
      window._paq.push([
        'addEcommerceItem',
        sku,
        name,
        false,
        Number(item.unitPrice) * 10,
        Number(item.quantity),
      ])
    })

    const t = snapshot.totals || {}
    const grand = Number(t.total) || 0
    const sub = Number(t.subtotal) || 0
    const ship = Number(t.shipping) || 0
    const disc = Number(t.discount) || 0

    window._paq.push([
      'trackEcommerceOrder',
      orderRef.value,
      grand * 10,
      sub * 10,
      0,
      ship * 10,
      disc * 10,
    ])

    // لایهٔ ۲ ضدتکرار: نشانه‌گذاری + پاک‌کردن اسنپ‌شات
    sessionStorage.setItem(dedupeKey, '1')
    localStorage.removeItem('matomo_pending_' + orderRef.value)
  } catch (e) {
    console.warn('[Matomo] order tracking failed:', e)
  }
}

onMounted(() => {
  // بک‌اند پس از تأیید با زرین‌پال به این صفحه ریدایرکت می‌کند:
  //   موفق:   /payment/callback?status=success&refId=...&orderRef=...
  //   ناموفق: /payment/callback?status=failed&message=<code>
  const status = route.query.status || route.query.Status
  const message = route.query.message

  orderRef.value = route.query.orderRef || ''
  refId.value = route.query.refId || ''

  if (status === 'success' || status === 'OK') {
    paymentSuccess.value = true
    // ثبت سفارش در Matomo — حتماً قبل از fetchCart،
    // چون بعد از پرداخت، سبد سرور خالی شده است
    trackMatomoOrder()
    // بک‌اند بعد از پرداخت موفق سبد را پاک کرده — state فرانت را همگام کن
    // تا بج سبد در ناوبار فوراً صفر شود
    cartStore.fetchCart().catch(() => {})
  } else {
    paymentSuccess.value = false
    errorMessage.value = resolveErrorMessage(
      typeof message === 'string' ? message : ''
    )
  }

  isVerifying.value = false
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 20px 80px;
  background: radial-gradient(circle at top, rgba(197, 160, 89, 0.12), transparent 50%),
              #050814;
  color: #fff;
  direction: rtl;
}

.container {
  max-width: 500px;
  width: 100%;
}

.glass {
  background: rgba(5, 8, 20, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
}

.verifying,
.payment-result {
  padding: 60px 40px;
  text-align: center;
}

.loader-ring {
  width: 60px;
  height: 60px;
  border: 3px solid rgba(197, 160, 89, 0.2);
  border-top-color: #c5a059;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.verifying h2 {
  font-size: 1.4rem;
  margin: 0 0 12px;
}

.verifying p {
  opacity: 0.7;
  margin: 0;
}

.success-icon,
.failed-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.payment-result h1 {
  font-size: 1.6rem;
  margin: 0 0 12px;
}

.payment-result.success h1 {
  color: #4ade80;
}

.payment-result.failed h1 {
  color: #ef4444;
}

.result-desc {
  opacity: 0.8;
  margin: 0 0 24px;
  line-height: 1.8;
}

.detail-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  margin-bottom: 12px;
}

.detail-box strong {
  color: #facc6b;
  font-size: 1.1rem;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
  flex-wrap: wrap;
}

.primary-btn,
.secondary-btn {
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(197, 160, 89, 0.4);
}

.secondary-btn {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: #fff;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
