/**
 * ⚙️ تنظیمات دکمه شناور پشتیبانی
 * برای تغییر شماره‌ها فقط همین فایل را ویرایش کنید
 */
export const SUPPORT_CONFIG = {
  phone: {
    display: '0913 224 9808',       // برای نمایش به کاربر
    international: '+989132249808', // برای لینک tel:
  },
  whatsapp: {
    number: '989132256121',         // ⚠️ بدون + و بدون صفر ابتدای
    defaultMessage: 'سلام، از سایت نورمهر می‌آیم و سوال دارم',
  },
  instagram: {
    username: 'nourmehr_handicrafts',           // ⚠️ آیدی واقعی اینستاگرام خودت را اینجا بگذار
  },
  email: {
    address: 'a.noormehr@gmail.com',
    subject: 'پیام از سایت نورمهر',
  },
  workingHours: {
    startHour: 9,
    endHour: 22,
    offDays: [5],                   // 5 = جمعه (شنبه=6، یکشنبه=0 ... جمعه=5)
    timezone: 'Asia/Tehran',
  },
}