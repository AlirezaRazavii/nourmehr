# راهنمای سریع شروع - پروژه نورمهر

## نصب و اجرا (ترتیب مهم است)

### ۱. نصب وابستگی‌ها (یک بار)

```bash
# ریشه پروژه
npm install

# بک‌اند
cd backend
npm install
cd ..
```

### ۲. تنظیم env (یک بار)

- در پوشه `backend` فایل `.env` وجود دارد؛ اگر نبود از `backend/.env.example` کپی کن و همهٔ متغیرها را در صورت نیاز پر کن.
- در ریشه، فایل `.env.development` برای فرانت؛ اگر نبود از `.env.development.example` کپی کن.
- **لیست کامل همهٔ متغیرهای محیط:** فایل `ENV_REFERENCE.md` در ریشهٔ پروژه.

### ۲.۱ دیتابیس MongoDB (الزامی برای لاگین و API)

بدون دیتابیس، سرور بالا می‌آید ولی لاگین و درخواست‌های API خطای **۵۰۰** یا **۵۰۳** می‌دهند. یکی از این دو را انجام بده:

**الف) MongoDB Atlas (رایگان، بدون نصب روی ویندوز)**

1. برو به [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) و یک حساب رایگان بساز.
2. یک Cluster رایگان (M0) بساز و یک کاربر دیتابیس (مثلاً `nourmehr` با رمز قوی) تعریف کن.
3. در Network Access یک آی‌پی `0.0.0.0/0` اضافه کن (برای توسعه).
4. روی **Connect** کلیک کن و **Connect your application** را بزن؛ آدرس شبیه این می‌گیری:
   `mongodb+srv://nourmehr:PASSWORD@cluster0.xxxxx.mongodb.net/nourmehr?retryWrites=true&w=majority`
5. در پوشه `backend` داخل فایل `.env` مقدار `MONGODB_URI` را با همین آدرس عوض کن و پسورد را جایگزین کن.

**ب) MongoDB نصب شده روی ویندوز**

- اگر MongoDB را نصب کرده‌ای، سرویس را اجرا کن (مثلاً از Services یا `net start MongoDB`).
- در `.env` می‌توانی همان `MONGODB_URI=mongodb://localhost:27017/nourmehr` را نگه داری.

### ۳. اجرای بک‌اند (ترمینال اول)

```bash
cd backend
npm run seed   # فقط اولین بار - ساخت ادمین و داده‌های اولیه
npm run dev    # سرور روی http://localhost:5000
```

باید در ترمینال ببینی: `MongoDB connected` و `Backend server listening on http://localhost:5000`.

اگر هنوز `MongoDB connection error` یا `ECONNREFUSED` می‌بینی، مرحله **۲.۱** را انجام بده (مثلاً با MongoDB Atlas).

### ۴. اجرای فرانت (ترمینال دوم)

```bash
# در ریشه پروژه
npm run dev
```

صفحه روی `http://localhost:5173` باز می‌شود. درخواست‌های `/api` از همین آدرس به پورت 5000 فرستاده می‌شوند (پروکسی Vite).

**اطلاعات ورود ادمین پیش‌فرض:**
- ایمیل: `admin@example.com`
- رمز: `Admin123!`

---

## تنظیمات پیشرفته

برای تنظیم **پنل پیامکی، زرین‌پال، SMTP و Google OAuth**، فایل `backend/SETUP_GUIDE.md` را بخوان.

**جداول دیتابیس و چک‌لیست کامل راه‌اندازی:** فایل `backend/DATABASE_AND_SETUP.md` را باز کن؛ همه کالکشن‌ها (users, products, orders و ...)، فیلدها، ایندکس‌ها و لیست APIها و کارهایی که باید خودت انجام بدهی آنجا نوشته شده.

**دایرهٔ پشتیبانی (ویجت چت هوشمند):** برای وصل کردن ویجت به هوش مصنوعی، `backend/SUPPORT_AI_WIDGET.md` را بخوان؛ APIهای `/api/support/ai/status`، `/api/support/ai/chat` و `/api/support/ai/history/:sessionId` و جریان پیشنهادی فرانت آنجا توضیح داده شده.

---

## تست سریع

1. برو به `http://localhost:5173/login`
2. با `admin@example.com / Admin123!` وارد شو → باید بروی `/admin/dashboard`
3. یک کاربر جدید ثبت‌نام کن → باید بروی `/user/dashboard`

---

## رفع مشکل "Failed to fetch"

اگر این خطا را دیدی:

1. مطمئن شو بک‌اند روی پورت 5000 در حال اجرا است.
2. چک کن که در `.env.development` مقدار `VITE_API_BASE_URL` خالی باشد تا از پروکسی Vite استفاده شود (یا `http://localhost:5000`).
3. بک‌اند را ری‌استارت کن.

اگر باز هم مشکل داشتی، لاگ‌های ترمینال بک‌اند را چک کن.

---

## رفع خطای ۵۰۰ (Internal Server Error) یا ۵۰۳ در لاگین

اگر در F12 یا ترمینال خطای **۵۰۰** یا **۵۰۳** یا **MongoDB connection error: ECONNREFUSED** می‌بینی:

- یعنی **دیتابیس وصل نیست**. سرور بدون MongoDB بالا می‌آید ولی هر درخواست لاگین/ثبت‌نام بعد از چند ثانیه خطا می‌دهد.
- **راه‌حل:** مرحله **۲.۱** بالا را انجام بده (MongoDB Atlas یا اجرای MongoDB محلی)، سپس در `backend` دوباره `npm run seed` و `npm run dev` بزن و لاگین را تست کن.
