# کانال‌ها — کجا باشیم، و به چه ترتیبی

مرتب‌شده بر اساس بازده به‌ازای ساعت کار. اینستاگرام آخر است، نه چون بد
است، چون بازده‌اش برای *این* محصول کمترین است.

---

## یوتیوب

**بازده: بالاترین. کار لازم: کمترین، چون ویدیوها آماده‌اند.**

یوتیوب برای ناشرهای ابزار یونیتی
[۳۰ تا ۵۰ درصد کل ترافیک](https://generalistprogrammer.com/tutorials/unity-asset-store-selling-guide-revenue)
را می‌سازد. و برخلاف اینستاگرام، یک **موتور جستجو** است: ویدیوی امروز،
سه سال دیگر هم بازدید می‌آورد.

### راه‌اندازی

- **نام کانال:** `AmirCollider`
- **دستگیره:** `@amircollider`
- **بنر:** `Unity tools that save you a day` + آدرس سایت
- **بخش About:** پاراگراف معرفی از [`02-Positioning.md`](02-Positioning.md)
- **لینک‌ها:** سایت، گیت‌هاب، اینستاگرام

### چه چیزی آپلود کن — به این ترتیب

**۱. ده کلیپ انگلیسی، بدون هیچ تدوینی، به‌عنوان ویدیوی معمولی.**

عنوان‌ها — کپی کن:

| فایل | عنوان یوتیوب |
|---|---|
| 01 | `Give Claude your entire Unity project in one file — Unity DocSnap` |
| 02 | `See exactly what changed in your Unity project since last week` |
| 03 | `Search every GameObject and Component without opening Unity` |
| 04 | `Archive a whole Unity project — every Scene, Component and field` |
| 05 | `Read a Unity project on a computer with no Unity installed` |
| 06 | `Share your Unity project with artists and producers — no install` |
| 07 | `Browse your Unity Hierarchy and Inspector in a browser tab` |
| 08 | `Find out why your Unity build got so big — every import setting` |
| 09 | `Keep snapshots of your Unity project and diff any two` |
| 10 | `Dark mode and three languages in an exported Unity project site` |

توضیح مشترک هر ویدیو:

```
Unity DocSnap exports your whole Unity project — every Scene, every
Component, every serialized field — into an offline HTML site and a single
ai-bundle.md you can paste into Claude, Cursor or Copilot.

The entire exporter is free, with no time limit.

⬇️ Install (Unity 2021.3+)
Window ▸ Package Manager ▸ + ▸ Add package from git URL:
https://github.com/AmirCollider/UnityDocSnap.git

🔗 Links
Product page: https://amircollider.com/en/unity-docsnap
GitHub:       https://github.com/AmirCollider/UnityDocSnap
Free RTL text tool: https://github.com/AmirCollider/UnityDirectTMP

Editor-only: zero runtime cost, zero build size, zero dependencies.

#unity #unity3d #gamedev #unitytips #ai
```

**۲. یک ویدیوی بلند: هر ده کلیپ پشت سر هم.** ۲ دقیقه و ۲۶ ثانیه.
عنوان: `Unity DocSnap in 2 minutes — your whole project, documented and AI-ready`
این ویدیوی «پین‌شده»ی کانال است و همان است که در ایمیل‌ها لینک می‌دهی.

**۳. همان ده کلیپ به‌صورت Shorts** — بعد از این‌که نسخه‌ی عمودی
ساختی ([`05-Reels.md`](05-Reels.md)).

**۴. نسخه‌های فارسی و ژاپنی** به‌صورت ویدیوهای جدا با عنوان همان زبان.
رقابت در آن دو زبان تقریباً صفر است.

### یک ویدیو که ارزش ساختن دارد

وقتی این‌ها را گذاشتی، **یک** ویدیوی جدید بساز — حتی اگر بی‌کیفیت باشد:

```
عنوان: I gave Claude my entire Unity project. Here's what happened.
طول:   ۵ تا ۸ دقیقه
```

فقط صفحه‌ات را ضبط کن: export بزن، `ai-bundle.md` را در Claude پیست کن،
سه سؤال واقعی بپرس که بدون context جوابشان را بلد نیست. جواب‌ها را
نشان بده.

این ویدیو نه تبلیغ است نه آموزش — یک آزمایش است، و آزمایش‌ها را
مردم می‌بینند. عنوانش هم دقیقاً چیزی است که مردم سرچ می‌کنند.

---

## گیت‌هاب

**بازده: بالا. کار: پانزده دقیقه.** کامل در [`03-QuickWins.md`](03-QuickWins.md).

خلاصه: description و topics هر سه ریپو خالی است، پس ریپوها در جستجوی
گیت‌هاب و در صفحه‌های `github.com/topics/…` **وجود ندارند**.

---

## انجمن رسمی یونیتی

**بازده: بالا. کار: نیم ساعت. رایگان و ماندگار.**

جای درست: **Unity Discussions ▸ Community Showcases**
([این‌جا](https://discussions.unity.com/)). این بخشی است که یونیتی
خودش برای معرفی ابزار تعیین کرده، و تِرِدهایش در گوگل ایندکس می‌شوند —
یعنی یک بار می‌نویسی و سال‌ها در نتایج جستجو می‌ماند.

**عنوان تِرِد:**
```
[Released] Unity DocSnap — export your whole project to an offline site + one file your AI can read (free core)
```

**پست اول:**

````markdown
Hi all,

I kept hitting the same wall: explaining my Unity project to an AI. Paste a
script. Paste another. Screenshot the Inspector. Describe the Scene in words.
By the time there was enough context, the conversation had moved on.

So I built **Unity DocSnap**. It walks every Scene (full hierarchy, every
Component, every serialized field, every reference) and every Asset folder
(import settings, Material shader properties, Prefab contents, script metadata)
and writes two things:

**1. An offline HTML site** — Simple/Advanced view toggle, full-text search,
a packages page, and a project health report listing every missing script and
broken reference with the exact object path and the field holding it (yours
separated from the packages').

**2. `ai-bundle.md`** — the same project, summarised, as one file you paste
into Claude, Cursor or Copilot.

**Free, no time limit, any project:** the entire exporter. Every Scene, every
Component, every serialized field, the health report, the packages page,
search, both skins, all three languages (English, Japanese, Persian — RTL
included).

**Paid, one-off:** Plus ($19.99) adds the AI summaries and a Changes page that
diffs two exports. Pro ($49.99) adds unlimited version history, incremental
updates, verbatim file copies, .unitypackage backups, CI automation and a
custom logo.

**Editor-only.** Zero runtime cost, zero added build size, zero third-party
dependencies. Unity 2021.3+.

**Install** — Window ▸ Package Manager ▸ + ▸ Add package from git URL:
```
https://github.com/AmirCollider/UnityDocSnap.git
```

- GitHub: https://github.com/AmirCollider/UnityDocSnap
- Product page and 10 short demo clips: https://amircollider.com/en/unity-docsnap

One note on how it relates to the MCP servers people are using: MCP needs Unity
open and running. This gives you a file — it works offline, in any tool, on a
machine that has never had Unity installed, and it still reads the same six
months from now. I use both.

Happy to answer anything, and genuinely interested in what breaks on projects
bigger than mine.
````

**بعدش:** هر بار نسخه‌ی جدید دادی، یک ریپلای بگذار. تِرِدی که به‌روز
می‌شود، بالا می‌ماند.

یک تِرِد جدا هم برای **DirectTMP** بزن — همان قالب.

---

## OpenUPM

**فقط برای DirectTMP.** [OpenUPM](https://openupm.com/docs/adding-upm-package.html)
یک رجیستری پکیج یونیتی است که فقط **متن‌باز** می‌پذیرد. DocSnap بعد از
بسته‌شدن سورس واجد شرایط نیست؛ DirectTMP هست (MIT).

چرا ارزشش را دارد:
- صفحه‌ی پکیج در openupm.com، ایندکس‌شده در گوگل
- شمارنده‌ی دانلود عمومی — یعنی اثبات اجتماعی رایگان
- نصب با یک دستور، بدون گیت URL
- برای همیشه، بدون نگه‌داری

روش: در ریپوی `openupm/openupm` یک Pull Request بزن که فایل YAML پکیجت
را اضافه کند. پایپلاین خودش تگ‌های گیت را می‌بیند و نسخه‌ها را منتشر می‌کند.
یک بار، حدود یک ساعت.

و در README خودِ DirectTMP، یک بخش «Also from AmirCollider» بگذار که به
DocSnap لینک بدهد. **این کل نکته‌ی این کار است:** DirectTMP رایگان و
متن‌باز، آدم‌ها را می‌آورد؛ آن بخش، بخشی از آن‌ها را به محصول پولی می‌رساند.

---

## itch.io

**بازده: متوسط. کار: یک ساعت.**

itch.io ابزار هم می‌پذیرد، نه فقط بازی. صفحه‌اش در گوگل ایندکس می‌شود و
جامعه‌ی indie آن‌جاست.

- محصول را **رایگان** بگذار با دکمه‌ی «Donate»، و در توضیح به چک‌اوت
  خودت برای Plus/Pro لینک بده
- تسویه‌ی itch.io برای تو کار نمی‌کند (پی‌پال/استرایپ می‌خواهد)، پس
  اصلاً روی آن حساب نکن — itch.io این‌جا یک **صفحه‌ی ایندکس‌شده** است،
  نه یک فروشگاه
- تگ‌ها: `unity`, `tool`, `gamedev`, `documentation`, `ai`

---

## Product Hunt

**بازده: یک شلیک. فقط وقتی بقیه آماده است.**

Product Hunt یک بار جواب می‌دهد و اگر روز بدی انتخاب کنی، هدر می‌رود.
شرط‌ها قبل از عرضه:

```
[ ] یوتیوب با ده ویدیو ✅
[ ] گیت‌هاب با description، topics و Release ✅
[ ] تِرِد Unity Discussions ✅
[ ] صفحه‌ی محصول با تیتر جدید ✅
[ ] دست‌کم ۵ ستاره روی گیت‌هاب
```

بعد: **سه‌شنبه یا چهارشنبه، ۰۰:۰۱ به وقت اقیانوس آرام (PT).**

- تیتر: `Unity DocSnap — your whole Unity project in one file your AI can read`
- تگ‌لاین: `Every Scene, Component and field → one ai-bundle.md + an offline site`
- اولین کامنت را خودت بگذار: داستان اینکه چرا ساختی‌اش

---

## Hacker News

**بازده: نامعلوم و پرنوسان. کار: یک ساعت. هزینه: صفر.**

`Show HN` را فقط **یک بار** می‌شود زد. عنوان مهم‌ترین چیز است:

```
Show HN: I export Unity projects to one Markdown file so my AI can read them
```

نه «معرفی محصول». HN تبلیغ را بو می‌کشد. متن پست: مشکل، اینکه چطور
حلش کردی، چه چیزی سخت بود، لینک آخر.

بهترین زاویه برای HN اصلاً یونیتی نیست — **مسئله‌ی مهندسی** است:

> «چطور یک پروژه‌ی ۲ گیگابایتی را در ۲۰۰ کیلوبایت خلاصه کنیم که یک LLM
> بتواند بخواندش؟ قانونی که برایش نوشتم این بود که فیلد را ملاک بگیرم
> نه نوع کامپوننت را — و دلیلش این است که…»

آن بخش از CHANGELOG ۱.۰.۳ که درباره‌ی متن نوشته‌ای، دقیقاً همین جنس
نوشته است. HN همین را دوست دارد.

---

## توییتر / X

**بازده: کم در ابتدا، رشدکننده. کار: کم.**

گفتی فایده ندارد و در ابتدا راست است. ولی اکانت را نگه دار و کار درست
را بکن:

- ننویس «محصولم را ببینید». **کار روزانه** را بنویس — باگی که پیدا کردی،
  تصمیمی که گرفتی، یک قبل/بعد
- به کسانی که درباره‌ی Unity + AI توییت می‌زنند، **جواب مفید** بده
  بدون لینک محصول. لینک در بیو کافی است
- هفته‌ای یک تِرِد فنی. همان محتوای ستون C اینستاگرام

توییتر وقتی شروع به کار می‌کند که چیزی برای لینک‌دادن داشته باشی —
یعنی بعد از یوتیوب و گیت‌هاب. تا آن موقع، آتش‌به‌اختیار.

---

## اینستاگرام

آخر فهرست، عمداً. کامل در [`04-Instagram.md`](04-Instagram.md).

خلاصه‌ی صادقانه: برای برند و برای بازار فارسی خوب است، برای فروش
مستقیم این محصول ضعیف. ولی چون هر ریلزی که برایش می‌سازی مستقیماً در
YouTube Shorts هم می‌رود، کار هدر نمی‌رود.

---

## ترتیب کلی

```
هفته ۱   گیت‌هاب (توضیح، تاپیک، ریلیز)  ·  یوتیوب (ده کلیپ خام)
هفته ۲   Unity Discussions  ·  خبرنامه‌ها  ·  اینستاگرام راه بیفتد
هفته ۳   DirectTMP → OpenUPM  ·  دیسکوردها  ·  ریلزها شروع شود
هفته ۴   ایمیل به یوتیوبرها  ·  itch.io
ماه ۲    ویدیوی «I gave Claude my Unity project»  ·  Show HN
ماه ۳    Product Hunt  ·  اولین پست ردیت
```
