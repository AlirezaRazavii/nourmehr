<script setup>
import { ref } from 'vue'

const props = defineProps({
  show: Boolean,
  title: { type: String, default: 'تایید' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'بله، مطمئنم' },
  cancelText: { type: String, default: 'انصراف' },
  type: { type: String, default: 'warning' } // warning, danger, info
})

const emit = defineEmits(['confirm', 'cancel'])

const visible = ref(props.show)
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="confirm-overlay" @click.self="emit('cancel')">
      <div class="confirm-dialog glass" :class="type">
        <div class="confirm-icon">
          <!-- Warning Icon -->
          <svg v-if="type === 'warning'" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#f59e0b" stroke-width="1.5">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <!-- Danger Icon -->
          <svg v-else-if="type === 'danger'" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ef4444" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <!-- Info Icon -->
          <svg v-else viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#3b82f6" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
          </svg>
        </div>

        <h3 class="confirm-title">{{ title }}</h3>
        <p class="confirm-message">{{ message }}</p>

        <div class="confirm-actions">
          <button class="confirm-btn cancel" @click="emit('cancel')">
            {{ cancelText }}
          </button>
          <button class="confirm-btn" :class="type" @click="emit('confirm')">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 4000; padding: 20px; backdrop-filter: blur(4px);
}

.confirm-dialog {
  width: 100%; max-width: 420px; border-radius: 20px;
  padding: 32px 28px; text-align: center;
  background: rgba(5,8,20,0.98); border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.confirm-icon { margin-bottom: 16px; }

.confirm-title {
  font-size: 1.3rem; font-weight: 700; margin: 0 0 12px;
  color: #fff;
}

.confirm-message {
  font-size: 0.95rem; color: rgba(255,255,255,0.6);
  line-height: 1.7; margin: 0 0 24px;
}

.confirm-actions {
  display: flex; gap: 12px; justify-content: center;
}

.confirm-btn {
  padding: 12px 28px; border-radius: 12px; border: none;
  font-size: 0.95rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease; font-family: inherit; min-width: 120px;
}

.confirm-btn.cancel {
  background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.1);
}
.confirm-btn.cancel:hover { background: rgba(255,255,255,0.12); }

.confirm-btn.warning {
  background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff;
}
.confirm-btn.warning:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(245,158,11,0.4); }

.confirm-btn.danger {
  background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff;
}
.confirm-btn.danger:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(239,68,68,0.4); }

.confirm-btn.info {
  background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff;
}

.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
</style>