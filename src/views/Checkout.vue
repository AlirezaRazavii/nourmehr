<!-- src/views/Checkout.vue -->
<template>
  <section class="checkout-page">
    <div class="container">
      <!-- پیام خطا -->
      <Transition name="fade">
        <div v-if="errorMessage" class="error-message glass">
          <span class="error-icon">⚠️</span>
          <span>{{ errorMessage }}</span>
          <button class="close-btn" @click="errorMessage = ''">✕</button>
        </div>
      </Transition>

      <!-- تایید موفق -->
      <Transition name="success">
        <div v-if="orderComplete" class="order-success glass">
          <div class="success-animation">
            <div class="checkmark">
              <svg viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" stroke-width="2" />
                <path fill="none" stroke="currentColor" stroke-width="3" d="M14 27l7 7 16-16" />
              </svg>
            </div>
          </div>

          <h1>{{ $t('checkout_success_title') }}</h1>
          <p class="order-number">{{ $t('checkout_order_number') }}: <strong>{{ orderNumber }}</strong></p>

          <!-- اطلاعات سفارش از بک‌اند -->
          <div v-if="orderData" class="order-details">
            <div class="order-detail-row">
              <span>{{ $t('checkout_subtotal') }}:</span>
              <span>{{ formatPrice(orderData.subtotal || orderData.totalAmount) }} {{ $t('products_currency') }}</span>
            </div>
            <div class="order-detail-row">
              <span>{{ $t('checkout_shipping_cost') }}:</span>
              <span>{{ orderData.shippingCost === 0 ? $t('checkout_free') : formatPrice(orderData.shippingCost) + ' ' + $t('products_currency') }}</span>
            </div>
            <div v-if="orderData.discountAmount" class="order-detail-row discount">
              <span>{{ $t('checkout_discount') }}:</span>
              <span>- {{ formatPrice(orderData.discountAmount) }} {{ $t('products_currency') }}</span>
            </div>
            <div class="order-detail-row total">
              <span>{{ $t('checkout_payable_amount') }}:</span>
              <span>{{ formatPrice(orderData.total) }} {{ $t('products_currency') }}</span>
            </div>
          </div>

          <p class="order-desc" v-html="$t('checkout_success_desc')"></p>

          <div class="success-actions">
            <button class="primary-btn" @click="goToHome">{{ $t('checkout_back_home') }}</button>
            <button class="secondary-btn" @click="goToProducts">{{ $t('checkout_continue_shopping') }}</button>
          </div>
        </div>
      </Transition>

      <!-- فرآیند چک‌اوت -->
      <div v-if="!orderComplete" class="checkout-content">
        <!-- مراحل -->
        <div class="steps-bar glass">
          <div v-for="step in steps" :key="step.id" class="step"
            :class="{ active: currentStep === step.id, completed: currentStep > step.id }">
            <div class="step-icon">
              <span v-if="currentStep > step.id">✓</span>
              <span v-else>{{ step.icon }}</span>
            </div>
            <span class="step-title">{{ $t(step.titleKey) }}</span>
            <div class="step-line" v-if="step.id < steps.length"></div>
          </div>
        </div>

        <div class="checkout-layout">
          <!-- فرم‌ها -->
          <div class="checkout-forms">
            <!-- مرحله ۱: اطلاعات ارسال -->
            <Transition name="step-fade" mode="out-in">
              <div v-if="currentStep === 1" key="step1" class="form-section glass">
                <h2><span class="section-icon">📍</span> {{ $t('checkout_step1_title') }}</h2>

                <div class="form-grid">
                  <div class="form-group">
                    <label for="fullName">{{ $t('checkout_label_full_name') }} <span class="required">*</span></label>
                    <input id="fullName" v-model="shippingForm.fullName" type="text" :placeholder="$t('checkout_placeholder_full_name')"
                      required />
                  </div>

                  <div class="form-group">
                    <label for="phone">{{ $t('checkout_label_phone') }} <span class="required">*</span></label>
                    <input id="phone" v-model="shippingForm.phone" type="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      :class="{ 'input-error': touchedFields.phone && fieldErrors.phone }" @blur="touchField('phone')"
                      @input="validateField('phone')" required />
                    <span v-if="touchedFields.phone && fieldErrors.phone" class="field-error-msg">
                      ⚠ {{ fieldErrors.phone }}
                    </span>
                  </div>

                  <div class="form-group">
                    <label for="email">{{ $t('checkout_label_email') }}</label>
                    <input id="email" v-model="shippingForm.email" type="email" placeholder="example@email.com" />
                  </div>

                  <div class="form-group">
                    <label for="province">{{ $t('checkout_label_province') }} <span class="required">*</span></label>
                    <input id="province" v-model="shippingForm.province" type="text" :placeholder="$t('checkout_placeholder_province')" required />
                  </div>

                  <div class="form-group">
                    <label for="city">{{ $t('checkout_label_city') }} <span class="required">*</span></label>
                    <input id="city" v-model="shippingForm.city" type="text" :placeholder="$t('checkout_placeholder_city')" required />
                  </div>

                  <div class="form-group">
                    <label for="postalCode">{{ $t('checkout_label_postal_code') }} <span class="required">*</span></label>
                    <input id="postalCode" v-model="shippingForm.postalCode" type="text" placeholder="۱۲۳۴۵۶۷۸۹۰"
                      :class="{ 'input-error': touchedFields.postalCode && fieldErrors.postalCode }"
                      @blur="touchField('postalCode')" @input="validateField('postalCode')" required />
                    <span v-if="touchedFields.postalCode && fieldErrors.postalCode" class="field-error-msg">
                      ⚠ {{ fieldErrors.postalCode }}
                    </span>
                  </div>

                  <div class="form-group full-width">
                    <label for="address">{{ $t('checkout_label_address') }} <span class="required">*</span></label>
                    <textarea id="address" v-model="shippingForm.address" :placeholder="$t('checkout_placeholder_address')"
                      rows="3" required></textarea>
                  </div>

                  <div class="form-group full-width">
                    <label for="note">{{ $t('checkout_label_note') }}</label>
                    <textarea id="note" v-model="shippingForm.note"
                      :placeholder="$t('checkout_placeholder_note')" rows="2"></textarea>
                  </div>
                </div>

                <!-- روش ارسال -->
                <div class="shipping-methods">
                  <h3>{{ $t('checkout_shipping_method') }}</h3>
                  <div class="methods-grid">
                    <label v-for="method in shippingMethods" :key="method.id" class="method-card"
                      :class="{ selected: selectedShipping === method.id, disabled: method.minOrder && totalPrice < method.minOrder }">
                      <input type="radio" :value="method.id" v-model="selectedShipping"
                        :disabled="method.minOrder && totalPrice < method.minOrder" />
                      <span class="method-icon">{{ method.icon }}</span>
                      <div class="method-info">
                        <span class="method-name">{{ $t(method.nameKey) }}</span>
                        <span class="method-desc">{{ $t(method.descKey) }}</span>
                        <span v-if="method.minOrder && totalPrice < method.minOrder" class="method-hint">
                          {{ $t('checkout_min_order') }}: {{ formatPrice(method.minOrder) }} {{ $t('products_currency') }}
                        </span>
                      </div>
                      <span v-if="method.price !== undefined" class="method-price">
                        {{ method.price === 0 ? $t('checkout_free') : formatPrice(method.price) + ' ' + $t('products_currency') }}
                      </span>
                      <span class="check-mark">✓</span>
                    </label>
                  </div>
                </div>

                <div class="form-actions">
                  <button class="next-btn" :disabled="!isStep1Valid" @click="nextStep">
                    <span>{{ $t('checkout_continue_to_payment') }}</span>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- مرحله ۲: پرداخت -->
              <div v-else-if="currentStep === 2" key="step2" class="form-section glass">
                <h2><span class="section-icon">💳</span> {{ $t('checkout_step2_title') }}</h2>

                <div class="payment-methods">
                  <label v-for="method in paymentMethods" :key="method.id" class="payment-card"
                    :class="{ selected: selectedPayment === method.id, disabled: method.disabled }">
                    <input type="radio" :value="method.id" v-model="selectedPayment" :disabled="method.disabled" />
                    <span class="payment-icon">{{ method.icon }}</span>
                    <div class="payment-info">
                      <span class="payment-name">{{ $t(method.nameKey) }}</span>
                      <span class="payment-desc">{{ $t(method.descKey) }}</span>
                    </div>
                    <span class="check-mark">✓</span>
                  </label>
                </div>

                <!-- کد تخفیف -->
                <div class="discount-section">
                  <h3>{{ $t('checkout_discount_code') }}</h3>
                  <div class="discount-form">
                    <div v-if="appliedDiscount" class="applied-discount-badge">
                      <span class="applied-icon">✓</span>
                      <span>{{ $t('checkout_discount_applied', { code: appliedDiscount.code, amount: formatPrice(appliedDiscount.amount) }) }}</span>
                      <button type="button" class="remove-discount-btn" @click="removeDiscount">✕</button>
                    </div>
                    <div v-else class="discount-input-wrapper">
                      <input v-model="discountCode" type="text" :placeholder="$t('checkout_placeholder_discount')" :disabled="isApplyingDiscount" />
                      <button type="button" class="apply-btn" @click="applyDiscount" :disabled="isApplyingDiscount">
                        <span v-if="isApplyingDiscount">...</span>
                        <span v-else>{{ $t('checkout_apply_btn') }}</span>
                      </button>
                    </div>
                    <span v-if="discountError" class="discount-info error">{{ discountError }}</span>
                    <span v-if="discountSuccess && !appliedDiscount" class="discount-info success">{{ discountSuccess }}</span>
                  </div>
                </div>

                <div class="form-actions">
                  <button class="back-btn" @click="prevStep">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" />
                    </svg>
                    <span>{{ $t('checkout_back') }}</span>
                  </button>
                  <button class="next-btn" :disabled="!isStep2Valid" @click="nextStep">
                    <span>{{ $t('checkout_final_review') }}</span>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- مرحله ۳: تایید نهایی -->
              <div v-else-if="currentStep === 3" key="step3" class="form-section glass">
                <h2><span class="section-icon">✓</span> {{ $t('checkout_step3_title') }}</h2>

                <div class="review-block">
                  <div class="review-header">
                    <h4>📍 {{ $t('checkout_review_address') }}</h4>
                    <button @click="currentStep = 1">{{ $t('checkout_edit') }}</button>
                  </div>
                  <div class="review-content">
                    <p><strong>{{ shippingForm.fullName }}</strong></p>
                    <p>{{ shippingForm.province }}، {{ shippingForm.city }}</p>
                    <p>{{ shippingForm.address }}</p>
                    <p>{{ $t('checkout_label_postal_code') }}: {{ shippingForm.postalCode }}</p>
                    <p>{{ $t('checkout_label_phone') }}: {{ shippingForm.phone }}</p>
                  </div>
                </div>

                <div class="review-block">
                  <div class="review-header">
                    <h4>🛒 {{ $t('checkout_review_items', { count: totalItems }) }}</h4>
                  </div>
                  <div class="review-items">
                    <div v-for="item in cartItems" :key="item.productId" class="review-item">
                      <img :src="item.image || '/products/placeholder.png'" :alt="getLocalizedText(item.name)" />
                      <div class="review-item-info">
                        <span class="review-item-name">{{ getLocalizedText(item.name) }}</span>
                        <span class="review-item-qty">{{ $t('cart_quantity') }}: {{ item.quantity }}</span>
                      </div>
                      <span class="review-item-price">{{ formatPrice(item.unitPrice * item.quantity) }} {{ $t('products_currency') }}</span>
                    </div>
                  </div>
                </div>

                <div class="review-block">
                  <div class="review-header">
                    <h4>💳 {{ $t('checkout_review_payment') }}</h4>
                    <button @click="currentStep = 2">{{ $t('checkout_edit') }}</button>
                  </div>
                  <div class="review-content">
                    <p>{{ selectedPaymentName }}</p>
                  </div>
                </div>

                <div class="form-actions">
                  <button class="back-btn" @click="prevStep">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" />
                    </svg>
                    <span>{{ $t('checkout_back') }}</span>
                  </button>
                  <button class="submit-btn" :disabled="isProcessing" @click="submitOrder">
                    <span v-if="isProcessing" class="loading-spinner"></span>
                    <span v-else>{{ $t('checkout_submit_order') }}</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- خلاصه سفارش -->
          <aside class="order-summary glass">
            <h3>{{ $t('checkout_summary_title') }}</h3>

            <div class="summary-items">
              <div v-for="item in cartItems" :key="item.productId" class="summary-item">
                <div class="item-thumb">
                  <img :src="item.image || '/products/placeholder.png'" :alt="getLocalizedText(item.name)" />
                  <span class="item-qty">{{ item.quantity }}</span>
                </div>
                <div class="item-details">
                  <span class="item-name">{{ getLocalizedText(item.name) }}</span>
                  <span class="item-price">{{ formatPrice(item.unitPrice * item.quantity) }} {{ $t('products_currency') }}</span>
                </div>
              </div>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-rows">
              <div class="summary-row">
                <span>{{ $t('checkout_subtotal') }}</span>
                <span>{{ totalPriceFormatted }}</span>
              </div>

              <div class="summary-row">
                <span>{{ $t('checkout_shipping_cost') }}</span>
                <span :class="{ free: shippingCost === 0 }">{{ shippingCostFormatted }}</span>
              </div>



              <div v-if="appliedDiscount" class="summary-row discount">
                <span>{{ $t('checkout_discount') }} ({{ appliedDiscount.code }})</span>
                <span class="discount-value">- {{ formatPrice(appliedDiscount.amount) }} {{ $t('products_currency') }}</span>
              </div>

              <div class="summary-divider"></div>

              <div class="summary-row total">
                <span>{{ $t('checkout_final_amount') }}</span>
                <span>{{ finalAmountFormatted }}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useCart } from '../stores/cart'
import { useOrders } from '../stores/orders'
import { useAuth } from '../stores/auth'
import { useAddresses } from '../stores/addresses'

const { t, locale } = useI18n()

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value[locale.value] || value.fa || ''
  }
  return ''
}

const formatPrice = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const router = useRouter()
const cartStore = useCart()
const { cartItems, totalItems, totalPrice, isEmpty } = storeToRefs(cartStore)
const { clearCart, fetchCart } = cartStore
const ordersStore = useOrders()
const authStore = useAuth()
const { user } = storeToRefs(authStore)
const addressesStore = useAddresses()
const { addresses, defaultAddress } = storeToRefs(addressesStore)

const currentStep = ref(1)
const steps = [
  { id: 1, titleKey: 'checkout_step_1', icon: '📍' },
  { id: 2, titleKey: 'checkout_step_2', icon: '💳' },
  { id: 3, titleKey: 'checkout_step_3', icon: '✓' }
]

const shippingForm = ref({
  fullName: '', phone: '', email: '', province: '', city: '', address: '', postalCode: '', note: ''
})

const shippingMethods = [
  { id: 'express', nameKey: 'checkout_shipping_express_name', descKey: 'checkout_shipping_express_desc', icon: '🚀', price: 150000 },
  { id: 'normal', nameKey: 'checkout_shipping_normal_name', descKey: 'checkout_shipping_normal_desc', icon: '📦', price: 80000 }
]
const selectedShipping = ref('normal')
const createdOrder = ref(null)

const paymentMethods = [
  { id: 'online', nameKey: 'checkout_payment_online_name', descKey: 'checkout_payment_online_desc', icon: '💳' },
  { id: 'cod', nameKey: 'checkout_payment_cod_name', descKey: 'checkout_payment_cod_desc', icon: '🏠' }
]
const selectedPayment = ref('online')

const selectedPaymentName = computed(() => {
  const method = paymentMethods.find(m => m.id === selectedPayment.value)
  return method ? t(method.nameKey) : ''
})

const discountCode = ref('')
const discountError = ref('')
const discountSuccess = ref('')
const appliedDiscount = ref(null)
const isApplyingDiscount = ref(false)

const isProcessing = ref(false)
const orderComplete = ref(false)
const orderNumber = ref('')
const errorMessage = ref('')
const orderData = ref(null)

const shippingCost = computed(() => {
  const method = shippingMethods.find(m => m.id === selectedShipping.value)
  return method ? (method.price || 0) : 0
})

const shippingCostFormatted = computed(() =>
  shippingCost.value === 0 ? t('checkout_free') : formatPrice(shippingCost.value) + ' ' + t('products_currency')
)
const totalPriceFormatted = computed(() => formatPrice(totalPrice.value) + ' ' + t('products_currency'))
const discountAmount = computed(() => appliedDiscount.value?.amount || 0)
const finalAmount = computed(() => totalPrice.value - discountAmount.value + shippingCost.value)
const finalAmountFormatted = computed(() => formatPrice(finalAmount.value) + ' ' + t('products_currency'))

const fieldErrors = ref({ fullName: '', phone: '', province: '', city: '', address: '', postalCode: '' })
const touchedFields = ref({ fullName: false, phone: false, province: false, city: false, address: false, postalCode: false })

const validatePhone = (value) => {
  if (!value || !value.trim()) return t('checkout_err_phone_required')
  const cleaned = value.replace(/[\s\-]/g, '')
  if (!/^09\d{9}$/.test(cleaned)) return t('checkout_err_phone_invalid')
  return ''
}

const validatePostalCode = (value) => {
  if (!value || !value.trim()) return t('checkout_err_postal_required')
  const cleaned = value.replace(/[\s\-]/g, '')
  if (!/^\d{10}$/.test(cleaned)) return t('checkout_err_postal_invalid')
  return ''
}

const validateField = (fieldName) => {
  if (!touchedFields.value[fieldName]) return
  const value = shippingForm.value[fieldName]
  switch (fieldName) {
    case 'fullName': fieldErrors.value.fullName = value.trim() ? '' : t('checkout_err_name_required'); break
    case 'phone': fieldErrors.value.phone = validatePhone(value); break
    case 'province': fieldErrors.value.province = value.trim() ? '' : t('checkout_err_province_required'); break
    case 'city': fieldErrors.value.city = value.trim() ? '' : t('checkout_err_city_required'); break
    case 'address': fieldErrors.value.address = value.trim() ? '' : t('checkout_err_address_required'); break
    case 'postalCode': fieldErrors.value.postalCode = validatePostalCode(value); break
  }
}

const touchField = (fieldName) => {
  touchedFields.value[fieldName] = true
  validateField(fieldName)
}

const isStep1Valid = computed(() =>
  shippingForm.value.fullName.trim() &&
  shippingForm.value.phone.trim() &&
  shippingForm.value.province.trim() &&
  shippingForm.value.city.trim() &&
  shippingForm.value.address.trim() &&
  shippingForm.value.postalCode.trim() &&
  validatePhone(shippingForm.value.phone) === '' &&
  validatePostalCode(shippingForm.value.postalCode) === ''
)

const isStep2Valid = computed(() =>
  selectedPayment.value && !paymentMethods.find(m => m.id === selectedPayment.value)?.disabled
)

const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

const applyDiscount = async () => {
  discountError.value = ''
  discountSuccess.value = ''
  if (!discountCode.value.trim()) {
    discountError.value = t('checkout_err_discount_empty')
    return
  }
  isApplyingDiscount.value = true
  try {
    const { default: api } = await import('../services/api')
    const res = await api.post('/orders/validate-discount', {
      code: discountCode.value.trim(),
      subtotal: totalPrice.value
    })
    appliedDiscount.value = {
      code: discountCode.value.trim().toUpperCase(),
      amount: res.data.discountAmount,
    }
    discountSuccess.value = res.data.message
  } catch (err) {
    appliedDiscount.value = null
    discountError.value = err.response?.data?.message || t('checkout_err_discount_invalid')
  } finally {
    isApplyingDiscount.value = false
  }
}

const removeDiscount = () => {
  appliedDiscount.value = null
  discountCode.value = ''
  discountError.value = ''
  discountSuccess.value = ''
}

const submitOrder = async () => {
  if (isProcessing.value) return
  isProcessing.value = true
  errorMessage.value = ''

  try {
    let order = createdOrder.value

    // اگر سفارشی از تلاش قبلی وجود دارد ولی روش پرداختش با انتخاب فعلی فرق دارد،
    // آن سفارش ناموفق را لغو کن تا سفارش جدید با روش درست ساخته شود
    if (order && order.paymentMethod !== selectedPayment.value) {
      try {
        await ordersStore.cancelOrder(order._id)
      } catch (e) { /* ignore */ }
      createdOrder.value = null
      order = null
    }

    // فقط اگر سفارشی ساخته نشده، سفارش جدید بساز
    if (!order) {
      const orderPayload = {
        shippingInfo: {
          fullName: shippingForm.value.fullName,
          phone: shippingForm.value.phone,
          email: shippingForm.value.email,
          province: shippingForm.value.province,
          city: shippingForm.value.city,
          address: shippingForm.value.address,
          postalCode: shippingForm.value.postalCode,
          note: shippingForm.value.note,
          shippingMethod: selectedShipping.value
        },
        paymentMethod: selectedPayment.value,
        discountCode: appliedDiscount.value?.code || null,
        items: cartItems.value.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      }

      const result = await ordersStore.createOrder(orderPayload)
      if (!result.success) {
        throw new Error(result.error || t('checkout_err_submit'))
      }

      order = result.order
      createdOrder.value = order
      // بک‌اند سبد را هنگام ساخت سفارش پاک می‌کند؛ فرانت را هم همگام کن
      await clearCart()
    }

    orderData.value = order
    orderNumber.value = order.orderRef || order._id || ('NM-' + Date.now())

    // پرداخت آنلاین
    if (selectedPayment.value === 'online') {
      try {
        const { paymentApi } = await import('../services/paymentApi')
        const paymentRes = await paymentApi.initiatePayment(order._id)

        if (paymentRes.success && paymentRes.paymentUrl) {
          window.location.href = paymentRes.paymentUrl
          return
        }
        throw new Error(paymentRes.message || t('checkout_err_payment_gateway'))
      } catch (payErr) {
        console.error('Payment initiation error:', payErr)
        // سفارش در createdOrder می‌ماند؛ کاربر می‌تواند دوباره تلاش کند
        // یا روش پرداخت را عوض کند (سفارش قبلی لغو و جدید ساخته می‌شود)
        errorMessage.value = payErr.message || t('checkout_err_payment_gateway')
        isProcessing.value = false
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    // پرداخت در محل (COD): نهایی است
    orderComplete.value = true
    isProcessing.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    console.error('Order submission error:', err)
    errorMessage.value = err.message || t('checkout_err_submit_retry')
    isProcessing.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}


const goToHome = () => router.push('/')
const goToProducts = () => router.push('/products')

onMounted(async () => {
  // ابتدا سبد را از سرور تازه‌سازی کن و منتظر بمان تا items همگام شود
  // این کار از نمایش اشتباهِ «سبد خرید خالی است» هنگام رفرش یا ورود مستقیم جلوگیری می‌کند
  try {
    await fetchCart()
  } catch (e) { /* ignore */ }

  // حالا که سبد قطعاً همگام شده، بررسی خالی‌بودن انجام بده
  if (isEmpty.value && !orderComplete.value) {
    router.push('/cart')
    return
  }

  try {
    await addressesStore.fetchAddresses()
  } catch (e) { /* ignore */ }
  const addr = defaultAddress.value || (addresses.value && addresses.value[0])
  if (addr) {
    shippingForm.value.fullName = addr.fullName || ''
    shippingForm.value.phone = addr.phone || ''
    shippingForm.value.province = addr.province || ''
    shippingForm.value.city = addr.city || ''
    shippingForm.value.address = addr.address || ''
    shippingForm.value.postalCode = addr.postalCode || ''
  }
  if (!shippingForm.value.fullName) shippingForm.value.fullName = user.value?.name || ''
  if (!shippingForm.value.phone) shippingForm.value.phone = user.value?.phone || ''
  if (!shippingForm.value.email) shippingForm.value.email = user.value?.email || ''
})
</script>



<style scoped>
/* جلوگیری قطعی از اسکرول افقی در موبایل */
.checkout-page { overflow-x: hidden; }
.checkout-page *, .checkout-page *::before, .checkout-page *::after { box-sizing: border-box !important; }

.checkout-page {
  min-height: 100vh;
  padding: 120px 20px 80px; /* کاهش پدینگ چپ و راست برای موبایل */
  background: radial-gradient(circle at top, rgba(197,160,89,0.12), transparent 50%), #050814;
  color: #fff;
}
.container { max-width: 1200px; margin: 0 auto; width: 100%; }

.glass {
  background: rgba(15,18,32,0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
}

/* پیام خطا */
.error-message {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 20px; margin-bottom: 24px; border-radius: 14px;
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; font-size: .92rem;
}
.error-message .close-btn { margin-right: auto; background: none; border: none; color: rgba(255,255,255,.5); cursor: pointer; font-size: 1rem; }
.fade-enter-active,.fade-leave-active { transition: opacity .3s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }

/* تایید موفق */
.order-success { max-width: 640px; margin: 40px auto; padding: 56px 40px; text-align: center; }
.success-animation { margin-bottom: 24px; }
.checkmark {
  width: 90px; height: 90px; margin: 0 auto; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #22c55e; background: rgba(34,197,94,.1);
}
.checkmark svg { width: 50px; height: 50px; }
.checkmark circle { stroke-dasharray: 166; stroke-dashoffset: 166; animation: circle-draw .6s ease forwards; }
.checkmark path { stroke-dasharray: 48; stroke-dashoffset: 48; animation: check-draw .4s .5s ease forwards; }
@keyframes circle-draw { to { stroke-dashoffset: 0; } }
@keyframes check-draw { to { stroke-dashoffset: 0; } }
.order-success h1 { font-size: 1.5rem; margin: 0 0 10px; }
.order-number { color: rgba(255,255,255,.6); margin-bottom: 28px; }
.order-number strong { color: #facc6b; }
.order-details {
  text-align: right; background: rgba(255,255,255,.03); border-radius: 14px;
  padding: 18px 20px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px;
}
.order-detail-row { display: flex; justify-content: space-between; font-size: .92rem; color: rgba(255,255,255,.75); flex-wrap: wrap; gap: 5px; }
.order-detail-row.discount span:last-child { color: #5cbe7d; }
.order-detail-row.total { padding-top: 10px; border-top: 1px solid rgba(255,255,255,.08); font-size: 1.05rem; font-weight: 700; color: #facc6b; }
.order-desc { font-size: .88rem; line-height: 1.9; color: rgba(255,255,255,.55); margin-bottom: 30px; }
.success-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.primary-btn,.secondary-btn { padding: 13px 28px; border-radius: 12px; font-size: .92rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .25s; }
.primary-btn { background: linear-gradient(135deg,#facc6b,#c5a059); color: #1a1206; border: none; }
.primary-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(197,160,89,.35); }
.secondary-btn { background: transparent; border: 1px solid rgba(255,255,255,.15); color: #fff; }
.secondary-btn:hover { background: rgba(255,255,255,.06); }
.success-enter-active { transition: all .4s ease; }
.success-enter-from { opacity: 0; transform: translateY(20px); }

/* نوار مراحل */
.steps-bar {
  display: flex; align-items: center; justify-content: center;
  padding: 24px 10px; margin-bottom: 28px; flex-wrap: wrap; gap: 20px;
}
.step {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  position: relative; min-width: 80px;
}
.step-icon {
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
  font-size: 1.1rem; color: rgba(255,255,255,.5); transition: all .3s; z-index: 2;
}
.step.active .step-icon {
  background: linear-gradient(135deg,#facc6b,#c5a059); border-color: transparent;
  color: #1a1206; box-shadow: 0 0 0 6px rgba(197,160,89,.12);
}
.step.completed .step-icon { background: rgba(34,197,94,.15); border-color: rgba(34,197,94,.4); color: #22c55e; }
.step-title { font-size: .82rem; color: rgba(255,255,255,.5); white-space: nowrap; text-align: center; }
.step.active .step-title { color: #facc6b; font-weight: 600; }
.step.completed .step-title { color: rgba(255,255,255,.8); }
.step-line {
  position: absolute; top: 22px; right: -20px; width: 40px;
  height: 1px; background: rgba(255,255,255,.1); z-index: 1;
}

/* چیدمان */
.checkout-layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }
.checkout-forms { min-width: 0; }
.form-section { padding: 32px; }
.form-section h2 { display: flex; align-items: center; gap: 10px; font-size: 1.15rem; margin: 0 0 24px; }
.section-icon { font-size: 1.2rem; }

/* فرم - قفل شده برای جلوگیری از بیرون زدن */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 28px; }
.form-group { display: flex; flex-direction: column; gap: 8px; min-width: 0; max-width: 100%; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-size: .85rem; color: rgba(255,255,255,.65); }
.required { color: #ef4444; }
.form-group input, .form-group textarea {
  background: rgba(255,255,255,.04); 
  border: 1px solid rgba(255,255,255,.1); 
  border-radius: 10px;
  padding: 12px 14px; 
  color: #fff; 
  font-family: inherit; 
  font-size: .92rem; 
  outline: none;
  transition: border-color .2s,background .2s; 
  resize: vertical; 
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.form-group input::placeholder,.form-group textarea::placeholder { color: rgba(255,255,255,.3); }
.form-group input:focus,.form-group textarea:focus { border-color: rgba(197,160,89,.5); background: rgba(255,255,255,.06); }
.form-group input.input-error { border-color: rgba(239,68,68,.6); }
.field-error-msg { font-size: .78rem; color: #fca5a5; }

/* روش ارسال / پرداخت */
.shipping-methods h3,.discount-section h3 { font-size: .95rem; margin: 0 0 14px; color: rgba(255,255,255,.8); }
.methods-grid,.payment-methods { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
.method-card,.payment-card {
  position: relative; display: flex; align-items: center; gap: 16px;
  padding: 16px 18px; border-radius: 14px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
  cursor: pointer; transition: all .2s;
}
.method-card:hover,.payment-card:hover { border-color: rgba(255,255,255,.18); }
.method-card.selected,.payment-card.selected { border-color: #c5a059; background: rgba(197,160,89,.08); }
.method-card.disabled { opacity: .45; cursor: not-allowed; }
.method-card input,.payment-card input { position: absolute; opacity: 0; width: 0; height: 0; }
.method-icon,.payment-icon {
  width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; border-radius: 10px; background: rgba(255,255,255,.05); flex-shrink: 0;
}
.method-info,.payment-info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.method-name,.payment-name { font-size: .92rem; font-weight: 600; }
.method-desc,.payment-desc { font-size: .8rem; color: rgba(255,255,255,.45); }
.method-hint { font-size: .75rem; color: #facc6b; margin-top: 2px; }
.method-price { font-size: .9rem; font-weight: 600; color: #facc6b; white-space: nowrap; }
.check-mark {
  width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(255,255,255,.2);
  display: flex; align-items: center; justify-content: center;
  font-size: .7rem; color: transparent; flex-shrink: 0; transition: all .2s;
}
.method-card.selected .check-mark,.payment-card.selected .check-mark {
  background: #c5a059; border-color: #c5a059; color: #1a1206;
}

/* تخفیف */
.discount-section { margin-bottom: 28px; }
.discount-input-wrapper { display: flex; gap: 10px; flex-wrap: wrap; }
.discount-input-wrapper input {
  flex: 1; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px; padding: 12px 14px; color: #fff; font-family: inherit; outline: none; min-width: 150px;
}
.discount-input-wrapper input:focus { border-color: rgba(197,160,89,.5); }
.apply-btn {
  padding: 0 22px; border-radius: 10px; border: 1px solid rgba(197,160,89,.4);
  background: rgba(197,160,89,.1); color: #facc6b; font-family: inherit; font-size: .88rem;
  font-weight: 600; cursor: pointer; transition: all .2s; white-space: nowrap;
}
.apply-btn:hover:not(:disabled) { background: rgba(197,160,89,.2); }
.apply-btn:disabled { opacity: .6; cursor: not-allowed; }
.applied-discount-badge {
  display: flex; align-items: center; gap: 10px;
  background: rgba(80,200,120,.12); border: 1px solid rgba(80,200,120,.35);
  border-radius: 10px; padding: 10px 14px; color: #5cbe7d; font-size: .9rem;
}
.applied-discount-badge .applied-icon { font-weight: bold; font-size: 1rem; }
.remove-discount-btn {
  margin-right: auto; background: none; border: none; color: rgba(255,255,255,.4);
  cursor: pointer; font-size: 1rem; padding: 0 4px; line-height: 1; transition: color .2s;
}
.remove-discount-btn:hover { color: #ff6b6b; }
.discount-info { display: block; margin-top: 8px; font-size: .85rem; }
.discount-info.error { color: #ff6b6b; }
.discount-info.success { color: #5cbe7d; }

/* دکمه‌ها */
.form-actions { display: flex; justify-content: space-between; gap: 14px; margin-top: 8px; flex-wrap: wrap; }
.next-btn,.submit-btn {
  display: flex; align-items: center; gap: 8px; padding: 13px 26px; border-radius: 12px;
  background: linear-gradient(135deg,#facc6b,#c5a059); color: #1a1206; border: none;
  font-family: inherit; font-size: .92rem; font-weight: 700; cursor: pointer; transition: all .25s; margin-right: auto;
}
.next-btn:hover:not(:disabled),.submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(197,160,89,.35); }
.next-btn:disabled,.submit-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
.back-btn {
  display: flex; align-items: center; gap: 8px; padding: 13px 22px; border-radius: 12px;
  background: transparent; border: 1px solid rgba(255,255,255,.15);
  color: #fff; font-family: inherit; font-size: .9rem; cursor: pointer; transition: all .2s;
}
.back-btn:hover { background: rgba(255,255,255,.06); }
.loading-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid rgba(26,18,6,.3); border-top-color: #1a1206;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.step-fade-enter-active,.step-fade-leave-active { transition: all .25s ease; }
.step-fade-enter-from { opacity: 0; transform: translateX(-10px); }
.step-fade-leave-to { opacity: 0; transform: translateX(10px); }

/* بررسی نهایی */
.review-block {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 18px 20px; margin-bottom: 16px;
}
.review-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; }
.review-header h4 { font-size: .95rem; margin: 0; color: rgba(255,255,255,.85); }
.review-header button { background: none; border: none; color: #facc6b; font-size: .82rem; cursor: pointer; font-family: inherit; padding: 4px 8px; }
.review-header button:hover { text-decoration: underline; }
.review-content p { margin: 0 0 6px; font-size: .88rem; color: rgba(255,255,255,.65); line-height: 1.7; }
.review-content p:last-child { margin-bottom: 0; }
.review-content p strong { color: #fff; font-size: .95rem; }
.review-items { display: flex; flex-direction: column; gap: 10px; }
.review-item { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.review-item img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; background: rgba(255,255,255,.05); flex-shrink: 0; }
.review-item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 120px; }
.review-item-name { font-size: .86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.review-item-qty { font-size: .76rem; color: rgba(255,255,255,.45); }
.review-item-price { font-size: .85rem; font-weight: 600; color: #facc6b; white-space: nowrap; }

/* خلاصه سفارش */
.order-summary { padding: 24px; position: sticky; top: 110px; }
.order-summary h3 { font-size: 1rem; margin: 0 0 18px; }
.summary-items { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; max-height: 280px; overflow-y: auto; }
.summary-item { display: flex; align-items: center; gap: 12px; }
.item-thumb { position: relative; width: 50px; height: 50px; flex-shrink: 0; }
.item-thumb img { width: 100%; height: 100%; border-radius: 10px; object-fit: cover; background: rgba(255,255,255,.05); }
.item-qty {
  position: absolute; top: -6px; left: -6px; width: 20px; height: 20px;
  border-radius: 50%; background: #c5a059; color: #1a1206;
  font-size: .7rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.item-details { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.item-name { font-size: .84rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-price { font-size: .82rem; color: #facc6b; font-weight: 600; }
.summary-divider { height: 1px; background: rgba(255,255,255,.08); margin: 16px 0; }
.summary-rows { display: flex; flex-direction: column; gap: 12px; }
.summary-row { display: flex; justify-content: space-between; font-size: .88rem; color: rgba(255,255,255,.7); flex-wrap: wrap; gap: 5px; }
.summary-row .free { color: #5cbe7d; font-weight: 600; }
.summary-row.total { font-size: 1.05rem; font-weight: 700; color: #facc6b; }
.summary-row.discount .discount-value { color: #5cbe7d; font-weight: 600; }
.free-shipping-hint-sidebar {
  font-size: .76rem; color: rgba(255,255,255,.5); background: rgba(255,255,255,.03);
  border-radius: 8px; padding: 8px 10px; line-height: 1.6;
}

@media (max-width: 900px) {
  .checkout-layout { grid-template-columns: 1fr; }
  .order-summary { position: static; margin-top: 24px; }
}

@media (max-width: 768px) {
  .checkout-page { padding: 100px 15px 60px; }
  .form-section { padding: 20px 15px; }
  .form-grid { grid-template-columns: 1fr; }
  .order-success { padding: 30px 20px; }
  .step-title { font-size: .75rem; }
  .step-line { display: none; }
  .steps-bar { gap: 15px; padding: 20px 10px; }
  .step { min-width: 60px; }
  .step-icon { width: 36px; height: 36px; font-size: 1rem; }
  .method-card, .payment-card { flex-wrap: wrap; padding: 14px; }
  .method-info, .payment-info { width: 100%; }
  .method-price { width: 100%; text-align: left; margin-top: 5px; }
  .next-btn, .submit-btn { width: 100%; justify-content: center; margin-top: 10px; }
  .back-btn { width: 100%; justify-content: center; }
  .form-actions { flex-direction: column-reverse; }
}
</style>