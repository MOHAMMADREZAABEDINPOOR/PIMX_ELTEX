<div align="center">

<img src="assets/readme/hero.gif" width="1200" alt="PIMX ELTEX: a publishing studio with an episode reel and code slate" />

**[English](README.md) · [فارسی](README.fa.md)**

</div>

<div dir="rtl">

# 🎬 PIMX ELTEX

<!-- pimx-live-site:start -->
## وب‌سایت آنلاین

**[مشاهدهٔ PIMX_ELTEX ↗](https://pimxeltex.pages.dev/)**

[نسخهٔ Cloudflare Workers ↗](https://pimx-eltex.mohammadrezaabedinpoor6.workers.dev/)
<!-- pimx-live-site:end -->

پلتفرم Next.js برای انتشار قسمت‌های ساخت پروژه با هوش مصنوعی، منابع کد و پیش‌نمایش، همراه حساب اعضا، نظرات و پنل مدیریت.

[GitHub](https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_ELTEX) · [PIMX / Profile](https://github.com/MOHAMMADREZAABEDINPOOR) · [بنر ثابت](assets/readme/hero.png)

| نمای کلی | جزئیات |
|:---|:---|
| 🎬 تجربه | برنامه وب / تجربه مرورگری |
| 🧰 فناوری | `React` · `Next.js` · `TypeScript` · `Framer Motion` |
| 🌐 زبان راهنما | [English](README.md) · [فارسی](README.fa.md) |

[✨ امکانات](#امکانات) · [🚀 شروع کار](#شروع-کار) · [⚙️ تنظیمات](#تنظیمات) · [🌍 استقرار](#استقرار)

📖 [راهنمای تفصیلی پروژه](docs/PROJECT_GUIDE.md)

---

<a id="امکانات"></a>

## ✨ امکانات

| بخش | قابلیت موجود |
|:---|:---|
| ⚡ روند کار | صفحات قسمت‌ها، کتابخانه کد و محتوای همراه |
| 👤 حساب‌ها | ورود اعضا، پروفایل و کنترل نشست |
| 👤 حساب‌ها | نظرات، واکنش و مدیریت محتوا |
| 🔌 اتصال | مایگریشن Drizzle/D1، ابزار ایمیل و استقرار Cloudflare |

<a id="پشته-فنی"></a>

## 🧰 پشته فنی

| ابزار | نسخه یا منبع |
|---|---|
| React | `19.2.8` |
| Next.js | `16.3.5` |
| TypeScript | `^5` |
| Framer Motion | `^13.2.0` |
| Tailwind CSS | `^4` |

<a id="شروع-کار"></a>

## 🚀 شروع کار

Node.js 22.12 یا بالاتر و مدیر پکیج مشخص‌شده در package.json. نسخه وابستگی‌ها را مطابق فایل قفل نصب کنید.

<div dir="ltr">

```bash
git clone https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_ELTEX.git
cd PIMX_ELTEX

npm ci
npm run dev
```

</div>

<a id="تنظیمات"></a>

## ⚙️ تنظیمات

کلیدهای زیر از فایل نمونه یا کد استخراج شده‌اند؛ همه الزاماً اجباری نیستند. مقدار و پیش‌فرض را در همان فایل بررسی و اسرار را فقط در محیط محلی یا هاست تنظیم کنید.

| نام | کاربرد |
|---|---|
| `AUTH_SECRET` | اعتبارنامه یا اتصال؛ خصوصی نگه دارید |
| `NEXT_DIST_DIR` | تنظیم برنامه؛ تعریف را در منبع بررسی کنید |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | تنظیم عمومی مرورگر؛ برای اسرار مناسب نیست |
| `NEXT_PUBLIC_CONTACT_EMAIL` | تنظیم عمومی مرورگر؛ برای اسرار مناسب نیست |
| `NEXT_PUBLIC_PRIVACY_EMAIL` | تنظیم عمومی مرورگر؛ برای اسرار مناسب نیست |
| `NEXT_PUBLIC_SITE_URL` | تنظیم عمومی مرورگر؛ برای اسرار مناسب نیست |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | تنظیم عمومی مرورگر؛ برای اسرار مناسب نیست |
| `NEXT_PUBLIC_YOUTUBE_URL` | تنظیم عمومی مرورگر؛ برای اسرار مناسب نیست |
| `PIMX_STATIC_BUILD` | تنظیم برنامه؛ تعریف را در منبع بررسی کنید |
| `SMTP_APP_PASSWORD` | اعتبارنامه یا اتصال؛ خصوصی نگه دارید |
| `SMTP_USER` | تنظیم برنامه؛ تعریف را در منبع بررسی کنید |
| `TURNSTILE_SECRET_KEY` | اعتبارنامه یا اتصال؛ خصوصی نگه دارید |

اتصال‌های میزبانی: `ASSETS`, `BACKEND`, `DB`.

<a id="استفاده"></a>

## 🎯 استفاده

تنظیم عمومی را از `.env.example` و اسرار Worker را از `.dev.vars.example` آماده کنید. دیتابیس محلی D1 را با `npm run db:setup:local` بسازید؛ برای جریان‌های وابسته به اتصال، پیش‌نمایش Cloudflare را اجرا کنید.

<a id="ساختار-پروژه"></a>

## 🗂️ ساختار پروژه

| مسیر | نقش |
|---|---|
| [`assets/`](assets/) | فایل برند، رسانه و README |
| [`docs/`](docs/) | راهنمای تکمیلی |
| [`drizzle/`](drizzle/) | مایگریشن دیتابیس |
| [`public/`](public/) | فایل عمومی وب |
| [`scripts/`](scripts/) | ابزار توسعه و نگهداری |
| [`src/`](src/) | کد برنامه |
| [`package.json`](package.json) | فایل ورودی یا تنظیم پروژه |
| [`tsconfig.json`](tsconfig.json) | فایل ورودی یا تنظیم پروژه |
| [`wrangler.toml`](wrangler.toml) | فایل ورودی یا تنظیم پروژه |
| [`wrangler.worker.toml`](wrangler.worker.toml) | فایل ورودی یا تنظیم پروژه |

<a id="فرمان‌ها-و-بررسی"></a>

## 🧪 فرمان‌ها و بررسی

| فرمان | کاربرد |
|:---|:---|
| `npm run dev` | 🧑‍💻 سرور توسعه |
| `npm run build` | 📦 ساخت نسخه انتشار |
| `npm run start` | ▶️ سرور برنامه |
| `npm run lint` | 🧹 بررسی سبک کد |
| `npm run typecheck` | 🔧 typecheck |
| `npm run preview` | 👀 پیش‌نمایش خروجی |
| `npm run pages:build` | 🔧 pages:build |

<div dir="ltr">

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run security:secrets
npm run preview
npm run pages:build
npm run db:setup:local
```

</div>

این‌ها فرمان‌های موجود در package.json هستند؛ فهرست بالا گزارش اجرای آزمون نیست. فرمان تست ممکن است مرورگر، سرویس یا دیتابیس آماده بخواهد.

<a id="استقرار"></a>

## 🌍 استقرار

برای مسیر Node از build و start و برای Cloudflare از اسکریپت‌های مخصوص package.json و اتصال‌های خودتان استفاده کنید. دیتابیس و اسرار باید جدا تنظیم شوند؛ راهنمای تکمیلی مخزن را بخوانید.

<a id="محدودیت‌ها"></a>

## 📌 محدودیت‌ها

حالت توسعه Next.js همه اتصال‌های Cloudflare را بازسازی نمی‌کند. ایمیل و ورود به اسرار محیط نیاز دارند. اسکریپت انتشار محتوا و مایگریشن remote روی منابع بیرونی می‌نویسند.

<a id="رفع-مشکل"></a>

## 🛠️ رفع مشکل

- پکیج غایب: وابستگی را با مدیر پکیج پروژه نصب کنید.
- خطای API یا شبکه: آدرس، سرویس و اتصال میزبانی را بررسی کنید.
- فایل قدیمی: در صورت وجود اسکریپت ساخت، build و کش مرورگر را تازه کنید.

<a id="مشارکت"></a>

## 🤝 مشارکت

برای تغییر، شاخه مستقل بسازید، رفتار فعلی را بررسی کنید و توضیح روشن همراه تغییر بفرستید. اطلاعات خصوصی، خروجی build و دیتابیس محلی را commit نکنید.

<a id="مجوز"></a>

## 📄 مجوز

فایل مجوز در این نسخه موجود نیست. نمایش عمومی کد به‌تنهایی مجوز استفاده مجدد نیست؛ برای شرایط استفاده با مالک مخزن هماهنگ کنید.

---

ساخته‌شده در مجموعه **PIMX** · مستندات فارسی و انگلیسی.

---

<div align="center">

🎬 **PIMX ELTEX** · [English](README.md) · [فارسی](README.fa.md)

</div>

</div>
