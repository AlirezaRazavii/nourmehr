<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CampaignCountdown from './CampaignCountdown.vue'

const props = defineProps({
  offers: { type: Object, required: true },
  productId: { type: String, default: '' },
  hasSizes: { type: Boolean, default: true },
})
const emit = defineEmits(['select-size', 'finished'])

const { locale } = useI18n()
const isFa = computed(() => locale.value === 'fa')
const fa = (n) => Number(n || 0).toLocaleString(isFa.value ? 'fa-IR' : 'en-US')
const loc = (v) => (!v ? '' : typeof v === 'string' ? v : (v[locale.value] || v.fa || v.en || ''))

/* بستن نوتیف — تا پایان session برای همین محصول بسته می‌ماند */
const dismissed = ref(false)
const ended = ref(false)
const storageKey = computed(() => `nourmehr_cmp_notice_${props.productId}`)

const readDismissed = () => {
  ended.value = false
  try { dismissed.value = sessionStorage.getItem(storageKey.value) === '1' }
  catch { dismissed.value = false }
}
watch(() => props.productId, readDismissed, { immediate: true })

const close = () => {
  dismissed.value = true
  try { sessionStorage.setItem(storageKey.value, '1') } catch { /* private mode */ }
}

const campaignName = computed(() => loc(props.offers?.campaign?.name))
const color = computed(() => props.offers?.campaign?.themeColor || '#c5a059')

const message = computed(() => {
  const o = props.offers
  if (!o) return ''
  const name = campaignName.value
  const max = Number(o.maxPercent) || 0
  const uniform = (Number(o.minPercent) || max) === max

  if (!props.hasSizes) {
    if (isFa.value) return `این محصول ${fa(max)}٪ تخفیف دارد و جزو کمپین «${name}» است.`
    return `This product is ${max}% off — part of "${name}".`
  }

  if (o.allSizes) {
    if (isFa.value) {
      const pct = uniform ? `${fa(max)}٪` : `تا ${fa(max)}٪`
      return `همهٔ سایزهای این محصول ${pct} تخفیف دارند و جزو کمپین «${name}» هستند.`
    }
    const pct = uniform ? `${max}%` : `up to ${max}%`
    return `All sizes of this product are ${pct} off — part of "${name}".`
  }

  const groups = new Map()
  for (const s of o.sizes || []) {
    const p = Number(s.percent) || 0
    if (!groups.has(p)) groups.set(p, [])
    groups.get(p).push(loc(s.name))
  }
  const entries = [...groups.entries()].sort((a, b) => b[0] - a[0])
  const total = entries.reduce((n, [, names]) => n + names.length, 0)

  if (isFa.value) {
    const parts = entries.map(([p, names]) => {
      const prefix = names.every((n) => n.startsWith('سایز')) ? '' : 'سایز '
      return `${prefix}${names.map((n) => `«${n}»`).join(' و ')} ${fa(p)}٪ تخفیف ${names.length > 1 ? 'دارند' : 'دارد'}`
    })
    return `${parts.join('؛ ')} و جزو کمپین «${name}» ${total > 1 ? 'هستند' : 'است'}.`
  }
  const parts = entries.map(([p, names]) => {
    const prefix = names.every((n) => /^size\b/i.test(n)) ? '' : 'Size '
    return `${prefix}${names.join(' & ')}: ${p}% off`
  })
  return `${parts.join('; ')} — part of "${name}".`
})

const chips = computed(() =>
  (props.offers?.sizes || []).map((s) => ({ label: loc(s.name), percent: s.percent }))
)

const onFinished = () => { ended.value = true; emit('finished') }
</script>

<template>
  <div v-if="!dismissed && !ended" class="cmp-offer" :style="{ '--cmp': color }" role="note">
    <span class="cmp-offer-icon">⚡</span>
    <div class="cmp-offer-body">
      <p class="cmp-offer-text">{{ message }}</p>
      <div v-if="chips.length && !offers.allSizes" class="cmp-offer-chips">
        <button
          v-for="c in chips"
          :key="c.label"
          type="button"
          class="cmp-offer-chip"
          @click="emit('select-size', c.label)"
        >{{ c.label }} · {{ fa(c.percent) }}{{ isFa ? '٪' : '%' }}</button>
      </div>
      <CampaignCountdown
        v-if="offers.campaign?.showCountdown && (offers.campaign?.endsAt || offers.campaign?.startsAt)"
        class="cmp-offer-timer"
        :ends-at="offers.campaign.endsAt"
        :starts-at="offers.campaign.startsAt"
        :server-time="offers.serverTime"
        :label="loc(offers.campaign.countdownLabel)"
        :color="color"
        @finished="onFinished"
      />
    </div>
    <button type="button" class="cmp-offer-close" :aria-label="isFa ? 'بستن' : 'Close'" @click="close">✕</button>
  </div>
</template>

<style scoped>
.cmp-offer {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px; margin-bottom: 18px; border-radius: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--cmp);
  border-inline-start: 4px solid var(--cmp);
  animation: cmpOfferIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
}
@keyframes cmpOfferIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.cmp-offer-icon { flex-shrink: 0; font-size: 1.05rem; margin-top: 1px; }
.cmp-offer-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.cmp-offer-text { margin: 0; font-size: 0.88rem; font-weight: 500; line-height: 1.9; color: rgba(255,255,255,0.88); }
.cmp-offer-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.cmp-offer-chip {
  padding: 6px 13px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--cmp); background: rgba(0,0,0,0.3);
  color: var(--cmp); font-size: 0.78rem; font-weight: 600; font-family: inherit;
  transition: transform 0.15s ease;
}
.cmp-offer-chip:hover { transform: translateY(-1px); }
.cmp-offer-timer { align-self: flex-start; }
.cmp-offer-close {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
  border: none; background: transparent; color: rgba(255,255,255,0.5);
  cursor: pointer; font-size: 0.8rem;
}
.cmp-offer-close:hover { background: rgba(255,255,255,0.08); color: #fff; }
@media (max-width: 768px) {
  .cmp-offer { padding: 12px 14px; }
  .cmp-offer-text { font-size: 0.82rem; }
}
@media (prefers-reduced-motion: reduce) { .cmp-offer { animation: none; } }
</style>