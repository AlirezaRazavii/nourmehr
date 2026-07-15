<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ticketApi } from '../../services/ticketApi'

const { t, locale } = useI18n()

const loading = ref(true)
const tickets = ref([])
const selectedTicket = ref(null)
const showDetail = ref(false)
const showNewForm = ref(false)
const replyText = ref('')
const sending = ref(false)

const newTicket = ref({ subject: '', message: '', priority: 'medium' })
const creating = ref(false)

// رنگ هر وضعیت (متن از i18n خوانده می‌شود)
const statusStyle = {
  open: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  in_progress: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  resolved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  closed: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
}

const statusText = (status) => {
  const map = {
    open: t('ticket_status_open'),
    in_progress: t('ticket_status_in_progress'),
    resolved: t('ticket_status_resolved'),
    closed: t('ticket_status_closed'),
  }
  return map[status] || status
}

const fetchTickets = async () => {
  loading.value = true
  try {
    const res = await ticketApi.getMyTickets()
    if (res.success) tickets.value = res.data
  } catch (err) {
    console.error('Error fetching tickets:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchTickets)

const formatDate = (d) => d
  ? new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  : '-'

const openTicket = async (ticket) => {
  try {
    const res = await ticketApi.getTicketById(ticket._id)
    if (res.success) {
      selectedTicket.value = res.data
      showDetail.value = true
      replyText.value = ''
    }
  } catch (err) {
    alert(t('ticket_err_load'))
  }
}

const sendReply = async () => {
  if (!replyText.value.trim() || !selectedTicket.value) return
  sending.value = true
  try {
    const res = await ticketApi.replyToTicket(selectedTicket.value._id, replyText.value)
    if (!res.success) throw new Error(res.message)
    selectedTicket.value.messages = res.data.messages
    selectedTicket.value.status = res.data.status
    const idx = tickets.value.findIndex(t => t._id === selectedTicket.value._id)
    if (idx !== -1) tickets.value[idx].status = res.data.status
    replyText.value = ''
  } catch (err) {
    alert(t('ticket_err_generic') + ': ' + (err.response?.data?.message || err.message))
  } finally {
    sending.value = false
  }
}

const closeTicket = async () => {
  if (!selectedTicket.value) return
  if (!confirm(t('ticket_close_confirm'))) return
  try {
    const res = await ticketApi.closeTicket(selectedTicket.value._id)
    if (!res.success) throw new Error(res.message)
    selectedTicket.value.status = 'closed'
    const idx = tickets.value.findIndex(t => t._id === selectedTicket.value._id)
    if (idx !== -1) tickets.value[idx].status = 'closed'
  } catch (err) {
    alert(t('ticket_err_generic') + ': ' + (err.response?.data?.message || err.message))
  }
}

const createTicket = async () => {
  if (!newTicket.value.subject.trim() || !newTicket.value.message.trim()) {
    alert(t('ticket_err_required'))
    return
  }
  creating.value = true
  try {
    const res = await ticketApi.createTicket({ ...newTicket.value })
    if (!res.success) throw new Error(res.message)
    tickets.value.unshift(res.data)
    newTicket.value = { subject: '', message: '', priority: 'medium' }
    showNewForm.value = false
  } catch (err) {
    alert(t('ticket_err_generic') + ': ' + (err.response?.data?.message || err.message))
  } finally {
    creating.value = false
  }
}

const openTicketsCount = computed(() => tickets.value.filter(t => t.status === 'open' || t.status === 'in_progress').length)
</script>

<template>
  <div class="user-tickets">
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ $t('user_support_tickets') }}</h2>
        <p class="page-subtitle">{{ $t('ticket_active_count', { count: openTicketsCount }) }}</p>
      </div>
      <button class="new-btn" @click="showNewForm = true">+ {{ $t('user_new_ticket') }}</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>{{ $t('loading') }}</span>
    </div>

    <div v-else-if="tickets.length === 0" class="empty-state">
      <span class="empty-icon">💬</span>
      <p>{{ $t('user_no_tickets') }}</p>
      <button class="new-btn" @click="showNewForm = true">{{ $t('ticket_first_submit') }}</button>
    </div>

    <div v-else class="tickets-list">
      <div v-for="ticket in tickets" :key="ticket._id" class="ticket-card" @click="openTicket(ticket)">
        <div class="ticket-main">
          <div class="ticket-top">
            <span class="ticket-id">#{{ ticket._id.slice(-6) }}</span>
            <span class="status-badge" :style="{ background: statusStyle[ticket.status]?.bg, color: statusStyle[ticket.status]?.color }">
              {{ statusText(ticket.status) }}
            </span>
          </div>
          <h3 class="ticket-subject">{{ ticket.subject }}</h3>
          <div class="ticket-meta">
            <span>{{ $t('ticket_messages_count', { count: ticket.messages?.length || 0 }) }}</span>
            <span>{{ formatDate(ticket.updatedAt) }}</span>
          </div>
        </div>
        <svg class="ticket-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>

    <!-- مودال جزئیات تیکت -->
    <Transition name="modal">
      <div v-if="showDetail && selectedTicket" class="modal-overlay" @click.self="showDetail = false">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h2>{{ $t('user_support_tickets') }} #{{ selectedTicket._id.slice(-6) }}</h2>
              <p class="modal-subtitle">{{ selectedTicket.subject }}</p>
            </div>
            <button class="modal-close" @click="showDetail = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="status-row">
              <span class="status-badge" :style="{ background: statusStyle[selectedTicket.status]?.bg, color: statusStyle[selectedTicket.status]?.color }">
                {{ statusText(selectedTicket.status) }}
              </span>
              <button v-if="selectedTicket.status !== 'closed'" class="close-ticket-btn" @click="closeTicket">{{ $t('ticket_close') }}</button>
            </div>

            <div class="messages-thread">
              <div v-for="(msg, idx) in selectedTicket.messages" :key="idx" class="message" :class="msg.from">
                <div class="message-bubble">
                  <span class="message-sender">{{ msg.from === 'admin' ? $t('ticket_support') : $t('ticket_you') }}</span>
                  <span class="message-text">{{ msg.text }}</span>
                  <span class="message-date">{{ formatDate(msg.date) }}</span>
                </div>
              </div>
            </div>

            <div v-if="selectedTicket.status !== 'closed'" class="reply-box">
              <textarea v-model="replyText" :placeholder="$t('ticket_reply_placeholder')" rows="3" class="reply-input" :disabled="sending"></textarea>
              <button class="submit-btn" :disabled="!replyText.trim() || sending" @click="sendReply">{{ sending ? $t('loading') : $t('ticket_send_reply') }}</button>
            </div>
            <div v-else class="closed-note">{{ $t('ticket_closed_note') }}</div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- مودال تیکت جدید -->
    <Transition name="modal">
      <div v-if="showNewForm" class="modal-overlay" @click.self="showNewForm = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ $t('ticket_new_title') }}</h2>
            <button class="modal-close" @click="showNewForm = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>{{ $t('ticket_subject') }}</label>
              <input v-model="newTicket.subject" type="text" class="form-input" :placeholder="$t('ticket_subject')" />
            </div>
            <div class="form-group">
              <label>{{ $t('ticket_priority') }}</label>
              <select v-model="newTicket.priority" class="form-input">
                <option value="low">{{ $t('ticket_priority_low') }}</option>
                <option value="medium">{{ $t('ticket_priority_medium') }}</option>
                <option value="high">{{ $t('ticket_priority_high') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ $t('ticket_message') }}</label>
              <textarea v-model="newTicket.message" rows="5" class="form-input" :placeholder="$t('ticket_message_placeholder')"></textarea>
            </div>
            <button class="submit-btn full" :disabled="creating" @click="createTicket">{{ creating ? $t('loading') : $t('ticket_submit') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-tickets { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.page-title { font-size: 1.4rem; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }
.new-btn { padding: 10px 20px; border-radius: 999px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.9rem; }
.new-btn:hover { transform: translateY(-2px); }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(255,255,255,0.5); }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.5); display: flex; flex-direction: column; align-items: center; gap: 14px; }
.empty-icon { font-size: 2.5rem; }

.tickets-list { display: flex; flex-direction: column; gap: 12px; }
.ticket-card { display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.2s ease; }
.ticket-card:hover { border-color: rgba(197,160,89,0.3); transform: translateY(-2px); }
.ticket-main { flex: 1; min-width: 0; }
.ticket-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.ticket-id { font-size: 0.8rem; opacity: 0.5; font-family: ui-monospace, monospace; }
.status-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 500; }
.ticket-subject { font-size: 1rem; font-weight: 600; margin: 0 0 6px; }
.ticket-meta { display: flex; gap: 12px; font-size: 0.85rem; opacity: 0.6; }
.ticket-arrow { opacity: 0.3; flex-shrink: 0; }
[dir="rtl"] .ticket-arrow { transform: scaleX(-1); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal-content { width: 100%; max-width: 600px; max-height: 85vh; overflow-y: auto; border-radius: 20px; background: #0a0d14; border: 1px solid rgba(255,255,255,0.1); }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.modal-subtitle { font-size: 0.9rem; opacity: 0.6; margin: 4px 0 0; }
.modal-close { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-close:hover { background: rgba(255,255,255,0.1); }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

.status-row { display: flex; justify-content: space-between; align-items: center; }
.close-ticket-btn { padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.1); color: #ef4444; font-size: 0.8rem; cursor: pointer; font-family: inherit; }
.close-ticket-btn:hover { background: rgba(239,68,68,0.2); }

.messages-thread { display: flex; flex-direction: column; gap: 12px; max-height: 320px; overflow-y: auto; padding: 4px; }
.message { display: flex; }
.message.admin { justify-content: flex-start; }
.message.customer { justify-content: flex-end; }
.message-bubble { max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 0.9rem; line-height: 1.6; display: flex; flex-direction: column; gap: 4px; }
.message.admin .message-bubble { background: linear-gradient(135deg, rgba(197,160,89,0.2), rgba(197,160,89,0.1)); border: 1px solid rgba(197,160,89,0.3); border-bottom-left-radius: 4px; }
.message.customer .message-bubble { background: rgba(255,255,255,0.08); border-bottom-right-radius: 4px; }
.message-sender { font-size: 0.75rem; font-weight: 600; opacity: 0.7; }
.message-text { display: block; }
.message-date { font-size: 0.72rem; opacity: 0.5; }

.reply-box { display: flex; flex-direction: column; gap: 12px; }
.reply-input, .form-input { width: 100%; padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 0.9rem; font-family: inherit; resize: vertical; outline: none; box-sizing: border-box; }
.reply-input:focus, .form-input:focus { border-color: rgba(197,160,89,0.5); }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.9rem; font-weight: 500; }
.form-input option { background: #0a0d14; }

.submit-btn { align-self: flex-end; padding: 10px 24px; border-radius: 999px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; }
.submit-btn.full { align-self: stretch; }
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.closed-note { text-align: center; padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.03); font-size: 0.85rem; opacity: 0.6; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
