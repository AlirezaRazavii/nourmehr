<template>
  <footer class="footer-wrapper" :aria-label="$t('footer_aria_label')">
    <!-- هاله طلایی پس‌زمینه -->
    <div class="glow" aria-hidden="true"></div>

    <div class="footer">
      <!-- بخش بالا -->
      <div class="footer-top">
        <!-- ستون توضیح برند -->
        <div class="brand">
          <h2 class="logo">NOURMEHR</h2>
          <p class="tagline">{{ $t('footer_brand_tagline') }}</p>
          <p class="desc">{{ $t('footer_brand_desc') }}</p>

          <div class="badges">
            <span>{{ $t('footer_badge_handmade') }}</span>
            <span>{{ $t('footer_badge_limited') }}</span>
            <span>{{ $t('footer_badge_luxury') }}</span>
          </div>
        </div>

        <!-- ستون‌های لینک‌ها -->
        <nav class="columns" :aria-label="$t('footer_nav_aria')">
          <div class="column">
            <h3>{{ $t('footer_quick_links') }}</h3>
            <ul>
              <li><router-link :to="localePath('/')">{{ $t('nav_home') }}</router-link></li>
              <li><router-link :to="localePath('/products')">{{ $t('nav_products') }}</router-link></li>
              <li><router-link :to="localePath('/about')">{{ $t('nav_about') }}</router-link></li>
              <li><router-link :to="localePath('/contact')">{{ $t('nav_contact') }}</router-link></li>
            </ul>
          </div>

          <div class="column">
            <h3>{{ $t('footer_collections_title') }}</h3>
            <ul>
              <li><router-link :to="localePath('/products')">{{ $t('footer_col_diamond') }}</router-link></li>
              <li><router-link :to="localePath('/products')">{{ $t('footer_col_khatam') }}</router-link></li>
              <li><router-link :to="localePath('/products')">{{ $t('footer_col_turquoise') }}</router-link></li>
              <li><router-link :to="localePath('/products')">{{ $t('footer_col_backgammon') }}</router-link></li>
            </ul>
          </div>

          <div class="column contact">
            <h3>{{ $t('footer_contact_title') }}</h3>
            <ul>
              <li>
                <a :href="`tel:${phoneRaw}`" dir="ltr">{{ $t('footer_contact_phone') }}</a>
              </li>
              <li>
                <a :href="`mailto:${emailRaw}`" dir="ltr">{{ $t('footer_contact_email') }}</a>
              </li>
              <li>{{ $t('footer_contact_address') }}</li>
            </ul>

            <div class="socials">
              <a :href="socials.instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
              </a>
              <a :href="socials.telegram" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 4L3 11l5 2 2 6 3-4 4 3 4-14z" />
                </svg>
              </a>
              <a :href="socials.whatsapp" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 11.5A8.5 8.5 0 0 0 7.2 4.3 8.5 8.5 0 0 0 4 18l-1 3 3-1a8.5 8.5 0 0 0 14-8.5z" />
                  <path d="M9.5 9.5c.3-.2.5-.5.7-.8.1-.2.1-.4 0-.6L9.8 7c-.1-.2-.3-.3-.5-.3H9c-.1 0-.2 0-.3.1-.5.2-1.1.6-1.3 1.2C7 9.2 7.4 10.3 8.3 11.3s2.1 1.6 2.9 1.9c.6.2 1.4.1 1.9-.3.4-.3.7-.8.8-1.3v-.3c0-.2-.1-.4-.3-.5l-1.1-.4c-.2-.1-.4-.1-.6 0-.3.2-.6.4-.8.7" />
                </svg>
              </a>
            </div>
          </div>
        </nav>
      </div>

      <!-- خط جداکننده -->
      <div class="divider" aria-hidden="true"></div>

      <!-- بخش پایین -->
      <div class="footer-bottom">
        <span>{{ $t('footer_copyright', { year: currentYear }) }}</span>
        <div class="bottom-links">
          <router-link :to="localePath('/terms')">{{ $t('footer_terms') }}</router-link>
          <span class="dot" aria-hidden="true">•</span>
          <router-link :to="localePath('/privacy')">{{ $t('footer_privacy') }}</router-link>
        </div>
      </div>

      <!-- پاورد بای -->
      <div class="powered-by">
        Powered by <strong>inconnection</strong>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// سال جاری به‌صورت داینامیک تا کپی‌رایت هرسال دستی به‌روز نشود
const currentYear = new Date().getFullYear()

// نسخه‌ی خام برای لینک tel/mailto (باید بدون فاصله و کاراکتر فارسی باشد)
const phoneRaw = '+989123456789'
const emailRaw = 'info@nourmehr.com'

// لینک شبکه‌های اجتماعی در یک جا برای نگهداری آسان
const socials = {
  instagram: 'https://instagram.com/nourmehr',
  telegram: 'https://t.me/nourmehr',
  whatsapp: 'https://wa.me/989123456789'
}

// افزودن پیشوند زبان به مسیرها (هماهنگ با روتر دوزبانه‌ی شما)
const localePath = (path) => {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `/${locale.value}${clean === '/' ? '' : clean}`
}
</script>

<style scoped>
.footer-wrapper {
  position: relative;
  margin-top: 60px;
  background: #050814;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  overflow: hidden; /* برای مهار هاله‌ی طلایی که ممکن است از لبه‌ها بیرون بزند */
}

/* هاله طلایی پس‌زمینه */
.glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(197, 160, 89, 0.18), transparent 55%),
    radial-gradient(circle at top right, rgba(92, 196, 218, 0.1), transparent 55%);
  opacity: 0.7;
  pointer-events: none;
}

.footer {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 40px 24px;
  color: #fff;
  z-index: 1;
}

/* بخش بالا */
.footer-top {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(0, 2fr);
  gap: 40px;
  align-items: flex-start;
}

/* برند — backdrop-filter حذف شد چون روی پس‌زمینه‌ی تقریباً یکدست تأثیر بصری ناچیز داشت اما بار GPU زیادی می‌آورد */
.brand {
  background: rgba(12, 16, 30, 0.85);
  border-radius: 20px;
  padding: 24px 24px 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6);
}

.logo {
  font-size: 1.6rem;
  letter-spacing: 4px;
  margin-bottom: 6px;
}

.tagline {
  font-size: 1rem;
  color: #facc6b;
  margin-bottom: 10px;
}

.desc {
  font-size: 0.9rem;
  line-height: 1.9;
  opacity: 0.9;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.badges span {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.75rem;
  opacity: 0.9;
}

/* ستون لینک‌ها */
.columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.column h3 {
  font-size: 1rem;
  margin-bottom: 10px;
}

.column ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.column li {
  margin-bottom: 6px;
  font-size: 0.9rem;
}

.column a {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color 0.2s ease, transform 0.2s ease;
}

.column a:hover {
  color: #facc6b;
  /* از transform منطقی استفاده شده تا در LTR/RTL جهت درست باشد */
  transform: translateX(-2px);
}

/* ستون تماس + شبکه‌های اجتماعی */
.contact ul li {
  opacity: 0.9;
}

.socials {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.socials a {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #facc6b;
  /* transition: all حذف شد و فقط خاصیت‌های لازم انیمیت می‌شوند */
  transition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
  background: rgba(0, 0, 0, 0.25);
}

.socials a:hover {
  background: #c5a059;
  color: #000;
  box-shadow: 0 0 14px rgba(197, 160, 89, 0.8);
}

.socials svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
}

/* خط جداکننده — با gradient دوطرفه که مستقل از جهت زبان است */
.divider {
  margin: 26px 0 14px;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
}

/* بخش پایین */
.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.bottom-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bottom-links a {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}

.bottom-links a:hover {
  color: #facc6b;
}

.dot {
  opacity: 0.5;
}

/* پاورد بای */
.powered-by {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
  font-size: 0.78rem;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  direction: ltr;
}

.powered-by strong {
  color: #facc6b;
  font-weight: 600;
}

/* ریسپانسیو */
@media (max-width: 960px) {
  .footer-top {
    grid-template-columns: 1fr;
  }
  .columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .footer {
    padding: 32px 20px 20px;
  }
  .columns {
    grid-template-columns: 1fr;
  }
  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* احترام به تنظیمات کاهش حرکت */
@media (prefers-reduced-motion: reduce) {
  .column a,
  .socials a,
  .bottom-links a {
    transition: none;
  }
  .column a:hover {
    transform: none;
  }
}
</style>
