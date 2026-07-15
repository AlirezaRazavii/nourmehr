<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../../services/adminApi'

const loading = ref(true)
const tickets = ref([])
const selectedTicket = ref(null)
const showDetail = ref(false)
const replyText = ref('')
const statusFilter = ref('all')
const sending = ref(false)

const statusColors = {
  open: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'باز' },
  in_progress: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', text: 'در حال بررسی' },
  resolved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'حل شده' },
  closed: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'بسته شده' },
}

const priorityColors = {
  high: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', text: 'زیاد' },
  medium: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'متوسط' },
  low: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'پایین' },
}

const tabs = [
  { label: 'همه', value: 'all' },
  { label: 'باز', value: 'open' },
  { label: 'در حال بررسی', value: 'in_progress' },
  { label: 'حل شده', value: 'resolved' },
  { label: 'بسته شده', value: 'closed' },
]

const fetchTickets = async () => {
  loading.value = true
  try {
    const res = await adminApi.getTickets()
    if (res.success) tickets.value = res.data
  } catch (err) {
    console.error('خطا در دریافت تیکت‌ها:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchTickets)

const filteredTickets = computed(() => {
  if (statusFilter.value === 'all') return tickets.value
  return tickets.value.filter(t => t.status === statusFilter.value)
})

const openTicket = (ticket) => {
  selectedTicket.value = ticket
  showDetail.value = true
  replyText.value = ''
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '-'

const sendReply = async () => {
  if (!replyText.value.trim() || !selectedTicket.value) return
  sending.value = true
  try {
    const id = selectedTicket.value._id || selectedTicket.value.id
    const res = await adminApi.replyToTicket(id, replyText.value)
    if (!res.success) throw new Error(res.message)
    selectedTicket.value.messages = res.data.messages
    selectedTicket.value.status = res.data.status
    const idx = tickets.value.findIndex(t => (t._id || t.id) === id)
    if (idx !== -1) tickets.value[idx] = { ...tickets.value[idx], status: res.data.status }
    replyText.value = ''
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'ارسال پاسخ ناموفق بود'))
  } finally {
    sending.value = false
  }
}

const changeStatus = async (status) => {
  if (!selectedTicket.value) return
  const id = selectedTicket.value._id || selectedTicket.value.id
  const previous = selectedTicket.value.status
  try {
    const res = await adminApi.updateTicketStatus(id, status)
    if (!res.success) throw new Error(res.message)
    selectedTicket.value.status = status
    const idx = tickets.value.findIndex(t => (t._id || t.id) === id)
    if (idx !== -1) tickets.value[idx] = { ...tickets.value[idx], status }
  } catch (err) {
    selectedTicket.value.status = previous
    alert('خطا: ' + (err.response?.data?.message || err.message || 'تغییر وضعیت ناموفق بود'))
  }
}
</script>

<template>
  <div class="admin-tickets">
    <div class="page-header">
      <div>
        <h1 class="page-title">تیکت‌های پشتیبانی</h1>
        <p class="page-subtitle">مدیریت و پاسخ به تیکت‌های کاربران</p>
      </div>
      <div class="header-stats">
        <span class="stat-pill">{{ tickets.filter(t => t.status === 'open').length }} تیکت باز</span>
      </div>
    </div>

    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: statusFilter === tab.value }" @click="statusFilter = tab.value">
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="tickets-list">
      <div v-for="ticket in filteredTickets" :key="ticket._id" class="ticket-card glass" @click="openTicket(ticket)">
        <div class="ticket-main">
          <div class="ticket-header">
            <span class="ticket-id">#{{ (ticket._id || '').toString().slice(-6) }}</span>
            <span class="status-badge" :style="{ background: statusColors[ticket.status]?.bg, color: statusColors[ticket.status]?.color }">
              {{ statusColors[ticket.status]?.text }}
            </span>
          </div>
          <h3 class="ticket-subject">{{ ticket.subject }}</h3>
          <div class="ticket-meta">
            <span class="ticket-customer">{{ ticket.user?.name || ticket.name || 'نامشخص' }}</span>
            <span class="ticket-date">{{ formatDate(ticket.createdAt) }}</span>
          </div>
        </div>
        <div class="ticket-priority">
          <span class="priority-badge" :style="{ background: priorityColors[ticket.priority]?.bg, color: priorityColors[ticket.priority]?.color }">
            {{ priorityColors[ticket.priority]?.text }}
          </span>
        </div>
        <div class="ticket-arrow">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>

      <div v-if="filteredTickets.length === 0" class="empty-state">
        <span class="empty-icon">💬</span>
        <span>تیکتی یافت نشد</span>
      </div>
    </div>

    <!-- Ticket Detail Modal -->
    <Transition name="modal">
      <div v-if="showDetail && selectedTicket" class="modal-overlay" @click.self="showDetail = false">
        <div class="modal-content glass">
          <div class="modal-header">
            <div>
              <h2>تیکت #{{ (selectedTicket._id || '').toString().slice(-6) }}</h2>
              <p class="modal-subtitle">{{ selectedTicket.subject }}</p>
            </div>
            <button class="modal-close" @click="showDetail = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="ticket-info-bar">
              <div class="info-chip">
                <span class="info-label">مشتری:</span>
                <span>{{ selectedTicket.user?.name || selectedTicket.name || 'نامشخص' }}</span>
              </div>
              <div class="info-chip">
                <span class="info-label">ایمیل:</span>
                <span>{{ selectedTicket.user?.email || selectedTicket.email || '-' }}</span>
              </div>
              <div class="info-chip" v-if="selectedTicket.phone || selectedTicket.user?.phone">
                <span class="info-label">تلفن:</span>
                <span>{{ selectedTicket.user?.phone || selectedTicket.phone }}</span>
              </div>
              <div class="info-chip">
                <span class="info-label">وضعیت:</span>
                <select v-model="selectedTicket.status" class="inline-select" @change="changeStatus(selectedTicket.status)">
                  <option v-for="(style, key) in statusColors" :key="key" :value="key">{{ style.text }}</option>
                </select>
              </div>
            </div>

            <div class="messages-thread">
              <div v-for="(msg, idx) in selectedTicket.messages" :key="idx" class="message" :class="msg.from">
                <div class="message-bubble">
                  <span class="message-text">{{ msg.text }}</span>
                  <span class="message-date">{{ formatDate(msg.date) }}</span>
                </div>
              </div>
            </div>

            <div class="reply-box">
              <textarea v-model="replyText" placeholder="پاسخ خود را بنویسید..." rows="3" class="reply-input" :disabled="sending"></textarea>
              <button class="submit-btn" :disabled="!replyText.trim() || sending" @click="sendReply">{{ sending ? 'در حال ارسال...' : 'ارسال پاسخ' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-tickets {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 0.9rem;
  opacity: 0.5;
  margin: 4px 0 0;
}

.header-stats {
  display: flex;
  gap: 8px;
}

.stat-pill {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(197,160,89,0.1);
  color: #facc6b;
  font-size: 0.85rem;
  font-weight: 500;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover {
  background: rgba(255,255,255,0.06);
}

.tab.active {
  background: rgba(197,160,89,0.15);
  border-color: rgba(197,160,89,0.5);
  color: #facc6b;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: rgba(255,255,255,0.5);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(197,160,89,0.2);
  border-top-color: #c5a059;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-card {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ticket-card:hover {
  border-color: rgba(197,160,89,0.3);
  transform: translateY(-2px);
}

.ticket-main {
  min-width: 0;
}

.ticket-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.ticket-id {
  font-size: 0.8rem;
  opacity: 0.5;
  font-family: ui-monospace, monospace;
}

.status-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.ticket-subject {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 6px;
}

.ticket-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  opacity: 0.6;
}

.ticket-arrow {
  opacity: 0.3;
}

.priority-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: rgba(255,255,255,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 2.5rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 20px;
  padding: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.modal-header h2 {
  font-size: 1.2rem;
  margin: 0;
}

.modal-subtitle {
  font-size: 0.9rem;
  opacity: 0.6;
  margin: 4px 0 0;
}

.modal-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255,255,255,0.1);
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ticket-info-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.info-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  font-size: 0.9rem;
}

.info-label {
  opacity: 0.5;
  font-size: 0.85rem;
}

.inline-select {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
}

.inline-select option {
  background: #0a0d14;
  color: #fff;
}

.messages-thread {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.message {
  display: flex;
}

.message.customer {
  justify-content: flex-start;
}

.message.admin {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.message.customer .message-bubble {
  background: rgba(255,255,255,0.08);
  border-bottom-left-radius: 4px;
}

.message.admin .message-bubble {
  background: linear-gradient(135deg, rgba(197,160,89,0.2), rgba(197,160,89,0.1));
  border: 1px solid rgba(197,160,89,0.3);
  border-bottom-right-radius: 4px;
}

.message-text {
  display: block;
}

.message-date {
  display: block;
  font-size: 0.75rem;
  opacity: 0.5;
  margin-top: 4px;
}

.reply-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-input {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
}

.reply-input:focus {
  border-color: rgba(197,160,89,0.5);
}

.reply-input::placeholder {
  color: rgba(255,255,255,0.3);
}

.submit-btn {
  align-self: flex-end;
  padding: 10px 24px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(197,160,89,0.5);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
