<script setup>
import { ref, nextTick } from 'vue'

// --- State ---
const isOpen = ref(false)
const isTyping = ref(false)
const inputValue = ref('')
const chatBodyRef = ref(null)

const messages = ref([
  {
    id: 1,
    text: 'درود بر شما، به دنیای نور و زیبایی نور مهر خوش آمدید ✨\nمن دستیار هوشمند شما هستم؛ برای انتخاب بهترین محصولات روشنایی، هر سوالی داشتید بپرسید.',
    sender: 'bot',
    time: new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
])

// --- Methods ---
const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) scrollToBottom(true)
}

const scrollToBottom = async (instant = false) => {
  await nextTick()
  const body = chatBodyRef.value
  if (!body) return

  body.scrollTo({
    top: body.scrollHeight,
    behavior: instant ? 'auto' : 'smooth'
  })
}

const sendMessage = () => {
  const text = inputValue.value.trim()
  if (!text) return

  messages.value.push({
    id: Date.now(),
    text,
    sender: 'user',
    time: new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  })

  inputValue.value = ''
  scrollToBottom()
  simulateResponse(text)
}

const simulateResponse = (userText) => {
  isTyping.value = true

  const baseDelay = 1400
  const variable = Math.floor(Math.random() * 800)
  const delay = baseDelay + variable

  setTimeout(() => {
    let replyText =
      'پیام شما با دقت دریافت شد 🌙\nکارشناسان ما به‌زودی با شما تماس خواهند گرفت. در صورت تمایل، شماره تماس خود را نیز ارسال کنید.'

    const normalized = userText.replace(/\s+/g, '')

    if (
      normalized.includes('سلام') ||
      normalized.includes('درود') ||
      normalized.includes('خستهنباشید')
    ) {
      replyText =
        'سلام و ارادت 💛\nمن دستیار هوشمند نور مهر هستم؛ در زمینه انتخاب لوستر، آباژور، چراغ دیواری یا هر نوع روشنایی لوکس، همراه شما هستم.'
    } else if (
      normalized.includes('قیمت') ||
      normalized.includes('هزینه') ||
      normalized.includes('تعرفه')
    ) {
      replyText =
        'برای استعلام دقیق قیمت:\n۱️⃣ نوع محصول را بفرمایید (لوستر، آباژور، چراغ دیواری و ...)\n۲️⃣ سبک مورد علاقه‌تان را بگویید (مدرن، کلاسیک، مینیمال و ...)\nهمچنین اگر تمایل دارید شماره تماس خود را ارسال کنید تا واحد فروش با شما ارتباط بگیرد.'
    } else if (
      normalized.includes('ارسال') ||
      normalized.includes('پست') ||
      normalized.includes('تحویل') ||
      normalized.includes('ارسالمی‌کنید')
    ) {
      replyText =
        'ارسال سفارشات به‌صورت سراسری انجام می‌شود 🚚\nبسته‌بندی ضدضربه، بیمه حمل و پیگیری کامل از لحظه ثبت تا تحویل درب منزل برای شما در نظر گرفته شده است.\nشهر خود را بفرمایید تا شرایط دقیق‌تر را اعلام کنم.'
    } else if (
      normalized.includes('مشاوره') ||
      normalized.includes('طراحی') ||
      normalized.includes('دکور') ||
      normalized.includes('دکوراسیون')
    ) {
      replyText =
        'برای مشاوره و طراحی نورپردازی اختصاصی:\n• متراژ و کاربری فضا (نشیمن، پذیرایی، اتاق خواب و ...)\n• سبک دکوراسیون فعلی\nرا بفرمایید؛ تا بهترین ترکیب نوری و محصولات متناسب با فضای شما پیشنهاد شود ✨'
    }

    messages.value.push({
      id: Date.now() + 1,
      text: replyText,
      sender: 'bot',
      time: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    })

    isTyping.value = false
    scrollToBottom()
  }, delay)
}
</script>

<template>
  <div class="nm-chat-widget">
    <!-- پنجره چت لوکس -->
    <Transition name="nm-chat">
      <div v-if="isOpen" class="nm-chat-container">
        <!-- هدر -->
        <header class="nm-chat-header">
          <div class="nm-brand">
            <div class="nm-avatar-ring">
              <div class="nm-avatar">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                >
                  <path
                    d="M12 2a2 2 0 0 1 1.85 1.26c.24.6.72 1.08 1.32 1.32A2 2 0 0 1 17.5 4c1.1 0 2 .9 2 2 0 .74.4 1.39 1 1.73.6.34 1 0.99 1 1.73s-.4 1.39-1 1.73c-.6.34-1 .99-1 1.73 0 1.1-.9 2-2 2-.74 0-1.39.4-1.73 1-.34.6-.99 1-1.73 1s-1.39-.4-1.73-1c-.34-.6-.99-1-1.73-1s-1.39.4-1.73 1c-.34.6-.99 1-1.73 1-1.1 0-2-.9-2-2 0-.74-.4-1.39-1-1.73A2 2 0 0 1 2 10.78C2 9.8 2.53 9 3.3 8.6A2 2 0 0 0 4.5 7 2 2 0 0 1 7 5c.74 0 1.39-.4 1.73-1 .34-.6.99-1 1.73-1z"
                  />
                </svg>
              </div>
            </div>
            <div class="nm-brand-text">
              <h3>دستیار هوشمند نور مهر</h3>
              <div class="nm-status">
                <span class="nm-status-dot"></span>
                <span>آنلاین و آماده پاسخ‌گویی</span>
              </div>
            </div>
          </div>


        </header>

        <!-- بدنه پیام‌ها -->
        <main class="nm-chat-body" ref="chatBodyRef">
          <div class="nm-chat-intro">
            <span>امروز</span>
          </div>

          <TransitionGroup name="nm-msg" tag="div" class="nm-messages">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="nm-message-wrapper"
              :class="msg.sender"
            >
              <div class="nm-message-bubble">
                {{ msg.text }}
              </div>
              <span class="nm-message-time">{{ msg.time }}</span>
            </div>
          </TransitionGroup>

          <!-- نشانگر تایپ -->
          <div v-if="isTyping" class="nm-message-wrapper bot nm-typing-row">
            <div class="nm-message-bubble nm-typing-bubble">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </main>

        <!-- فوتر / ورودی -->
        <footer class="nm-chat-footer">
          <div class="nm-input-shell">
            <input
              v-model="inputValue"
              @keyup.enter="sendMessage"
              type="text"
              placeholder="پیام خود را بنویسید..."
            />
            <button
              class="nm-send-btn"
              @click="sendMessage"
              :disabled="!inputValue.trim()"
              aria-label="ارسال پیام"
            >
              <span class="nm-send-bg"></span>
              <span class="nm-send-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </span>
            </button>
          </div>
          <div class="nm-footer-hint">
            پاسخ هوشمند، همراه با امکان اتصال به مشاوران واقعی نور مهر
          </div>
        </footer>
      </div>
    </Transition>

    <!-- دکمه شناور -->
    <button
      class="nm-launcher"
      :class="{ 'is-open': isOpen }"
      @click="toggleChat"
      aria-label="باز کردن چت"
    >
      <div class="nm-launcher-glow"></div>

      <div class="nm-launcher-inner">
        <Transition name="nm-icon" mode="out-in">
          <svg
            v-if="!isOpen"
            key="chat"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-4 3v-3.5A7.5 7.5 0 0 1 11.5 4H14a7 7 0 0 1 7 7z"
            />
          </svg>
          <svg
            v-else
            key="close"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Transition>
      </div>

      <span v-if="!isOpen" class="nm-launcher-pulse"></span>
    </button>
  </div>
</template>

<style scoped>
/* --- متغیرهای تم لوکس نور مهر --- */
.nm-chat-widget {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 9999;
  direction: rtl;
  font-family: inherit;

  --nm-gold: #f0c777;
  --nm-gold-soft: #d7af63;
  --nm-gold-deep: #b4862e;
  --nm-gold-dark: #8b6323;

  --nm-bg-main: #06070a;
  --nm-bg-elevated: rgba(8, 9, 14, 0.94);
  --nm-bg-glass: rgba(14, 15, 22, 0.92);
  --nm-bg-soft: rgba(255, 255, 255, 0.03);

  --nm-border-soft: rgba(255, 255, 255, 0.08);
  --nm-border-strong: rgba(255, 255, 255, 0.16);

  --nm-text-main: #f7f7f7;
  --nm-text-muted: #a7a7b3;
  --nm-accent-green: #4ade80;
}

/* --- دکمه شناور (Launcher) --- */
.nm-launcher {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  padding: 0;
  position: relative;
  border: none;
  cursor: pointer;
  background: radial-gradient(circle at 30% 0%, #ffffff, #f0c777 28%, #6b4a17 80%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 18px 40px rgba(0, 0, 0, 0.9),
    0 0 40px rgba(240, 199, 119, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.45s cubic-bezier(0.19, 1, 0.22, 1),
    box-shadow 0.45s cubic-bezier(0.19, 1, 0.22, 1),
    background 0.35s ease-out;
  overflow: visible;
}

.nm-launcher:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 22px 60px rgba(0, 0, 0, 1),
    0 0 55px rgba(240, 199, 119, 0.6);
}

.nm-launcher.is-open {
  background: radial-gradient(circle at 20% 0%, #ffffff, #1c1c23 30%, #050506 80%);
  box-shadow:
    0 0 0 1px rgba(240, 199, 119, 0.4),
    0 16px 40px rgba(0, 0, 0, 0.9),
    0 0 35px rgba(240, 199, 119, 0.15);
  transform: translateY(0) scale(0.98);
}

/* هاله نور زیر دکمه */
.nm-launcher-glow {
  position: absolute;
  inset: 10px;
  border-radius: inherit;
  background: radial-gradient(circle at 50% 120%, rgba(240, 199, 119, 0.45), transparent 70%);
  filter: blur(7px);
  opacity: 0.8;
  pointer-events: none;
}

/* محفظه داخلی آیکن */
.nm-launcher-inner {
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 0%, rgba(255, 255, 255, 0.85), rgba(240, 199, 119, 0.5));
  box-shadow:
    inset 0 0 0 0.7px rgba(255, 255, 255, 0.5),
    inset 0 0 18px rgba(255, 255, 255, 0.3);
  color: #40280c;
}

/* پالس نرم دکمه */
.nm-launcher-pulse {
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 1px solid rgba(240, 199, 119, 0.7);
  animation: nm-pulse 1.8s ease-out infinite;
  pointer-events: none;
}

@keyframes nm-pulse {
  0% {
    transform: scale(1);
    opacity: 0.55;
  }
  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}

/* ترنزیشن آیکن دکمه */
.nm-icon-enter-active,
.nm-icon-leave-active {
  transition: all 0.25s ease-out;
}
.nm-icon-enter-from,
.nm-icon-leave-to {
  opacity: 0;
  transform: scale(0.5) rotate(-15deg);
}

/* --- کانتینر اصلی چت --- */
.nm-chat-container {
  position: absolute;
  bottom: 92px;
  right: -4px;
  width: 380px;
  max-height: 540px;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  background:
    radial-gradient(circle at 0 0, rgba(240, 199, 119, 0.18), transparent 55%),
    radial-gradient(circle at 100% 0, rgba(114, 91, 248, 0.12), transparent 55%),
    var(--nm-bg-glass);
  border: 1px solid rgba(240, 199, 119, 0.16);
  box-shadow:
    0 26px 60px rgba(0, 0, 0, 0.9),
    0 0 50px rgba(240, 199, 119, 0.15);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  overflow: hidden;
}

/* انیمیشن باز و بسته شدن چت */
.nm-chat-enter-active,
.nm-chat-leave-active {
  transition: all 0.38s cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: 90% 100%;
}

.nm-chat-enter-from,
.nm-chat-leave-to {
  opacity: 0;
  transform: scale(0.86) translate3d(0, 18px, 0);
  filter: blur(12px);
}

/* --- هدر چت --- */
.nm-chat-header {
  padding: 16px 20px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(
    135deg,
    rgba(240, 199, 119, 0.18),
    rgba(8, 9, 14, 0.4),
    rgba(8, 9, 14, 0.9)
  );
  border-bottom: 1px solid rgba(240, 199, 119, 0.22);
}

.nm-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nm-avatar-ring {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  padding: 2px;
  background: conic-gradient(
    from 160deg,
    rgba(240, 199, 119, 0.8),
    rgba(114, 91, 248, 0.8),
    rgba(240, 199, 119, 0.8)
  );
  animation: nm-ring 5s linear infinite;
}

@keyframes nm-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.nm-avatar {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: radial-gradient(circle at 30% 0, #ffffff, #f6e6c1 35%, #f0c777 60%, #6c4b1a 92%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3a260a;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.7),
    inset 0 0 12px rgba(255, 255, 255, 0.6),
    0 10px 20px rgba(0, 0, 0, 0.35);
}

.nm-brand-text h3 {
  margin: 0;
  font-size: 0.98rem;
  color: var(--nm-text-main);
  letter-spacing: 0.2px;
  font-weight: 700;
}

.nm-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--nm-text-muted);
}

.nm-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--nm-accent-green);
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.8);
}

/* دکمه بستن */
.nm-close-btn {
  border: none;
  background: rgba(8, 9, 14, 0.6);
  color: var(--nm-text-muted);
  border-radius: 999px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s ease-out,
    color 0.2s ease-out,
    transform 0.2s ease-out;
}

.nm-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--nm-text-main);
  transform: rotate(-90deg) scale(1.03);
}

/* --- بدنه چت --- */
.nm-chat-body {
  flex: 1;
  padding: 18px 18px 14px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  gap: 10px;
  background: radial-gradient(circle at 30% -10%, rgba(240, 199, 119, 0.1), transparent 65%),
    radial-gradient(circle at 100% 100%, rgba(114, 91, 248, 0.1), transparent 55%),
    rgba(5, 6, 11, 0.96);
}

/* اسکرول سفارشی */
.nm-chat-body::-webkit-scrollbar {
  width: 4px;
}
.nm-chat-body::-webkit-scrollbar-track {
  background: transparent;
}
.nm-chat-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}
.nm-chat-body:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
}

/* جداکننده روز */
.nm-chat-intro {
  text-align: center;
  margin-bottom: 4px;
}
.nm-chat-intro span {
  display: inline-block;
  padding: 3px 12px 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 1px rgba(240, 199, 119, 0.12);
  font-size: 0.7rem;
  color: var(--nm-text-muted);
}

.nm-messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* پیام‌ها */
.nm-message-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

.nm-message-wrapper.bot {
  align-self: flex-start;
}
.nm-message-wrapper.user {
  align-self: flex-end;
  align-items: flex-end;
}

.nm-message-bubble {
  position: relative;
  padding: 10px 14px 9px;
  border-radius: 18px;
  font-size: 0.9rem;
  line-height: 1.7;
  word-wrap: break-word;
  white-space: pre-line;
}

/* پیام ربات */
.nm-message-wrapper.bot .nm-message-bubble {
  background: linear-gradient(
    135deg,
    rgba(240, 199, 119, 0.14),
    rgba(30, 34, 58, 0.9),
    rgba(9, 10, 19, 0.96)
  );
  color: var(--nm-text-main);
  border: 1px solid rgba(240, 199, 119, 0.18);
  border-bottom-right-radius: 6px;
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.75),
    0 0 24px rgba(240, 199, 119, 0.1);
}

/* پیام کاربر */
.nm-message-wrapper.user .nm-message-bubble {
  background: radial-gradient(circle at 30% -20%, #ffffff, #f8e4b8 35%, #f0c777 65%, #b4862e 100%);
  color: #241506;
  border-bottom-left-radius: 6px;
  font-weight: 500;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.75),
    0 0 22px rgba(240, 199, 119, 0.3);
}

/* زمان پیام */
.nm-message-time {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.38);
  margin-top: 4px;
  margin-right: 4px;
}

.nm-message-wrapper.user .nm-message-time {
  text-align: left;
  margin-left: 4px;
}

/* ترنزیشن پیام‌ها */
.nm-msg-enter-active,
.nm-msg-leave-active {
  transition: all 0.22s ease-out;
}

.nm-msg-enter-from {
  opacity: 0;
  transform: translate3d(0, 8px, 0) scale(0.96);
  filter: blur(6px);
}
.nm-msg-leave-to {
  opacity: 0;
  transform: translate3d(0, -4px, 0) scale(0.9);
}

/* --- نشانگر تایپ --- */
.nm-typing-row {
  margin-top: 2px;
}

.nm-typing-bubble {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 10px;
}

.nm-typing-bubble .dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--nm-gold-soft), var(--nm-gold-deep));
  animation: nm-bounce 1.3s infinite ease-in-out both;
}

.nm-typing-bubble .dot:nth-child(1) {
  animation-delay: -0.32s;
}
.nm-typing-bubble .dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes nm-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.4) translateY(0);
    opacity: 0.6;
  }
  40% {
    transform: scale(1) translateY(-2px);
    opacity: 1;
  }
}

/* --- فوتر / ورودی --- */
.nm-chat-footer {
  padding: 10px 16px 14px;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.94),
    rgba(7, 8, 13, 0.98),
    rgba(7, 8, 13, 0.8)
  );
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -12px 24px rgba(0, 0, 0, 0.85);
}

.nm-input-shell {
  display: flex;
  align-items: center;
  padding: 5px 5px 5px 6px;
  border-radius: 999px;
  background: radial-gradient(circle at 0 0, rgba(240, 199, 119, 0.16), transparent 55%),
    rgba(19, 20, 32, 0.96);
  border: 1px solid rgba(240, 199, 119, 0.2);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.02),
    inset 0 0 0 1px rgba(0, 0, 0, 0.75);
  transition: border-color 0.25s ease-out, box-shadow 0.25s ease-out, background 0.25s ease-out;
}

.nm-input-shell:focus-within {
  border-color: rgba(240, 199, 119, 0.9);
  box-shadow:
    0 0 0 1px rgba(240, 199, 119, 0.6),
    0 0 25px rgba(240, 199, 119, 0.25);
  background: radial-gradient(circle at 0 0, rgba(240, 199, 119, 0.25), transparent 58%),
    rgba(11, 12, 19, 0.98);
}

.nm-input-shell input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--nm-text-main);
  font-size: 0.9rem;
  padding: 7px 10px 7px 6px;
}

.nm-input-shell input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

/* دکمه ارسال */
.nm-send-btn {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: none;
  padding: 0;
  margin-left: 2px;
  cursor: pointer;
  background: transparent;
  overflow: hidden;
}

.nm-send-bg {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 20% 0, #ffffff, #f0c777 30%, #8b6323 90%);
  opacity: 1;
  transition: transform 0.18s ease-out, opacity 0.18s ease-out;
}

.nm-send-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #2a1b08;
  transition: transform 0.22s cubic-bezier(0.33, 1, 0.68, 1);
}

.nm-send-btn:hover:not(:disabled) .nm-send-bg {
  transform: scale(1.06);
}
.nm-send-btn:hover:not(:disabled) .nm-send-icon {
  transform: translateX(-2px) rotate(-30deg) scale(1.05);
}

.nm-send-btn:disabled {
  cursor: default;
}
.nm-send-btn:disabled .nm-send-bg {
  opacity: 0.4;
}
.nm-send-btn:disabled .nm-send-icon {
  transform: none;
  color: rgba(37, 28, 16, 0.7);
}

/* متن کوچک زیر ورودی */
.nm-footer-hint {
  margin-top: 7px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
}

/* --- ریسپانسیو موبایل --- */
@media (max-width: 600px) {
  .nm-chat-widget {
    bottom: 16px;
    right: 16px;
    left: 16px; /* تا فضای محاسبه عرض درست شود */
  }

  .nm-chat-container {
    position: fixed;
    bottom: 90px;
    right: 16px;
    left: 16px;
    width: auto;
    max-height: min(75vh, 540px);
  }

  .nm-launcher {
    width: 60px;
    height: 60px;
    margin-right: auto; /* دکمه سمت راست بماند */
    margin-left: 0;
  }

  .nm-launcher-inner {
    width: 48px;
    height: 48px;
  }
}

/* روی صفحه‌های خیلی کوتاه، چت تمام‌قد نشود */
@media (max-height: 600px) {
  .nm-chat-container {
    max-height: 80vh;
  }
}
</style>