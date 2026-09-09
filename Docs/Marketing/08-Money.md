# پول — واقعیت پرداخت، و چطور اصطکاکش را کم کنیم

---

## واقعیتی که باید صریح گفت

| | |
|---|---|
| Unity Asset Store | بسته — یونیتی ایران را [مسدود کرده](https://support.unity.com/hc/en-us/articles/205144693--Your-country-is-blocked-due-to-the-U-S-Government-restrictions-Why-am-I-receiving-this-error-message-when-trying-to-use-Unity-) |
| Gumroad / Paddle / Lemon Squeezy | همه استرایپ یا پی‌پال می‌خواهند |
| itch.io | تسویه با پی‌پال یا استرایپ |
| کارت بانکی مستقیم | درگاه بین‌المللی در دسترس نیست |
| **کریپتو (NOWPayments)** | **✅ کار می‌کند — و همین را داری** |

پس چک‌اوت کریپتویی‌ات یک انتخاب بد نیست. **تنها انتخاب موجود است.**
بقیه‌ی این فایل با پذیرش همین نوشته شده.

هرکس گفت «برو Gumroad بگذار»، مسیر تسویه‌اش را چک نکرده.

---

## اصطکاک، عددی

خریدارِ یک ابزار بیست‌دلاری تصمیم لحظه‌ای می‌گیرد. مسیر تو این است:

```
کیف پول داری؟ → USDT داری؟ → صرافی → خرید → برداشت → آدرس → تأیید شبکه
```

هر مرحله، بخشی از خریدارها را می‌ریزد. این را نمی‌شود صفر کرد.

**اما یک نتیجه‌ی مهم از همین دارد، و بیشتر آدم‌ها برعکسش را می‌کنند:**

> وقتی اصطکاک **ثابت** و بالا است، قیمت را پایین نیاور — بالا ببر.

کسی که حاضر شده کیف پول باز کند و USDT بخرد، همان زحمت را برای
۱۹.۹۹ و ۴۹.۹۹ کشیده. هزینه‌ی ذهنی‌اش یکی است. پس:

- **Pro را پیش‌فرض کن، نه Plus.** در جدول قیمت، Pro را وسط و برجسته بگذار
  با برچسب «Most popular». همین یک تغییر، میانگین سفارش را بالا می‌برد.
- **یک پله‌ی بالاتر اضافه کن.** `Studio — $149`: همان Pro، ولی برای یک
  تیم تا ۵ نفر. برای یک استودیو ۱۴۹ دلار پول خرد است، و کریپتو را
  **یک بار** انجام می‌دهند. این احتمالاً پرسودترین ردیف جدولت می‌شود.
- **Plus را حذف نکن** — به‌عنوان لنگر قیمتی لازم است. فقط دیگر ستاره نباشد.

> ⚠️ اضافه کردن یک تیر جدید یعنی `DOCSNAP.TIERS` در `Config.js`، منطق
> `Commerce/Orders.js` و ماتریس `DocSnapEditionMatrix` در پکیج یونیتی —
> که همان چیزی است که توکن لایسنس حمل می‌کند. کار کوچکی نیست، ولی
> تنها تغییری است در این پوشه که مستقیماً روی درآمد اثر می‌گذارد.

---

## پنج تغییر روی صفحه، بدون تغییر در چک‌اوت

### ۱. یک صفحه‌ی «تا حالا کریپتو نداده‌ای؟»

بزرگ‌ترین دلیل رها کردن، نادانی است نه بی‌میلی. یک صفحه‌ی کوتاه —
`/en/how-to-pay` — که دقیقاً می‌گوید چه اتفاقی می‌افتد:

```markdown
## Never paid with crypto before? It takes about six minutes.

1. Pick your tier and type your email. You get a pay page with a QR code
   and an amount.
2. That page accepts BTC, ETH, USDT, USDC, LTC and about 300 others.
   If you already hold any of them, you're done in a minute.
3. If you don't: any major exchange (Binance, Coinbase, Kraken, OKX) will
   sell you the exact amount and let you send it to that address. Buying
   and sending is one session — you don't need an account anywhere else.
4. Your key is emailed within five minutes of the network confirming.
   Usually seconds.

**The invoice stays open for 24 hours.** If funding your exchange account
takes an hour, nothing is lost — pay when you're ready and it still
delivers.

**Underpaid or overpaid?** Nothing is auto-delivered and nothing is lost.
Email amircollider@amircollider.com and it's sorted by hand.

**Nothing arrived?** Email the same address with your order id. Every order
is resumable — the key is minted and stored before the email is sent, so a
lost email is a re-send, not a lost purchase.
```

آن سه بند آخر مهم‌ترین‌اند: ترس اصلی خریدار کریپتو «پولم می‌رود و
چیزی نمی‌گیرم» است. سیستم تو **از قبل** این را حل کرده
(`Docs/Checkout.md`: هر مرحله resumable است) — ولی هیچ‌جا به خریدار
نگفته‌ای. گفتنش رایگان است.

### ۲. تضمین بازگشت وجه، صریح

```
14-day refund, in the same coin, no questions.
The whole exporter is free — so try it on your actual project first.
If the paid half doesn't earn its price, email me and I'll send it back.
```

تعداد کسانی که استفاده می‌کنند بسیار کم است. تعداد کسانی که به‌خاطرش
دکمه را می‌زنند، بسیار زیاد. و در مورد تو ریسکش از معمول هم کمتر است،
چون نسخه‌ی رایگان دقیقاً همان تست است.

### ۳. نسخه‌ی رایگان را قهرمان صفحه کن

الان صفحه با قیمت شروع می‌شود. باید با **رایگان** شروع شود:

```
The entire exporter is free. Every Scene, every Component, every
serialized field, the health report, search, three languages — on any
project, with no time limit and no account.

Install it, run it on your project, and decide afterwards.
```

هر کسی که رایگان نصب می‌کند، یک مخاطب است. هر کسی که با دیدن قیمت
صفحه را می‌بندد، هیچ‌کس است.

### ۴. زمان تحویل را نشان بده

`COMMERCE.DELIVERY_PROMISE_MINUTES = 5` را داری. کنار دکمه‌ی خرید بنویس:

```
🔑 Key emailed within 5 minutes. Usually seconds.
```

### ۵. تعداد سکه‌ها را بگو

«کریپتو» برای کسی که فقط بیت‌کوین می‌شناسد ترسناک است.
`Accepts 300+ coins — BTC, ETH, USDT, USDC, LTC and more` خیلی
دوستانه‌تر است، و راست هم هست.

---

## اگر روزی راه دیگری باز شد

اگر حضور قانونی خارج از ایران پیدا کردی — شرکت ثبت‌شده، اقامت، یا
همکاری رسمی با کسی که دارد — این‌ها باز می‌شوند و ارزش پیگیری دارند:

| مسیر | چه چیزی باز می‌شود |
|---|---|
| Unity Asset Store | بزرگ‌ترین موتور کشف، سهم ۷۰٪ |
| Gumroad / Lemon Squeezy / Paddle | پرداخت با کارت، خرید لحظه‌ای |
| itch.io با تسویه | فروش واقعی، نه فقط صفحه |

این تصمیم حقوقی و مالیاتی است، نه فنی، و باید با کسی که شرایط تو را
دقیق می‌داند مشورت کنی — نه با من و نه با یک راهنمای اینترنتی.
تا آن روز، بقیه‌ی این پوشه با فرض کریپتو نوشته شده و کامل کار می‌کند.

---

## انتظار واقع‌بینانه

اگر همه‌ی این پوشه را انجام دهی:

| بازه | نتیجه‌ی محتمل |
|---|---|
| ماه ۱ | ۱۰۰–۳۰۰ بازدید صفحه · ۱۰–۳۰ نصب رایگان · **۰ تا ۲ فروش** |
| ماه ۳ | ۵۰۰–۱۵۰۰ بازدید · ۱۰۰+ نصب · **۳ تا ۱۰ فروش** |
| ماه ۶ | با یک پوشش یوتیوبی: چند برابر. بدون آن: رشد خطی |

عددها کوچک‌اند و باید باشند. ابزار توسعه‌دهنده این‌طور رشد می‌کند:
کند، بعد یک‌دفعه، وقتی یک نفرِ درست پیدایش می‌کند.

**معیار درست برای سه ماه اول، فروش نیست — تعداد نصب رایگان است.**
نصب رایگان یعنی محصول به دست آدم رسیده. فروش، بعداً از همان جمعیت
درمی‌آید. اگر ماه سوم صد نصب داری و دو فروش، مسیر درست است. اگر ده
نصب داری و دو فروش، مشکل هنوز همان کشف است، نه چک‌اوت.
