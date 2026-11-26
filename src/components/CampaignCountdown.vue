<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  endsAt: { type: [String, Number, Date], default: null },
  startsAt: { type: [String, Number, Date], default: null },
  serverTime: { type: Number, default: 0 },
  label: { type: String, default: '' },
  color: { type: String, default: '#c5a059' },
})
const emit = defineEmits(['finished'])

const { locale } = useI18n()
const isFa = computed(() => locale.value === 'fa')

const now = ref(Date.now())
let timer = null
let offset = 0
let fired = false

const toMs = (v) => {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

const endMs = computed(() => toMs(props.endsAt))
const startMs = computed(() => toMs(props.startsAt))
const clock = computed(() => now.value + offset)
const notStarted = computed(() => startMs.value !== null && clock.value < startMs.value)
const targetMs = computed(() => (notStarted.value ? startMs.value : endMs.value))
const remaining = computed(() =>
  targetMs.value === null ? null : Math.max(0, targetMs.value - clock.value)
)

const parts = computed(() => {
  const ms = remaining.value
  if (ms === null || ms <= 0) return null
  let r = ms
  const d = Math.floor(r / 86400000); r -= d * 86400000
  const h = Math.floor(r / 3600000); r -= h * 3600000
  const m = Math.floor(r / 60000); r -= m * 60000
  const s = Math.floor(r / 1000)
  return { d, h, m, s }
})

const fmt = (n) => Number(n || 0).toLocaleString(isFa.value ? 'fa-IR' : 'en-US')
const pad2 = (n) => {
  const s = String(Math.max(0, Number(n) || 0)).padStart(2, '0')
  return isFa.value ? s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : s
}

const autoLabel = computed(() =>
  notStarted.value
    ? (isFa.value ? 'شروع کمپین تا' : 'Starts in')
    : (isFa.value ? 'پایان کمپین تا' : 'Ends in')
)

// پایان تایمر فقط یک بار اعلام می‌شود
const tick = () => {
  now.value = Date.now()
  if (fired) return
  if (!notStarted.value && endMs.value !== null && remaining.value === 0) {
    fired = true
    emit('finished')
  }
}

onMounted(() => {
  // اختلاف ساعت سرور و مرورگر — تایمر با ساعت سرور هم‌گام می‌ماند
  offset = props.serverTime ? props.serverTime - Date.now() : 0
  tick()
  timer = setInterval(tick, 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

watch(() => [props.endsAt, props.startsAt, props.serverTime], () => {
  offset = props.serverTime ? props.serverTime - Date.now() : 0
  fired = false
  tick()
})
</script>

<template>
  <div v-if="parts" class="cmp-countdown" :style="{ '--cmp': color }">
    <span class="cmp-pulse"></span>
    <span class="cmp-label">{{ label || autoLabel }}</span>
    <div class="cmp-boxes">
      <div class="cmp-box"><b>{{ fmt(parts.d) }}</b><i>{{ isFa ? 'روز' : 'D' }}</i></div>
      <span class="cmp-sep">:</span>
      <div class="cmp-box"><b>{{ pad2(parts.h) }}</b><i>{{ isFa ? 'ساعت' : 'H' }}</i></div>
      <span class="cmp-sep">:</span>
      <div class="cmp-box"><b>{{ pad2(parts.m) }}</b><i>{{ isFa ? 'دقیقه' : 'M' }}</i></div>
      <span class="cmp-sep">:</span>
      <div class="cmp-box"><b>{{ pad2(parts.s) }}</b><i>{{ isFa ? 'ثانیه' : 'S' }}</i></div>
    </div>
  </div>
</template>

<style scoped>
.cmp-countdown {
  display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 9px 16px; border-radius: 999px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.14);
}
.cmp-pulse {
  width: 8px; height: 8px; border-radius: 50%; background: var(--cmp);
  box-shadow: 0 0 10px var(--cmp); animation: cmpPulse 1.6s ease-in-out infinite;
}
@keyframes cmpPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.cmp-label { font-size: .82rem; color: rgba(255,255,255,.75); }
.cmp-boxes { display: flex; align-items: center; gap: 5px; direction: ltr; }
.cmp-box {
  display: flex; flex-direction: column; align-items: center; min-width: 38px;
  padding: 3px 6px; border-radius: 8px; background: rgba(0,0,0,.35);
}
.cmp-box b { font-size: .95rem; font-weight: 700; color: var(--cmp); line-height: 1.2; }
.cmp-box i { font-size: .6rem; font-style: normal; opacity: .55; }
.cmp-sep { color: var(--cmp); opacity: .5; font-weight: 700; }
@media (max-width: 768px) {
  .cmp-countdown { padding: 7px 12px; gap: 8px; }
  .cmp-label { font-size: .74rem; }
  .cmp-box { min-width: 32px; }
  .cmp-box b { font-size: .82rem; }
}
@media (prefers-reduced-motion: reduce) { .cmp-pulse { animation: none; } }
</style>