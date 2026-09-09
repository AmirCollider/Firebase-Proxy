# کارهای فوری — کپی-پیست، زیر دو ساعت، رایگان

هیچ‌کدام از این‌ها فکر کردن نمی‌خواهد. متن آماده است، فقط بچسبان و ذخیره کن.

---

## ۱. گیت‌هاب — مهم‌ترین کار این پوشه

هر سه ریپو **توضیح خالی و صفر تاپیک** دارند. تا وقتی این‌طور است، ریپوها
در جستجوی گیت‌هاب و در صفحه‌های `github.com/topics/…` وجود ندارند.

**کجا:** صفحه‌ی ریپو ← گوشه‌ی بالا-راست، کنار «About» ← آیکن چرخ‌دنده ⚙️

### UnityDocSnap

Description — دقیقاً این:
```
Export your whole Unity project to one ai-bundle.md for Claude, Cursor and Copilot — plus an offline HTML site with every Scene, Component, serialized field and a project health report. Editor-only, free core.
```

Website:
```
https://amircollider.com/en/unity-docsnap
```

Topics — یکی‌یکی وارد کن (گیت‌هاب تا ۲۰ تا می‌پذیرد):
```
unity  unity3d  unity-editor  unity-editor-tool  unity-package  upm
documentation  documentation-generator  ai  llm  claude  cursor
github-copilot  markdown  gamedev  csharp  offline  static-site
developer-tools  productivity
```

تیک این‌ها را هم بزن: ✅ Releases ✅ Packages — و **Sponsorships** را اگر
هست خاموش بگذار (لینک اسپانسر بدون محتوا بدتر از نبودنش است).

### UnityDirectTMP

Description:
```
Point TextMeshPro at a .ttf and it just works — no font asset to build, no character set to choose. Correct Persian, Arabic and Urdu shaping straight from the font's own OpenType tables. MIT, free.
```

Website:
```
https://amircollider.com/en/unity-directtmp
```

Topics:
```
unity  unity3d  textmeshpro  tmp  unity-package  upm  fonts  opentype
text-shaping  arabic  persian  farsi  urdu  rtl  localization  i18n
unity-editor  gamedev  csharp  mit-license
```

### AmirCollider

Description:
```
Source of amircollider.com — one Cloudflare Worker serving the site, per-game landing/store/leaderboard pages, the game API, a mailbox and the Unity DocSnap crypto checkout. Plain ES modules, no build step, no dependencies.
```

Website:
```
https://amircollider.com
```

Topics:
```
cloudflare-workers  cloudflare  d1  r2  serverless  javascript
es-modules  no-build  server-side-rendering  unity  game-backend
oauth  i18n  rtl  seo
```

---

## ۲. تصویر پیش‌نمایش اجتماعی (Social preview)

**کجا:** Settings ← Social preview ← Upload

بدون این، هر بار که لینک ریپو را در توییتر، دیسکورد، تلگرام یا هرجای دیگر
می‌فرستی، یک مستطیل خاکستری با متن ریز نشان داده می‌شود. با این، یک بنر
تمام‌عرض.

اندازه: **۱۲۸۰ × ۶۴۰ پیکسل**. روی آن فقط این باشد:

```
لوگو + اسم محصول
یک خط: Your AI has never seen your Unity project.
amircollider.com
```

فایل `Docs~/logo.png` را داری. اگر ابزار طراحی نداری، `Pages/Icon.js` سایت
خودت SVG می‌سازد — یک اسکرین‌شات از آن در همان نسبت کافی است.

---

## ۳. ریلیز بساز

ریپوی تو تگ دارد ولی صفحه‌ی Releases خالی است. Releases:

- در فید «Explore» گیت‌هاب برای دنبال‌کننده‌ها ظاهر می‌شود
- به ریپو یک تاریخ «تازه» می‌دهد که در مرتب‌سازی جستجو اثر دارد
- به آدم اجازه می‌دهد Watch ▸ Releases only بزند — یعنی لیست مخاطب

**کجا:** Releases ← Draft a new release ← تگ `v1.0.3`

عنوان:
```
v1.0.3 — the words on the screen are in the summaries now
```

بدنه (از CHANGELOG خودت، خلاصه‌شده):
```markdown
Every string in your project's interface — every button label, every menu
title, every line of dialogue — was missing from `summary/` and
`ai-bundle.md`. A UI object came out as its object name and its component
name, and not one character of what it actually says.

Text now has its own way out, in three places: quoted on the hierarchy line,
in a flat `## Text` section per Scene, and under the file that holds it for
Prefabs and ScriptableObjects. What counts as text is the *field*, not a list
of component types, so a label widget this tool has never heard of still works.

The exported site's Simple view had the same hole. Component cards now show
the text they draw in both views.

**Install** — Unity ▸ Window ▸ Package Manager ▸ + ▸ Add package from git URL:
`https://github.com/AmirCollider/UnityDocSnap.git`

Full changelog: https://github.com/AmirCollider/UnityDocSnap/blob/main/CHANGELOG.md
```

همین کار را برای `UnityDirectTMP` با تگ `v2.1.13` بکن.

---

## ۴. پروفایل خود گیت‌هاب

ریپوی `AmirCollider/AmirCollider` اسمش با یوزرنیم یکی است، پس اگر یک
`README.md` در ریشه‌اش باشد، **بالای صفحه‌ی پروفایلت** نمایش داده می‌شود.
الان آن ریپو سورس ورکر است و README دارد ولی برای پروفایل نوشته نشده.

بهتر است یک ریپوی جدا نسازی؛ کافی است ابتدای همان README را عوض کنی تا
اولین چیزی که یک بازدیدکننده‌ی پروفایل می‌بیند، دو محصول باشد:

```markdown
### 🛠 Unity tools

| | | |
|---|---|---|
| **[Unity DocSnap](https://github.com/AmirCollider/UnityDocSnap)** | Your whole Unity project as one `ai-bundle.md` for Claude / Cursor, plus an offline HTML site. | free core · [site](https://amircollider.com/en/unity-docsnap) |
| **[Unity DirectTMP](https://github.com/AmirCollider/UnityDirectTMP)** | Give TextMeshPro a `.ttf`. Persian, Arabic and Urdu that actually read. | MIT · [site](https://amircollider.com/en/unity-directtmp) |
```

---

## ۵. یک `FUNDING.yml` — رایگان و پنج دقیقه

فایل `.github/FUNDING.yml` در ریپوی UnityDocSnap:

```yaml
custom: ["https://amircollider.com/en/unity-docsnap"]
```

نتیجه: یک دکمه‌ی «Sponsor» بالای ریپو که به صفحه‌ی محصولت می‌رود. یکی از
معدود جاهایی است که گیت‌هاب اجازه‌ی لینک تجاری برجسته می‌دهد.

---

## ۶. یک `.github/ISSUE_TEMPLATE/` بگذار

نه برای مرتب‌بودن — برای **سیگنال**. ریپویی که تمپلیت ایشو دارد، نگه‌داری‌شده
به نظر می‌رسد، و برای ابزاری که پول می‌گیرد این تفاوت خرید و نخرید است.

`.github/ISSUE_TEMPLATE/bug.yml`:
```yaml
name: Bug report
description: Something DocSnap did wrong
labels: [bug]
body:
  - type: input
    id: unity
    attributes: { label: Unity version, placeholder: "6000.0.30f1" }
    validations: { required: true }
  - type: dropdown
    id: edition
    attributes:
      label: Edition
      options: [Free, Plus, Pro]
    validations: { required: true }
  - type: textarea
    id: what
    attributes:
      label: What happened
      description: What you expected, and what you got instead.
    validations: { required: true }
```

`.github/ISSUE_TEMPLATE/config.yml`:
```yaml
blank_issues_enabled: true
contact_links:
  - name: Buy Plus or Pro
    url: https://amircollider.com/en/unity-docsnap
    about: Pricing, the feature matrix, and the crypto checkout.
  - name: Email
    url: https://amircollider.com/en/contact
    about: Licence problems, orders, anything you would rather not post publicly.
```

---

## ۷. صفحه‌ی محصول — سه تغییر کوچک

در `Pages/UnityDocSnap.js`:

1. **تیتر اصلی را عوض کن** به جمله‌ی هوش مصنوعی از [`02-Positioning.md`](02-Positioning.md).
   الان اولین کلمه‌ای که خواننده می‌بیند «documentation» است.
2. **جمله‌ی «MCP باید یونیتی باز باشد، DocSnap یک فایل می‌دهد»** را همان
   بالا بگذار. تنها جمله‌ای است که تو را در گفتگوی امروز جا می‌دهد.
3. **بند اجازه‌ی دیکامپایل** را از CHANGELOG به صفحه‌ی محصول بیاور، نزدیک
   دکمه‌ی خرید. کسی که مردد است چون DLL بسته است، دقیقاً همان‌جا مردد می‌شود.

> ⚠️ `CONFIG.VERSION` را دست نزن و به `Pages/ReleaseNotes.js` چیزی اضافه نکن —
> طبق قانون شماره‌ی ۱ در `CLAUDE.md` هر دو دست خودت‌اند.

---

## چک‌لیست

```
[ ] UnityDocSnap    — description + website + 20 topics
[ ] UnityDirectTMP  — description + website + 20 topics
[ ] AmirCollider    — description + website + 15 topics
[ ] social preview 1280×640 روی هر سه
[ ] Release v1.0.3  روی UnityDocSnap
[ ] Release v2.1.13 روی UnityDirectTMP
[ ] بلوک «Unity tools» بالای README پروفایل
[ ] .github/FUNDING.yml
[ ] .github/ISSUE_TEMPLATE/
[ ] تیتر صفحه‌ی محصول عوض شد
```
