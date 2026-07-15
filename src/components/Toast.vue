<template>
  <Transition name="toast-fade">
    <div v-if="show" :class="['toast', type]" @click="close">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  show: Boolean,
  message: String,
  type: { type: String, default: 'success' }
})
const emit = defineEmits(['close'])
const close = () => emit('close')
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 10000;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.toast.success { background: rgba(74,222,128,0.9); color: #000; }
.toast.error { background: rgba(239,68,68,0.9); color: #fff; }
.toast.warning { background: rgba(245,158,11,0.9); color: #000; }

.toast-fade-enter-active,
.toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from,
.toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>