<script setup>
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { setPageSeo } from '../utils/seoMeta'
import { SUPPORT_CONFIG } from '../config/support'

const { locale } = useI18n()

/* ───────── اطلاعات تماس واقعی از config (تک منبع حقیقت) ───────── */
const phoneDisplay = SUPPORT_CONFIG.phone.display
const phoneIntl = SUPPORT_CONFIG.phone.international
const email = SUPPORT_CONFIG.email.address
const whatsapp = `https://wa.me/${SUPPORT_CONFIG.whatsapp.number}?text=${encodeURIComponent(SUPPORT_CONFIG.whatsapp.defaultMessage)}`
const instagram = `https://www.instagram.com/${SUPPORT_CONFIG.instagram.username}/`

/* ───────── محتوای دوزبانه ───────── */
const CONTENT = {
  fa: {
    badge: 'تعهد ما به شفافیت',
    title: 'قوانین و مقررات',
    updated: 'آخرین بازنگری: آبان ۱۴۰۵',
    intro: 'به نورمهر خوش آمدید — خانه‌ی صنایع‌دستی اصیل ایرانی. استفاده از این سایت، ثبت‌نام یا خرید به معنای مطالعه و پذیرش کامل قوانین زیر است. این قوانین بر پایه‌ی قوانین جمهوری اسلامی ایران، از جمله قانون تجارت الکترونیکی، تنظیم شده‌اند؛ اگر با بخشی از آن‌ها موافق نیستید، لطفاً از خدمات سایت استفاده نکنید.',
    tocTitle: 'فهرست مطالب',
    contactTitle: 'ارتباط با ما',
    contactIntro: 'برای هر سوال یا ابهامی درباره‌ی این قوانین، از راه‌های زیر در خدمت شما هستیم:',
    contact: [
      { label: 'تلفن پشتیبانی', value: phoneDisplay, href: `tel:09132256121`, hint: 'همه‌روزه ۹ تا ۲۲  ' },
      { label: 'واتس‌اپ', value: 'گفتگوی مستقیم', href: whatsapp },
      { label: 'ایمیل', value: email, href: `mailto:${email}` },
      { label: 'اینستاگرام', value: '@' + SUPPORT_CONFIG.instagram.username, href: instagram },
      { label: 'تیکت پشتیبانی', value: 'از پنل کاربری', href: null, hint: 'سریع‌ترین راه برای پیگیری سفارش و مرجوعی' },
    ],
    sections: [
      {
        id: 'accept',
        title: 'پذیرش قوانین',
        paras: [
          'استفاده از سایت نورمهر، ایجاد حساب کاربری یا ثبت هر سفارشی، به معنای آگاهی و پذیرش کامل این قوانین و مقررات است. این توافق بین شما (کاربر) و فروشگاه نورمهر برقرار می‌شود و از لحظه‌ی اولین استفاده معتبر است.',
          'هر واژه‌ای در این صفحه مفهوم عام دارد؛ در موارد خاص، شرایط اعلام‌شده در صفحه‌ی محصول یا هنگام پرداخت، مکمل این قوانین است.',
        ],
      },
      {
        id: 'definitions',
        title: 'تعریف‌ها',
        paras: [],
        list: [
          '«فروشگاه» یا «نورمهر»: وب‌سایت nourmehr.ir و خدمات مرتبط با آن، که کالاهای دست‌ساز و صنایع‌دستی ایرانی عرضه می‌کند.',
          '«کاربر» یا «شما»: هر شخص حقیقی که از سایت بازدید، ثبت‌نام یا خرید می‌کند.',
          '«محصول»: هر کالای دست‌ساز ارائه‌شده در سایت؛ از جمله خاتم‌کاری، الماس‌تراش، فیروزه‌کوبی و قلم‌زنی.',
          '«پنل کاربری»: بخش اختصاصی شما برای مشاهده‌ی سفارش‌ها، لیست علاقه‌مندی، آدرس‌ها و تیکت‌های پشتیبانی.',
        ],
      },
      {
        id: 'account',
        title: 'حساب کاربری و اطلاعات شما',
        paras: [
          'برای خرید و استفاده از تمام امکانات سایت، ثبت‌نام با شماره موبایل لازم است. مسئولیت صحت و به‌روز بودن اطلاعات ثبت‌شده (نام، شماره تماس و آدرس) با شماست.',
          'حفظ امنیت رمز ورود و اطلاعات حساب بر عهده‌ی شماست و هر فعالیتی که با حساب شما انجام شود، به حساب شما می‌آید. اگر استفاده‌ی غیرمجاز از حساب خود را مشاهده کردید، بلافاصله به پشتیبانی اطلاع دهید.',
        ],
      },
      {
        id: 'products',
        title: 'محصولات و اصالت کالا',
        paras: [
          'همه‌ی محصولات نورمهر دست‌ساز و ساخت استادکاران ایرانی هستند و پیش از ارسال از نظر کیفیت و سلامت بررسی می‌شوند.',
          'ماهیت دست‌ساز یعنی هیچ دو قطعه‌ای کاملاً یکسان نیست؛ تفاوت‌های جزئی در رنگ، ابعاد، نقش و بافت، ویژگی طبیعی ساخت دست است و عیب محسوب نمی‌شود.',
          'رنگ و جزئیات محصول در تصاویر ممکن است بسته به تنظیمات صفحه‌نمایش شما تا حدی متفاوت دیده شود.',
        ],
      },
      {
        id: 'pricing',
        title: 'قیمت‌ها و پرداخت',
        paras: [
          'قیمت‌های درج‌شده به تومان است و هزینه‌ی ارسال جداگانه، در مرحله‌ی پرداخت بر اساس روش ارسال انتخابی محاسبه و نمایش داده می‌شود.',
          'پرداخت از طریق درگاه‌های پرداخت معتبر انجام می‌شود. گزینه‌های خرید اقساطی (ترب‌پی و اسنپ‌پی) در صورت واجد شرایط بودن مبلغ سفارش نمایش داده می‌شوند؛ شرایط اقساط، سقف اعتبار و تسویه‌ی آن‌ها تابع قوانین همان سرویس‌دهنده است و نورمهر فقط فروشنده‌ی کالاست.',
          'در صورت مشاهده‌ی خطای آشکار در قیمت‌گذاری یا موجودی، نورمهر حق دارد پیش از ارسال، سفارش را لغو و وجه را کامل بازگرداند و به‌سرعت شما را مطلع کند.',
        ],
      },
      {
        id: 'order',
        title: 'ثبت و تایید سفارش',
        paras: [
          'سفارش پس از پرداخت موفق وارد مرحله‌ی آماده‌سازی می‌شود و جزئیات و وضعیت آن در پنل کاربری شما قابل مشاهده است.',
          'در صورت ناموجود شدن کالا پس از ثبت سفارش، برای هماهنگی با شما تماس می‌گیریم؛ می‌توانید منتظر بمانید، محصول را جایگزین کنید یا سفارش را لغو و وجه را کامل پس بگیرید.',
          'دقت در ثبت شماره تماس و آدرس بسیار مهم است؛ خطای اطلاعات ثبت‌شده می‌تواند به تاخیر یا عدم تحویل منجر شود.',
        ],
      },
      {
        id: 'shipping',
        title: 'ارسال و تحویل',
        paras: [
          'روش‌های ارسال، هزینه و زمان تقریبی تحویل هنگام ثبت سفارش نمایش داده می‌شود؛ به‌طور معمول ارسال بین ۲ تا ۷ روز کاری، بسته به روش ارسال و مقصد، زمان می‌برد.',
          'برای برخی کالاهای دست‌ساز یا سفارشی، آماده‌سازی ممکن است زمان بیشتری لازم داشته باشد؛ در این موارد زمان تقریبی هنگام ثبت سفارش اعلام می‌شود.',
          'تاخیرهای ناشی از شرایط خارج از اراده‌ی ما (آب‌وهوای نامساعد، تعطیلات رسمی، اختلال در سرویس پستی) تخلف محسوب نمی‌شود؛ اما به‌محض اطلاع، وضعیت سفارش شما را به‌روز می‌کنیم.',
        ],
      },
      {
        id: 'returns',
        title: 'بازگشت کالا و مرجوعی',
        paras: [
          'مطابق ماده‌ی ۳۷ قانون تجارت الکترونیکی، تا ۷ روز پس از دریافت کالا می‌توانید درخواست مرجوعی ثبت کنید. شرایط را با دقت بخوانید:',
        ],
        list: [
          'کالا باید بدون استفاده و صدمه، با بسته‌بندی سالم و کامل (شامل جعبه و متعلقات) بازگردانده شود.',
          'کالاهای سفارشی‌سازی‌شده — مانند حکاکی نام یا ساخت سفارشی — مگر در صورت عیب یا خرابی، مشمول مرجوعی نیستند.',
          'پس از تایید و دریافت کالای مرجوعی، بازگشت وجه به همان روش پرداخت اولیه انجام می‌شود.',
          'ثبت درخواست از پنل کاربری (بخش تیکت‌ها) یا راه‌های ارتباطی ذکرشده در پایین همین صفحه انجام می‌شود.',
        ],
      },
      {
        id: 'ip',
        title: 'مالکیت معنوی',
        paras: [
          'تمام محتوای سایت — شامل متن‌ها، تصاویر محصولات، لوگو و طراحی صفحه‌ها — متعلق به نورمهر است و هرگونه بازنشر تجاری یا استفاده‌ی تبلیغاتی از آن‌ها بدون اجازه‌ی کتبی ممنوع است.',
          'اشتراک‌گذاری لینک صفحات برای استفاده‌ی شخصی و غیرتجاری آزاد است.',
        ],
      },
      {
        id: 'usage',
        title: 'استفاده‌ی مجاز از سایت',
        paras: ['کاربر متعهد می‌شود از سایت صرفاً در چارچوب قانون استفاده کند؛ از جمله:'],
        list: [
          'ثبت سفارش با اطلاعات واقعی و به نام خودتان.',
          'عدم تلاش برای نفوذ، اختلال یا دسترسی غیرمجاز به سرورها و اطلاعات دیگران.',
          'عدم سوءاستفاده از کدهای تخفیف و کمپین‌ها؛ در صورت شناسایی، نورمهر حق لغو سفارش یا تعلیق حساب را دارد.',
          'عدم استفاده از ابزارهای خودکار برای خرید انبوه یا رزرو موجودی.',
        ],
      },
      {
        id: 'third',
        title: 'سرویس‌های شخص ثالث',
        paras: [
          'درگاه‌های پرداخت، سرویس‌های خرید اقساطی، سرویس پیامک و شرکت‌های حمل‌ونقل، سرویس‌های مستقلی هستند و استفاده از آن‌ها مشمول شرایط و قوانین خودشان است.',
          'نورمهر برای پیشبرد سفارش شما، فقط حداقل اطلاعات لازم را در اختیار این سرویس‌ها قرار می‌دهد؛ جزئیات کامل در صفحه‌ی حریم خصوصی آمده است.',
        ],
      },
      {
        id: 'liability',
        title: 'محدودیت مسئولیت',
        paras: [
          'مسئولیت نورمهر در هر پرونده به حداکثر مبلغ همان سفارش محدود است.',
          'نورمهر نسبت به آسیب‌های ناشی از سوءاستفاده از کالا یا نگهداری نادرست محصولات دست‌ساز (مانند تماس با آب برای خاتم و فیروزه) مسئولیتی ندارد؛ راهنمای نگهداری هر محصول را هنگام خرید رعایت کنید.',
        ],
      },
      {
        id: 'suspension',
        title: 'تعلیق و لغو دسترسی',
        paras: [
          'در صورت تخلف از این قوانین یا فعالیت مشکوک و غیرعادی، نورمهر حق دارد بدون اطلاع قبلی، دسترسی حساب مربوط را موقتاً یا دائماً محدود کند.',
          'سفارش‌های ثبت‌شده و پرداخت‌های معتبرِ پیش از تعلیق، طبق روند عادی تسویه و ارسال می‌شوند.',
        ],
      },
      {
        id: 'changes',
        title: 'تغییرات قوانین',
        paras: [
          'نورمهر می‌تواند این قوانین را به‌روزرسانی کند؛ نسخه‌ی جدید از لحظه‌ی انتشار در همین صفحه معتبر است.',
          'تاریخ آخرین بازنگری در بالای همین صفحه به‌روز می‌شود؛ برای اطلاع از تغییرات، مرور دوره‌ای این صفحه توصیه می‌شود.',
        ],
      },
      {
        id: 'law',
        title: 'قانون حاکم و حل اختلاف',
        paras: [
          'این قوانین تابع قوانین جمهوری اسلامی ایران است.',
          'هرگونه اختلاف ابتدا از طریق پشتیبانی نورمهر و دوستانه بررسی می‌شود؛ در صورت عدم توافق، مرجع رسیدگی، مراجع رسمی صالح — از جمله مرجع تخصصی رسیدگی به شکایات تجارت الکترونیکی — خواهد بود.',
        ],
      },
    ],
  },
  en: {
    badge: 'Our Commitment to Transparency',
    title: 'Terms & Conditions',
    updated: 'Last updated: November 2026',
    intro: 'Welcome to Nourmehr — home of authentic Persian handicrafts. By using this website, creating an account, or placing an order, you acknowledge and accept the terms below. These terms are based on the laws of the Islamic Republic of Iran, including the E-Commerce Law. If you disagree with any part, please do not use our services.',
    tocTitle: 'Table of Contents',
    contactTitle: 'Contact Us',
    contactIntro: 'For any question about these terms, we are available through the following channels:',
    contact: [
      { label: 'Support Phone', value: phoneDisplay, href: `tel:09132256121`, hint: 'Daily 9:00–22:00 (Tehran time)' },
      { label: 'WhatsApp', value: 'Chat with us', href: whatsapp },
      { label: 'Email', value: email, href: `mailto:${email}` },
      { label: 'Instagram', value: '@' + SUPPORT_CONFIG.instagram.username, href: instagram },
      { label: 'Support Ticket', value: 'From your account panel', href: null, hint: 'Fastest way to track orders and returns' },
    ],
    sections: [
      {
        id: 'accept',
        title: 'Acceptance of Terms',
        paras: [
          'Using the Nourmehr website, creating an account, or placing any order means you have read, understood and accepted these Terms & Conditions. This agreement is between you (the user) and the Nourmehr store and takes effect from your first use.',
          'In specific cases, conditions stated on a product page or at checkout complement these terms.',
        ],
      },
      {
        id: 'definitions',
        title: 'Definitions',
        paras: [],
        list: [
          '“Store” or “Nourmehr”: the website nourmehr.ir and its related services, offering handmade Persian handicrafts.',
          '“User” or “You”: any person who visits, registers or shops on the site.',
          '“Product”: any handmade item offered on the site, including khatam-kari, diamond-cut (almass-tarash), turquoise inlay and engraving (ghalam-zani).',
          '“Account Panel”: your personal area for orders, wishlist, addresses and support tickets.',
        ],
      },
      {
        id: 'account',
        title: 'Account & Your Information',
        paras: [
          'Shopping and full access to site features require registration with a mobile number. You are responsible for the accuracy of the information you provide (name, contact number and address).',
          'Keeping your password and account secure is your responsibility, and any activity performed through your account is attributed to you. Report any unauthorized use to support immediately.',
        ],
      },
      {
        id: 'products',
        title: 'Products & Authenticity',
        paras: [
          'All Nourmehr products are handmade by Iranian master artisans and are checked for quality before shipping.',
          'Handcrafted nature means no two pieces are perfectly identical; slight variations in color, dimensions, pattern and texture are natural characteristics of handmade work and are not defects.',
          'Colors and details in photos may appear slightly different depending on your display settings.',
        ],
      },
      {
        id: 'pricing',
        title: 'Pricing & Payment',
        paras: [
          'All prices are in Toman (IRR). Shipping cost is calculated and displayed separately at checkout, based on the chosen shipping method.',
          'Payment is processed through certified payment gateways. Installment options (TorobPay and SnapPay) appear when your order amount qualifies; their credit terms and settlement rules are governed by those providers, while Nourmehr remains the seller of the goods.',
          'If an obvious pricing or stock error occurs, Nourmehr may cancel the order before shipping, refund the full amount and notify you promptly.',
        ],
      },
      {
        id: 'order',
        title: 'Orders & Confirmation',
        paras: [
          'After successful payment, the order enters the preparation stage; details and status are visible in your account panel.',
          'If an item becomes unavailable after ordering, we contact you to arrange waiting, a replacement, or cancellation with a full refund.',
          'Accurate contact details and address are essential; incorrect information may cause delays or failed delivery.',
        ],
      },
      {
        id: 'shipping',
        title: 'Shipping & Delivery',
        paras: [
          'Shipping methods, cost and estimated delivery time are shown at checkout; delivery usually takes 2–7 business days depending on the method and destination.',
          'Some handmade or custom items may require extra preparation time; in such cases the estimated time is announced at checkout.',
          'Delays caused by circumstances beyond our control (severe weather, public holidays, postal service disruptions) are not considered a breach; however, we keep your order status updated as soon as we are informed.',
        ],
      },
      {
        id: 'returns',
        title: 'Returns & Refunds',
        paras: [
          'In accordance with Article 37 of the Iranian E-Commerce Law, you may request a return within 7 days of receiving the item. Please read the conditions carefully:',
        ],
        list: [
          'The item must be unused and undamaged, returned in its complete and intact packaging (including the box and accessories).',
          'Custom-made items — such as name engraving or bespoke orders — are not returnable unless defective or damaged.',
          'After the return is approved and the item is received, the refund is issued through the original payment method.',
          'Return requests are submitted from your account panel (Tickets section) or via the contact channels listed at the bottom of this page.',
        ],
      },
      {
        id: 'ip',
        title: 'Intellectual Property',
        paras: [
          'All website content — texts, product photos, logos and page design — belongs to Nourmehr. Commercial republication or advertising use without written permission is prohibited.',
          'Sharing page links for personal, non-commercial use is free.',
        ],
      },
      {
        id: 'usage',
        title: 'Acceptable Use',
        paras: ['The user agrees to use the site only within the law, including:'],
        list: [
          'Placing orders with truthful information and in your own name.',
          'Not attempting to penetrate, disrupt or gain unauthorized access to servers or other users’ data.',
          'Not abusing discount codes and campaigns; if detected, Nourmehr may cancel the order or suspend the account.',
          'Not using automated tools for bulk buying or stock reservation.',
        ],
      },
      {
        id: 'third',
        title: 'Third-Party Services',
        paras: [
          'Payment gateways, installment providers, SMS services and carriers are independent services governed by their own terms.',
          'Nourmehr shares only the minimum information required to fulfill your order; full details are available on the Privacy Policy page.',
        ],
      },
      {
        id: 'liability',
        title: 'Limitation of Liability',
        paras: [
          'Nourmehr’s liability in any case is limited to the maximum amount of the relevant order.',
          'Nourmehr is not liable for damage caused by misuse of an item or improper care of handmade products (e.g., water contact with khatam or turquoise); please follow the care instructions provided with each purchase.',
        ],
      },
      {
        id: 'suspension',
        title: 'Suspension & Access Termination',
        paras: [
          'In case of violation of these terms or suspicious abnormal activity, Nourmehr may restrict access to the relevant account, temporarily or permanently, without prior notice.',
          'Orders placed and payments made before suspension are settled and shipped as usual.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to These Terms',
        paras: [
          'Nourmehr may update these terms; the new version is effective from the moment it is published on this page.',
          'The revision date at the top of this page is updated accordingly; we recommend reviewing this page periodically.',
        ],
      },
      {
        id: 'law',
        title: 'Governing Law & Disputes',
        paras: [
          'These terms are governed by the laws of the Islamic Republic of Iran.',
          'Any dispute is first resolved amicably through Nourmehr support; failing that, the competent official authorities — including the specialized E-Commerce dispute-resolution body — shall handle the case.',
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
    title: fa ? 'قوانین و مقررات | نورمهر' : 'Terms & Conditions | Nourmehr',
    description: fa
      ? 'قوانین و مقررات خرید از فروشگاه صنایع‌دستی دست‌ساز نورمهر: ثبت سفارش، پرداخت و خرید اقساطی، ارسال، مرجوعی ۷ روزه و حل اختلاف.'
      : 'Nourmehr handmade handicrafts store terms & conditions: orders, payment and installments, shipping, 7-day returns and dispute resolution.',
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
  .intro { text-align: start; }
  .legal-page { padding-inline: 14px; }
}
</style>
