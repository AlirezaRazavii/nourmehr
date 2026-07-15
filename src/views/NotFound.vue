<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goToProducts = () => {
  router.push('/products')
}
</script>

<template>
  <section class="not-found-page">
    <div class="container">
      <div class="content">
        <div class="error-code">404</div>
        <h1>صفحه پیدا نشد! 😕</h1>
        <p>متأسفانه، صفحه‌ای که به دنبال آن هستید وجود ندارد.</p>
        
        <div class="actions">
          <button class="btn primary" @click="goHome">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M3 9l9-7 9 7M11 21V3" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            صفحه اصلی
          </button>
          <button class="btn secondary" @click="goToProducts">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <circle cx="9" cy="21" r="1" fill="currentColor"/>
              <circle cx="20" cy="21" r="1" fill="currentColor"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            محصولات
          </button>
        </div>

        <div class="help-text">
          <p>ممکن است:</p>
          <ul>
            <li>آدرس را اشتباه وارد کرده باشید</li>
            <li>صفحه حذف یا جابجا شده باشد</li>
            <li>لینک منقضی باشد</li>
          </ul>
        </div>
      </div>

      <div class="illustration">
        <div class="floating-items">
          <span class="item item-1">◆</span>
          <span class="item item-2">✧</span>
          <span class="item item-3">❂</span>
          <span class="item item-4">⚅</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, rgba(197, 160, 89, 0.15), transparent 50%),
              #050814;
  color: #fff;
  direction: rtl;
  padding: 40px 20px;
}

.container {
  max-width: 800px;
  text-align: center;
}

.content {
  margin-bottom: 60px;
}

.error-code {
  font-size: 8rem;
  font-weight: 900;
  background: linear-gradient(135deg, rgba(197, 160, 89, 0.3), transparent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
  margin-bottom: 10px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

h1 {
  font-size: 2.5rem;
  margin: 0 0 16px;
}

.content > p {
  font-size: 1.1rem;
  opacity: 0.8;
  margin-bottom: 40px;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn.primary {
  border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  box-shadow: 0 8px 25px rgba(197, 160, 89, 0.35);
}

.btn.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(197, 160, 89, 0.5);
}

.btn.secondary {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: #fff;
}

.btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(197, 160, 89, 0.5);
  color: #facc6b;
}

.help-text {
  margin-top: 40px;
  padding: 24px;
  border-radius: 16px;
  background: rgba(5, 8, 20, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.help-text p {
  font-size: 0.95rem;
  font-weight: 600;
  color: #facc6b;
  margin: 0 0 12px;
}

.help-text ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-text li {
  font-size: 0.9rem;
  opacity: 0.8;
  padding: 6px 0;
}

.illustration {
  position: relative;
  height: 200px;
}

.floating-items {
  position: relative;
  width: 100%;
  height: 100%;
}

.item {
  position: absolute;
  font-size: 3rem;
  opacity: 0.3;
  animation: float 4s ease-in-out infinite;
}

.item-1 {
  top: 0;
  left: 20%;
  animation-delay: 0s;
}

.item-2 {
  top: 50%;
  left: 50%;
  animation-delay: 1s;
}

.item-3 {
  bottom: 0;
  left: 30%;
  animation-delay: 2s;
}

.item-4 {
  top: 30%;
  right: 20%;
  animation-delay: 3s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@media (max-width: 768px) {
  .error-code {
    font-size: 5rem;
  }
  
  h1 {
    font-size: 1.8rem;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>