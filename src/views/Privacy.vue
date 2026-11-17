<script setup>
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { setPageSeo } from '../utils/seoMeta'
import { SUPPORT_CONFIG } from '../config/support'

const { locale } = useI18n()

  /* ───────── شماره تماس اختصاصی همین صفحه (مستقل از دکمه پشتیبانی) ─────────
   برای تغییر شماره این صفحه فقط همین دو خط را عوض کنید؛ support.js و دکمه شناور پشتیبانی تحت تاثیر نیست. */
const phoneDisplay = '09132256121'   // شماره‌ای که کاربر می‌بیند
const phoneIntl = '+989132256121'    // شماره‌ای که با کلیک زنگ می‌خورد (فرمت +98 را دست نزن)
const email = SUPPORT_CONFIG.email.address
const whatsapp = `https://wa.me/${SUPPORT_CONFIG.whatsapp.number}?text=${encodeURIComponent(SUPPORT_CONFIG.whatsapp.defaultMessage)}`
const instagram = `https://www.instagram.com/${SUPPORT_CONFIG.instagram.username}/`

/* ───────── محتوای دوزبانه ───────── */
const CONTENT = {
  fa: {
    badge: 'اطلاعات شما، امنِ شما',
    title: 'حریم خصوصی',
    updated: 'آخرین بازنگری: آبان ۱۴۰۵',
    intro: 'حریم خصوصی شما برای نورمهر مهم است. این صفحه به زبان ساده توضیح می‌دهد چه اطلاعاتی جمع‌آوری می‌کنیم، چرا از آن‌ها استفاده می‌کنیم، با چه کسانی به اشتراک می‌گذاریم و چگونه از آن‌ها محافظت می‌کنیم.',
    tocTitle: 'فهرست مطالب',
    contactTitle: 'تمرین حق خود: درخواست و پرسش',
    contactIntro: 'برای هر سوال درباره داده‌های خود، یا برای مشاهده، اصلاح و حذف حساب، از راه‌های زیر اقدام کنید:',
    contact: [
      { label: 'تلفن پشتیبانی', value: phoneDisplay, href: `tel:09132256121`, hint: 'همه‌روزه ۹ تا ۲۲ ' },
      { label: 'واتس‌اپ', value: 'گفتگوی مستقیم', href: whatsapp },
      { label: 'ایمیل', value: email, href: `mailto:${email}` },
      { label: 'اینستاگرام', value: '@' + SUPPORT_CONFIG.instagram.username, href: instagram },
      { label: 'تیکت پشتیبانی', value: 'از پنل کاربری', href: null, hint: 'برای درخواست حذف حساب، سریع‌ترین راه است' },
    ],
    sections: [
      {
        id: 'intro',
        title: 'مقدمه',
        paras: [
          'با ثبت‌نام و خرید در نورمهر، شما با این سیاست حفاظت از اطلاعات موافقت می‌کنید. جمع‌آوری داده‌ی ما فقط برای ارائه‌ی بهتر خدمات است، نه بیشتر.',
          'این سیاست شامل تمام صفحات و خدمات نورمهر می‌شود؛ سیاست سرویس‌های شخص ثالث (مانند درگاه‌های پرداخت) جداگانه و مستقل است.',
        ],
      },
      {
        id: 'collect',
        title: 'چه اطلاعاتی جمع‌آوری می‌کنیم؟',
        paras: [],
        list: [
          'اطلاعات حساب: نام و نام خانوادگی، شماره موبایل و ایمیل — هنگام ثبت‌نام.',
          'اطلاعات سفارش: آدرس، کد پستی، نام گیرنده و تاریخچه‌ی خریدها.',
          'علاقه‌مندی‌ها: محصولاتی که به لیست علاقه‌مندی خود اضافه می‌کنید.',
          'اطلاعات فنی: آدرس IP، نوع مرورگر و دستگاه و آمار بازدید صفحات.',
          'پیام‌ها: محتوای تیکت‌ها و پیام‌هایی که به پشتیبانی می‌فرستید.',
        ],
      },
      {
        id: 'payment',
        title: 'درباره اطلاعات پرداخت',
        paras: [
          'اطلاعات بانکی شما (شماره کارت، رمز دوم و...) فقط در محیط امن درگاه پرداخت یا سرویس اقساطی وارد می‌شود و هرگز روی سرورهای نورمهر ذخیره یا مشاهده نمی‌شود.',
          'رمز عبور حساب شما هم به‌صورت رمزنگاری‌شده (هش) نگهداری می‌شود؛ حتی تیم پشتیبانی به مقدار اصلی آن دسترسی ندارد.',
        ],
      },
      {
        id: 'why',
        title: 'چرا از این اطلاعات استفاده می‌کنیم؟',
        paras: [],
        list: [
          'پردازش، آماده‌سازی و ارسال سفارش‌ها و اطلاع‌رسانی وضعیت آن‌ها.',
          'پاسخگویی به درخواست‌های پشتیبانی و مدیریت تیکت‌ها.',
          'ارسال پیامک‌های ضروری مانند تایید شماره موبایل و وضعیت سفارش.',
          'بهبود چیدمان سایت، سرعت و تجربه‌ی خرید بر اساس رفتار کلی کاربران.',
          'تامین امنیت: جلوگیری از تخلف، سوءاستفاده و تراکنش‌های مشکوک.',
          'انجام الزامات قانونی و مالی (مانند نگهداری اسناد خرید).',
        ],
      },
      {
        id: 'cookies',
        title: 'کوکی‌ها و ذخیره‌سازی در مرورگر',
        paras: [
          'برای نگهداری نشست ورود، محتوای سبد خرید و زبان انتخابی شما، از کوکی و حافظه‌ی مرورگر استفاده می‌کنیم؛ این داده‌ها فقط برای کارکرد درست سایت است و شامل ردیابی تبلیغاتی نیست.',
          'می‌توانید کوکی‌ها را از تنظیمات مرورگر پاک کنید؛ در این صورت برای خرید مجدد باید دوباره وارد حساب خود شوید.',
        ],
      },
      {
        id: 'share',
        title: 'اشتراک‌گذاری اطلاعات با چه کسانی؟',
        paras: ['ما اطلاعات شما را نمی‌فروشیم و آن را با هیچ تبلیغ‌دهنده‌ای به اشتراک نمی‌گذاریم. فقط در موارد زیر، حداقل داده‌ی لازم ارائه می‌شود:'],
        list: [
          'درگاه‌های پرداخت و سرویس‌های اقساطی: برای انجام و تایید تراکنش.',
          'شرکت حمل‌ونقل (پست یا پیک): نام، شماره تماس و آدرس گیرنده برای تحویل سفارش.',
          'سرویس پیامک: شماره موبایل شما برای اطلاع‌رسانی‌های ضروری.',
        ],
      },
      {
        id: 'security',
        title: 'امنیت',
        paras: [
          'ارتباط سایت با پروتکل امن HTTPS رمزنگاری می‌شود؛ رمزهای عبور هش می‌شوند و دسترسی به داده‌ها برای پرسنل، محدود و کنترل‌شده است.',
          'هیچ سیستمی صددرصد ایمن نیست؛ اگر رفتار مشکوکی در حساب یا پرداخت خود دیدید، بلافاصله به پشتیبانی اطلاع دهید.',
        ],
      },
      {
        id: 'retention',
        title: 'مدت نگهداری داده‌ها',
        paras: [
          'اطلاعات حساب تا زمانی که حساب شما فعال است نگه داشته می‌شود؛ سوابق سفارش و مالی مطابق الزامات قانونی، برای مدت مشخصی محفوظ می‌ماند.',
          'با حذف حساب، اطلاعات شخصی شما حذف یا بی‌نام می‌شود؛ به‌جز اسنادی که قانون، نگهداری آن‌ها را الزامی کرده است.',
        ],
      },
      {
        id: 'rights',
        title: 'حقوق شما',
        paras: ['داده‌های شما متعلق به خودتان است؛ این حقوق را دارید:'],
        list: [
          'مشاهده و ویرایش اطلاعات از پنل کاربری (بخش پروفایل و آدرس‌ها).',
          'درخواست حذف کامل حساب و داده‌های شخصی از طریق پشتیبانی.',
          'لغو دریافت پیامک‌های اطلاع‌رسانی با تماس با پشتیبانی.',
          'پرسش درباره این‌که چه داده‌ای از شما نگهداری می‌کنیم؛ با یک پیام، گزارش می‌دهیم.',
        ],
      },
      {
        id: 'children',
        title: 'کودکان',
        paras: [
          'خدمات نورمهر برای کودکان طراحی نشده است و ما آگاهانه اطلاعاتی از کودکان جمع‌آوری نمی‌کنیم. اگر چنین داده‌ای بدون اطلاع ما ثبت شده باشد، با اطلاع شما حذفش می‌کنیم.',
        ],
      },
      {
        id: 'links',
        title: 'لینک‌های خارجی',
        paras: [
          'سایت ما به شبکه‌های اجتماعی و درگاه‌های پرداخت لینک دارد؛ پس از خروج از نورمهر، سیاست حریم خصوصی همان سرویس‌ها اعمال می‌شود و خارج از کنترل ماست.',
        ],
      },
      {
        id: 'changes',
        title: 'تغییرات این سیاست',
        paras: [
          'ممکن است این سیاست به‌روزرسانی شود؛ نسخه‌ی جدید از لحظه‌ی انتشار در همین صفحه معتبر است و تاریخ بازنگری در بالای صفحه به‌روز می‌شود.',
          'تغییرات مهم و تاثیرگذار بر حقوق شما را از طریق پیامک یا اعلان سایت نیز اعلام می‌کنیم.',
        ],
      },
    ],
  },
  en: {
    badge: 'Your Data, Your Security',
    title: 'Privacy Policy',
    updated: 'Last updated: November 2026',
    intro: 'Your privacy matters to Nourmehr. This page explains, in plain language, what information we collect, why we use it, with whom we share it, and how we protect it.',
    tocTitle: 'Table of Contents',
    contactTitle: 'Exercise Your Rights: Requests & Questions',
    contactIntro: 'For any question about your data, or to view, correct or delete your account, use the channels below:',
    contact: [
      { label: 'Support Phone', value: phoneDisplay, href: `tel:09132256121`, hint: 'Daily 9:00–22:00 (Tehran time)' },
      { label: 'WhatsApp', value: 'Chat with us', href: whatsapp },
      { label: 'Email', value: email, href: `mailto:${email}` },
      { label: 'Instagram', value: '@' + SUPPORT_CONFIG.instagram.username, href: instagram },
      { label: 'Support Ticket', value: 'From your account panel', href: null, hint: 'Fastest way to request account deletion' },
    ],
    sections: [
      {
        id: 'intro',
        title: 'Introduction',
        paras: [
          'By registering and shopping at Nourmehr, you agree to this data-protection policy. We collect data only to serve you better — nothing more.',
          'This policy covers all Nourmehr pages and services; third-party services (such as payment gateways) have their own separate policies.',
        ],
      },
      {
        id: 'collect',
        title: 'What Information We Collect',
        paras: [],
        list: [
          'Account info: full name, mobile number and email — provided at registration.',
          'Order info: address, postal code, recipient name and purchase history.',
          'Wishlist: the products you add to your favorites list.',
          'Technical info: IP address, browser and device type, and page-view statistics.',
          'Messages: the content of tickets and messages you send to support.',
        ],
      },
      {
        id: 'payment',
        title: 'About Payment Data',
        paras: [
          'Your banking information (card number, dynamic PIN, etc.) is entered only inside the secure environment of the payment gateway or installment provider and is never stored or seen on Nourmehr servers.',
          'Your account password is stored in encrypted (hashed) form; even our support team has no access to its original value.',
        ],
      },
      {
        id: 'why',
        title: 'Why We Use This Information',
        paras: [],
        list: [
          'Processing, preparing and shipping orders, and notifying you of their status.',
          'Answering support requests and managing tickets.',
          'Sending essential SMS such as mobile verification and order status.',
          'Improving site layout, speed and the shopping experience based on overall user behavior.',
          'Security: preventing fraud, abuse and suspicious transactions.',
          'Meeting legal and financial obligations (such as keeping purchase records).',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies & Browser Storage',
        paras: [
          'We use cookies and browser storage to keep your login session, cart contents and chosen language; this data exists only to make the site work and involves no advertising tracking.',
          'You can clear cookies from your browser settings; you will then need to sign in again to shop.',
        ],
      },
      {
        id: 'share',
        title: 'With Whom We Share Information',
        paras: ['We never sell your data and never share it with advertisers. Only the following receive the minimum data required:'],
        list: [
          'Payment gateways and installment providers: to process and confirm transactions.',
          'Carriers (post or courier): recipient name, phone number and address for delivery.',
          'SMS service: your mobile number for essential notifications.',
        ],
      },
      {
        id: 'security',
        title: 'Security',
        paras: [
          'Site traffic is encrypted over HTTPS; passwords are hashed and staff access to data is limited and controlled.',
          'No system is 100% secure; if you notice anything suspicious in your account or payment, notify support immediately.',
        ],
      },
      {
        id: 'retention',
        title: 'Data Retention',
        paras: [
          'Account information is kept while your account is active; order and financial records are retained for a defined period as required by law.',
          'When you delete your account, your personal data is erased or anonymized — except records the law obliges us to keep.',
        ],
      },
      {
        id: 'rights',
        title: 'Your Rights',
        paras: ['Your data belongs to you; you have the following rights:'],
        list: [
          'View and edit your information from the account panel (Profile and Addresses).',
          'Request full deletion of your account and personal data via support.',
          'Opt out of notification SMS by contacting support.',
          'Ask what data we hold about you — one message and we will provide a report.',
        ],
      },
      {
        id: 'children',
        title: 'Children',
        paras: [
          'Nourmehr services are not designed for children, and we do not knowingly collect data from children. If such data has been registered without our knowledge, we will delete it upon notice.',
        ],
      },
      {
        id: 'links',
        title: 'External Links',
        paras: [
          'Our site links to social networks and payment gateways; once you leave Nourmehr, those services’ own privacy policies apply and are outside our control.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to This Policy',
        paras: [
          'This policy may be updated; the new version is effective from the moment it is published on this page, and the revision date at the top is refreshed.',
          'Major changes that affect your rights will also be announced via SMS or a site notification.',
        ],
      },
    ],
  },
}

/* ───────── داده‌های نمایشی ───────── */
const content = computed(() => CONTENT[locale.value] || CONTENT.fa)
const sections = computed(() => content.value.sections)
const formatNum = (n) =>
  Number(n).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const scrollTo = (id) => {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ───────── سئوی صفحه ───────── */
const applySeo = () => {
  const fa = locale.value === 'fa'
  setPageSeo({
    title: fa ? 'حریم خصوصی | نورمهر' : 'Privacy Policy | Nourmehr',
    description: fa
      ? 'سیاست حفاظت از اطلاعات شخصی کاربران فروشگاه صنایع‌دستی نورمهر: داده‌هایی که جمع‌آوری می‌کنیم، کوکی‌ها، اشتراک‌گذاری، امنیت و حقوق شما.'
      : 'Nourmehr handmade handicrafts store privacy policy: what we collect, cookies, data sharing, security and your rights.',
    lang: locale.value,
  })
}

onMounted(applySeo)
watch(locale, applySeo)
</script>

<template>
  <section class="legal-page">
    <div class="bg-glow" aria-hidden="true"></div>
    <div class="bg-glow second" aria-hidden="true"></div>

    <div class="legal-container">
      <!-- سربرگ -->
      <header class="legal-hero">
        <span class="hero-badge"><span class="dot"></span>{{ content.badge }}<span class="dot"></span></span>
        <h1>{{ content.title }}</h1>
        <p class="updated">{{ content.updated }}</p>
        <p class="intro">{{ content.intro }}</p>
      </header>

      <!-- فهرست مطالب -->
      <nav class="toc glass" :aria-label="content.tocTitle">
        <span class="toc-title">{{ content.tocTitle }}</span>
        <div class="toc-items">
          <a
            v-for="(s, i) in sections"
            :key="s.id"
            :href="`#${s.id}`"
            @click.prevent="scrollTo(s.id)"
          >{{ formatNum(i + 1) }}. {{ s.title }}</a>
        </div>
      </nav>

      <!-- بخش‌ها -->
      <article
        v-for="(s, i) in sections"
        :id="s.id"
        :key="s.id"
        class="legal-section"
      >
        <h2>
          <span class="sec-num">{{ formatNum(i + 1) }}</span>
          <span class="sec-title">{{ s.title }}</span>
        </h2>
        <p v-for="(p, j) in s.paras" :key="j" class="legal-text">{{ p }}</p>
        <ul v-if="s.list && s.list.length" class="legal-list">
          <li v-for="(li, j) in s.list" :key="j">{{ li }}</li>
        </ul>
      </article>

      <!-- کارت تماس -->
      <div class="contact-card glass">
        <h2><span class="contact-diamond">◆</span>{{ content.contactTitle }}</h2>
        <p class="contact-intro">{{ content.contactIntro }}</p>
        <ul class="contact-list">
          <li v-for="(c, i) in content.contact" :key="i">
            <span class="contact-label">{{ c.label }}:</span>
            <a v-if="c.href" :href="c.href" target="_blank" rel="noopener noreferrer">{{ c.value }}</a>
            <span v-else class="contact-value">{{ c.value }}</span>
            <span v-if="c.hint" class="contact-hint">{{ c.hint }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.legal-page * , .legal-page *::before, .legal-page *::after { box-sizing: border-box; }

.legal-page {
  min-height: 100vh;
  padding: clamp(40px, 6vw, 80px) clamp(14px, 4vw, 48px) clamp(60px, 8vw, 100px);
  background: #040609;
  color: #fff;
  position: relative;
  overflow-x: hidden;
  font-family: 'Vazirmatn', 'Inter', system-ui, sans-serif;
}

/* هاله‌های طلایی پس‌زمینه */
.bg-glow { position: absolute; top: -12%; inset-inline-end: -8%; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(circle, rgba(197,160,89,0.16), transparent 70%); pointer-events: none; }
.bg-glow.second { top: auto; bottom: 5%; inset-inline-end: auto; inset-inline-start: -10%; background: radial-gradient(circle, rgba(197,160,89,0.09), transparent 70%); }

.legal-container { max-width: 860px; margin: 0 auto; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 22px; }

/* سربرگ */
.legal-hero { text-align: center; }
.hero-badge { display: inline-flex; align-items: center; gap: 10px; padding: 8px 22px; border-radius: 999px; background: rgba(197,160,89,0.08); border: 1px solid rgba(197,160,89,0.25); font-size: 0.72rem; letter-spacing: 3px; color: #c5a059; margin-bottom: 18px; }
.hero-badge .dot { width: 4px; height: 4px; border-radius: 50%; background: #c5a059; }
.legal-hero h1 { font-size: clamp(1.6rem, 3.6vw, 2.4rem); font-weight: 800; line-height: 1.2; margin: 0; background: linear-gradient(135deg, #fff 30%, #c5a059 70%, #fff 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.updated { margin: 12px 0 0; font-size: 0.78rem; color: rgba(197,160,89,0.75); }
.intro { margin: 16px auto 0; max-width: 680px; font-size: clamp(0.85rem, 1.8vw, 0.95rem); line-height: 2; color: rgba(255,255,255,0.6); text-align: start; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px 20px; }

.glass { background: linear-gradient(165deg, rgba(18,22,36,0.85), rgba(8,10,18,0.92)); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; }

/* فهرست مطالب */
.toc { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.toc-title { font-size: 0.85rem; font-weight: 700; color: #f5d78e; }
.toc-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px 18px; }
.toc-items a { font-size: 0.82rem; color: rgba(255,255,255,0.62); text-decoration: none; transition: color 0.25s ease; cursor: pointer; }
.toc-items a:hover { color: #f5d78e; }

/* بخش‌ها */
.legal-section { scroll-margin-top: 96px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: clamp(16px, 2.4vw, 26px); }
.legal-section h2 { display: flex; align-items: center; gap: 12px; font-size: clamp(1rem, 2vw, 1.15rem); font-weight: 700; color: #f0f0f0; margin: 0 0 14px; }
.sec-num { flex-shrink: 0; width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; color: #f5d78e; background: rgba(197,160,89,0.12); border: 1px solid rgba(197,160,89,0.3); }
.legal-text { font-size: clamp(0.84rem, 1.7vw, 0.92rem); line-height: 2.1; color: rgba(255,255,255,0.65); margin: 0 0 12px; }
.legal-text:last-child { margin-bottom: 0; }
.legal-list { margin: 4px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.legal-list li { position: relative; padding-inline-start: 22px; font-size: clamp(0.84rem, 1.7vw, 0.92rem); line-height: 1.95; color: rgba(255,255,255,0.65); }
.legal-list li::before { content: '◆'; position: absolute; inset-inline-start: 0; top: 1px; font-size: 0.5rem; color: rgba(197,160,89,0.75); }

/* کارت تماس */
.contact-card { padding: clamp(18px, 2.6vw, 28px); }
.contact-card h2 { display: flex; align-items: center; gap: 10px; font-size: 1.1rem; font-weight: 700; color: #f5d78e; margin: 0 0 10px; }
.contact-diamond { font-size: 0.6rem; color: #c5a059; }
.contact-intro { font-size: 0.87rem; line-height: 1.9; color: rgba(255,255,255,0.6); margin: 0 0 16px; }
.contact-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px; }
.contact-list li { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; font-size: 0.88rem; }
.contact-label { color: rgba(255,255,255,0.5); }
.contact-list a { color: #f5d78e; text-decoration: none; border-bottom: 1px dashed rgba(197,160,89,0.4); transition: color 0.25s ease, border-color 0.25s ease; }
.contact-list a:hover { color: #fff; border-color: rgba(255,255,255,0.5); }
.contact-value { color: #f5d78e; }
.contact-hint { flex-basis: 100%; font-size: 0.74rem; color: rgba(255,255,255,0.35); }

@media (max-width: 640px) {
  .toc-items { grid-template-columns: 1fr; }
  .legal-page { padding-inline: 14px; }
}
</style>
