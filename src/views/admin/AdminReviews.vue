<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'

const reviews = ref([])
const loading = ref(true)

const fetchReviews = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/reviews')
    if (res.data?.success) reviews.value = res.data.data
  } catch (err) {
    console.error('Error fetching reviews:', err)
  } finally {
    loading.value = false
  }
}

const approveReview = async (id) => {
  try {
    const res = await api.put(`/admin/reviews/${id}/approve`)
    if (res.data?.success) {
      // آپدیت وضعیت در لیست محلی
      const index = reviews.value.findIndex(r => r._id === id)
      if (index !== -1) reviews.value[index].isApproved = true
    }
  } catch (err) {
    alert('خطا در تایید نظر')
  }
}

const deleteReview = async (id) => {
  if (!confirm('آیا از حذف این نظر اطمینان دارید؟')) return
  try {
    const res = await api.delete(`/admin/reviews/${id}`)
    if (res.data?.success) {
      reviews.value = reviews.value.filter(r => r._id !== id)
    }
  } catch (err) {
    alert('خطا در حذف نظر')
  }
}

onMounted(fetchReviews)
</script>

<template>
  <div class="admin-reviews">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت نظرات</h1>
        <p class="page-subtitle">بررسی، تایید و حذف نظرات کاربران</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="reviews-list">
      <div v-if="reviews.length === 0" class="empty-state glass">
        <span>هنوز نظری ثبت نشده است.</span>
      </div>

      <div v-for="review in reviews" :key="review._id" class="review-card glass" :class="{ pending: !review.isApproved }">
        <div class="review-header">
          <div class="reviewer-info">
            <strong>{{ review.name }}</strong>
            <span class="review-date">{{ new Date(review.createdAt).toLocaleDateString('fa-IR') }}</span>
          </div>
          <div class="review-stars">
            <span v-for="n in 5" :key="n" :class="{ filled: n <= review.rating }">★</span>
          </div>
        </div>
        
        <div class="review-product">
          محصول: <strong>{{ review.product?.name?.fa || review.product?.name || 'نامشخص' }}</strong>
        </div>

        <p class="review-text">{{ review.comment }}</p>

        <div class="review-actions">
          <span class="status-badge" :class="review.isApproved ? 'approved' : 'pending'">
            {{ review.isApproved ? 'تایید شده' : 'در انتظار تایید' }}
          </span>
          
          <div class="buttons">
            <button v-if="!review.isApproved" class="action-btn approve" @click="approveReview(review._id)">
              تایید نظر
            </button>
            <button class="action-btn delete" @click="deleteReview(review._id)">
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-reviews { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(255,255,255,0.5); }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 60px; border-radius: 20px; color: rgba(255,255,255,0.4); }

.reviews-list { display: flex; flex-direction: column; gap: 16px; }
.review-card { padding: 24px; border-radius: 16px; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.08); }
.review-card.pending { border-left: 4px solid #f59e0b; }

.review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.reviewer-info { display: flex; flex-direction: column; }
.reviewer-info strong { font-size: 1rem; }
.review-date { font-size: 0.8rem; opacity: 0.5; }
.review-stars { display: flex; gap: 2px; color: #444; font-size: 1.2rem; }
.review-stars .filled { color: #facc6b; }

.review-product { font-size: 0.85rem; opacity: 0.7; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.review-product strong { color: #facc6b; opacity: 1; }

.review-text { font-size: 0.95rem; line-height: 1.8; opacity: 0.9; margin: 0 0 20px 0; }

.review-actions { display: flex; justify-content: space-between; align-items: center; }
.status-badge { padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; }
.status-badge.approved { background: rgba(34,197,94,0.15); color: #4ade80; }
.status-badge.pending { background: rgba(245,158,11,0.15); color: #fbbf24; }

.buttons { display: flex; gap: 8px; }
.action-btn { padding: 8px 16px; border-radius: 8px; border: none; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
.action-btn.approve { background: rgba(34,197,94,0.15); color: #4ade80; }
.action-btn.approve:hover { background: rgba(34,197,94,0.25); }
.action-btn.delete { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-btn.delete:hover { background: rgba(239,68,68,0.25); }
</style>