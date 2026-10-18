<template>
  <div class="landing-page">
    <!-- هیرو: لوگو + اسم مغازه -->
    <section class="lp-hero">
      <img :src="logo" alt="علی نورمهر" class="lp-logo" />
      <h1 class="lp-title">علی نورمهر</h1>
      <p class="lp-subtitle">صنایع دستی — اصفهان، بازار نقش جهان</p>
      <div class="lp-divider"><span></span><i>◆</i><span></span></div>
    </section>

    <!-- شعبه‌ها -->
    <section class="lp-section">
      <h2 class="lp-section-title">شعبه‌های ما</h2>

      <div class="lp-branches">
        <div class="branch-card">
          <span class="branch-badge">شعبه ۱</span>
          <h3 class="branch-name">بازار شیخ لطف‌الله</h3>
          <p class="branch-address">
            اصفهان، میدان نقش جهان، بازار شیخ لطف‌الله، صنایع دستی علی نورمهر
          </p>
          <div class="lp-actions">
            <a :href="MAP_URL_1" target="_blank" rel="noopener" class="branch-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              مسیریابی در نقشه
            </a>
            <a :href="GOOGLE_MAPS_URL_1" target="_blank" rel="noopener" class="branch-btn ghost">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              نقشه گوگل
            </a>
          </div>
        </div>

        <div class="branch-card">
          <span class="branch-badge">شعبه ۲</span>
          <h3 class="branch-name">بازار چهارسوق مقصود</h3>
          <p class="branch-address">
            اصفهان، میدان نقش جهان، بازار چهارسوق مقصود، صنایع دستی علی نورمهر — شعبه دوم
          </p>
          <div class="lp-actions">
            <a :href="MAP_URL_2" target="_blank" rel="noopener" class="branch-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              مسیریابی در نقشه
            </a>
            <a :href="GOOGLE_MAPS_URL_2" target="_blank" rel="noopener" class="branch-btn ghost">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              نقشه گوگل
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ساعت کاری و تماس مستقیم (NAP برای سئوی محلی) -->
    <section class="lp-section">
      <h2 class="lp-section-title">ساعت کاری و تماس</h2>
      <div class="lp-hours">
        <p class="lp-hours-line">شنبه تا پنجشنبه: ۹:۰۰ تا ۲۱:۰۰</p>
        <p class="lp-hours-line">جمعه: ۱۱:۰۰ تا ۲۲:۰۰</p>
        <a :href="`tel:${PHONE_RAW}`" class="lp-hours-phone" dir="ltr">۰۹۱۳ ۲۲۵ ۶۱۲۱</a>
      </div>
    </section>

    <!-- شبکه‌های اجتماعی -->
    <section class="lp-section">
      <h2 class="lp-section-title">ارتباط با ما</h2>

      <div class="lp-social">
        <a :href="WHATSAPP_URL" target="_blank" rel="noopener" class="social-btn whatsapp">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span>واتساپ</span>
        </a>

        <a :href="INSTAGRAM_URL" target="_blank" rel="noopener" class="social-btn instagram">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          <span>اینستاگرام</span>
        </a>
      </div>
    </section>

    <!-- دعوت به فروشگاه -->
    <router-link :to="{ name: 'Products', params: { lang: locale } }" class="lp-cta">
      <span>مشاهده محصولات فروشگاه</span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l-7-7 7-7"/></svg>
    </router-link>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import logo from '../assests/logo/Nourmehr-gold.webp'

const { locale } = useI18n()

/* ---------- لینک‌ها (اگر بعداً عوض شدند، فقط همین‌جا تغییر کن) ---------- */
// واتساپ مستقیم با شماره (wa.me/98...) — برای گوگل سیگنال NAP قوی‌تر از لینک /message/ مخفی‌کننده شماره است
const WHATSAPP_URL = 'https://wa.me/989132256121'
const INSTAGRAM_URL = 'https://www.instagram.com/nourmehr_handicrafts'
const PHONE_RAW = '+989132256121'

// نقشه گوگل با جست‌وجوی نام کسب‌وکار (لینک کوتاه nshn برای گوگل ارزش سئویی ندارد — این لینک دارد)
const GOOGLE_MAPS_URL_1 = 'https://www.google.com/maps/search/?api=1&query=%D8%B5%D9%86%D8%A7%DB%8C%D8%B9+%D8%AF%D8%B3%D8%AA%DB%8C+%D9%86%D9%88%D8%B1%D9%85%D9%87%D8%B1+%D8%A8%D8%A7%D8%B2%D8%A7%D8%B1+%D8%B4%DB%8C%D8%AE+%D9%84%D8%B7%D9%81+%D8%A7%D9%84%D9%84%D9%87+%D8%A7%D8%B5%D9%81%D9%87%D8%A7%D9%86'
const GOOGLE_MAPS_URL_2 = 'https://www.google.com/maps/search/?api=1&query=%D8%B5%D9%86%D8%A7%DB%8C%D8%B9+%D8%AF%D8%B3%D8%AA%DB%8C+%D9%86%D9%88%D8%B1%D9%85%D9%87%D8%B1+%D8%A8%D8%A7%D8%B2%D8%A7%D8%B1+%DA%86%D9%87%D8%A7%D8%B1%D8%B3%D9%88%D9%82+%D9%85%D9%82%D8%B5%D9%88%D8%AF+%D8%A7%D8%B5%D9%81%D9%87%D8%A7%D9%86'

// فعلاً هر دو شعبه یک لینک دارند — اگر لینک جدا برای شعبه ۲ داشتی، MAP_URL_2 را عوض کن
const MAP_URL_1 = 'https://nshn.ir/f5_bZqDSNxnLYb'
const MAP_URL_2 = 'https://nshn.ir/f5_bZqDSNxnLYb'

/* ---------- LocalBusiness JSON-LD — سلاح اصلی سئوی محلی این صفحه ----------
   دو شعبه به‌صورت دو Store با ساعت کاری، تلفن و آدرس یکسان با بقیه سایت (NAP یکدست) */
const SITE_URL = 'https://nourmehr.ir'
const SOCIAL_SAMEAS = [
  'https://www.instagram.com/nourmehr_handicrafts',
  'https://wa.me/989132256121',
]
const OPENING_HOURS = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    opens: '09:00',
    closes: '21:00',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Friday'],
    opens: '11:00',
    closes: '22:00',
  },
]

const storeLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  '@id': `${SITE_URL}/#store`,
  name: 'صنایع دستی نورمهر',
  legalName: 'صنایع دستی علی نورمهر',
  alternateName: ['نورمهر', 'نور مهر', 'صنایع دستی علی نورمهر', 'Nourmehr'],
  url: `${SITE_URL}/fa`,
  telephone: PHONE_RAW,
  email: 'a.noormehr@gmail.com',
  founder: { '@type': 'Person', name: 'علی نورمهر' },
  priceRange: '$$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'بازار شیخ لطف‌الله، میدان نقش جهان',
    addressLocality: 'اصفهان',
    addressRegion: 'اصفهان',
    addressCountry: 'IR',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 32.6573, longitude: 51.6776 },
  areaServed: { '@type': 'City', name: 'اصفهان' },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: PHONE_RAW,
    contactType: 'customer service',
    availableLanguage: ['fa', 'en'],
  },
  openingHoursSpecification: OPENING_HOURS,
  sameAs: SOCIAL_SAMEAS,
}

const branch2Ld = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  '@id': `${SITE_URL}/#store-branch-2`,
  name: 'صنایع دستی نورمهر — بازار چهارسوق مقصود',
  branchOf: { '@id': `${SITE_URL}/#store` },
  url: `${SITE_URL}/fa/landing`,
  telephone: PHONE_RAW,
  email: 'a.noormehr@gmail.com',
  priceRange: '$$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'بازار چهارسوق مقصود، میدان نقش جهان',
    addressLocality: 'اصفهان',
    addressRegion: 'اصفهان',
    addressCountry: 'IR',
  },
  // مختصات دقیق شعبه ۲ را وقتی داشتی این‌جا اضافه کن
  areaServed: { '@type': 'City', name: 'اصفهان' },
  openingHoursSpecification: OPENING_HOURS,
  sameAs: SOCIAL_SAMEAS,
}

// تزریق اسکیما در head (این صفحه noindex است ولی اسکیما برای رندر JS و ابزارها سالم می‌ماند)
const injectJsonLd = (data) => {
  if (typeof document === 'undefined') return
  const el = document.createElement('script')
  el.type = 'application/ld+json'
  el.textContent = JSON.stringify(data)
  document.head.appendChild(el)
}
injectJsonLd(storeLd)
injectJsonLd(branch2Ld)
</script>

<style scoped>
.landing-page {
  padding: 60px clamp(16px, 4vw, 60px) 90px;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 56px;
}

/* ---------- هیرو ---------- */
.lp-hero { text-align: center; }
.lp-logo {
  width: 110px;
  height: 110px;
  object-fit: contain;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 30px rgba(197,160,89,0.35));
}
.lp-title {
  font-size: clamp(2rem, 5vw, 2.8rem);
  font-weight: 800;
  margin: 0;
  background: linear-gradient(120deg, #fff 30%, #c5a059 60%, #fff 90%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.lp-subtitle {
  color: rgba(255,255,255,0.55);
  margin: 12px 0 0;
  font-size: 1rem;
}
.lp-divider { display: flex; align-items: center; gap: 12px; margin-top: 28px; }
.lp-divider span { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent); }
.lp-divider i { color: #c5a059; font-size: 0.7rem; }

/* ---------- بخش‌ها ---------- */
.lp-section-title {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 24px;
}

/* ---------- کارت شعبه ---------- */
.lp-branches { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.branch-card {
  background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98));
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px;
  padding: 28px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  transition: border-color 0.3s ease, transform 0.3s ease;
}
.branch-card:hover { border-color: rgba(197,160,89,0.3); transform: translateY(-4px); }

.branch-badge {
  padding: 5px 16px;
  border-radius: 999px;
  background: rgba(197,160,89,0.15);
  border: 1px solid rgba(197,160,89,0.35);
  color: #facc6b;
  font-size: 0.8rem;
  font-weight: 600;
}
.branch-name { margin: 0; font-size: 1.15rem; font-weight: 700; }
.branch-address { color: rgba(255,255,255,0.6); line-height: 1.9; margin: 0; font-size: 0.9rem; }

.branch-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding: 11px 22px;
  border-radius: 12px;
  background: rgba(197,160,89,0.15);
  border: 1px solid rgba(197,160,89,0.35);
  color: #facc6b;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 600;
  transition: background 0.3s, color 0.3s;
}
.branch-btn:hover { background: #c5a059; color: #000; }
.branch-btn:hover svg { stroke: #000; }

/* ---------- دکمه‌های اجتماعی ---------- */
.lp-social { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
.social-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 34px;
  border-radius: 14px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  transition: transform 0.25s, box-shadow 0.25s;
}
.social-btn:hover { transform: translateY(-3px); }

.social-btn.whatsapp {
  background: linear-gradient(135deg, #25D366, #128C7E);
  color: #fff;
  box-shadow: 0 8px 24px rgba(37,211,102,0.25);
}
.social-btn.instagram {
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
  color: #fff;
  box-shadow: 0 8px 24px rgba(220,39,103,0.25);
}

/* ---------- دکمه پایانی ---------- */
.lp-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  text-decoration: none;
  font-weight: 700;
  font-size: 1rem;
  transition: transform 0.25s, box-shadow 0.25s;
}
.lp-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(197,160,89,0.4); }

/* ---------- ساعت کاری و تماس ---------- */
.lp-hours {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  border-radius: 20px;
  background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98));
  border: 1px solid rgba(255,255,255,0.05);
}
.lp-hours-line { margin: 0; color: rgba(255,255,255,0.75); font-size: 1rem; }
.lp-hours-phone {
  margin-top: 6px;
  color: #facc6b;
  font-size: 1.4rem;
  font-weight: 800;
  text-decoration: none;
  letter-spacing: 1px;
}
.lp-hours-phone:hover { text-decoration: underline; }

/* ---------- دکمه‌های شعبه ---------- */
.lp-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: auto;
}
.branch-btn.ghost {
  background: transparent;
  box-shadow: none;
}

/* ---------- ریسپانسیو ---------- */
@media (max-width: 768px) {
  .lp-branches { grid-template-columns: 1fr; }
  .lp-social { flex-direction: column; }
  .social-btn { justify-content: center; }
  .lp-logo { width: 90px; height: 90px; }
}
</style>