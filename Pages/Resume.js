// ==========================================
// Pages/Resume.js
// /resume - the formal counterpart to /about.
//
// Why two pages about one person
//
// /about is first-person and unguarded: the page somebody reads
// because they liked a game and wondered who made it. It is good
// at that and is left alone.
//
// This is the page a studio lead, a client or a producer opens
// while deciding whether to reply. Same person, same facts,
// different job: what was built, what it took to build it, and
// what is wanted next. It is short on purpose. A resume that
// argues with the reader has already lost.
//
// What is deliberately NOT here
//
//   - The legal name. It is on every certificate and this site
//     publishes it nowhere. A resume page is precisely where it
//     would first leak.
//   - Certificate FILES, for the same reason. Issuer, subject and
//     year are the parts anybody actually checks.
//   - YouTube. Every other account is here; the owner asked for
//     that one to stay on /about and in the footer.
//   - A photo, a location, an age, a salary, an availability date.
//
// Public entry (wired in Worker.js ROUTES):
//   handleResume  GET /resume  and  GET /cv
// ==========================================

import { CONFIG } from '../Config.js'
import { getPageHead, pageFoundationCss } from '../Core/DesignSystem.js'
import { createHtmlResponse } from '../Core/Http.js'
import { escapeHtml } from '../Core/Html.js'
import { themeBootScript } from '../Core/PageChrome.js'
import { seoHead, breadcrumbLd, personLd, keywordList } from '../Core/Seo.js'
import { localizedPath } from '../Core/Locale.js'
import { resolveGames } from '../Games/Registry.js'
import {
  siteNavCss, siteHeader, siteBreadcrumb, siteFooter, siteBackToTop, siteChromeScript, NAV_I18N
} from '../Core/SiteNav.js'
import {
  dirFor, langCookieHeader, parseCookies, resolveLang, resolveRequestLang, resolveRequestTheme,
  themeAttribute
} from '../Core/RequestContext.js'


const PAGE_PATH = '/resume'


// ==========================================
// The numbers at the top.
//
// Four, and every one of them is checkable from this site in
// under a minute. That is the whole point of leading with them:
// a claim a reader can verify costs nothing to make and a claim
// they cannot costs the rest of the page.
// ==========================================
// There was a fifth here once - years programming - and it came
// off deliberately. The owner says publicly that he started at
// eight and nowhere says how old he is; a "10+ years" beside that
// subtracts to an age he chose not to publish. A resume should
// not do arithmetic on its author.
const STATS = [
  { key: 'sShipped', value: '4' },
  { key: 'sLangs', value: '3' },
  { key: 'sStack', value: '100%' },
  { key: 'sDeps', value: '0' }
]


// ==========================================
// The skill matrix.
//
// Levels come from what the work actually demanded, not from how
// long a tool has been open. The scale:
//
//   4  Shipped systems in it that other people now depend on,
//      including the parts that only misbehave on somebody else's
//      device or under load.
//   3  Shipped real features with it and know where its edges are.
//   2  Used it for real work; would look things up.
//
// `ev` names a thing on THIS site that used it. A level with no
// project behind it does not belong in the table - that rule is
// what makes the last column worth reading.
// ==========================================
const SKILLS = [
  {
    group: 'gameplay',
    rows: [
      { key: 'skCsharp', level: 4, ev: 'evGames' },
      { key: 'skUnity', level: 4, ev: 'evAll' },
      { key: 'skEconomy', level: 4, ev: 'evStores' },
      { key: 'skProcedural', level: 3, ev: 'evChrono' },
      { key: 'skAndroid', level: 3, ev: 'evAndroid' },
      { key: 'skIl2cpp', level: 3, ev: 'evAndroid' }
    ]
  },
  {
    group: 'tools',
    rows: [
      { key: 'skEditor', level: 4, ev: 'evDocSnap' },
      { key: 'skReflection', level: 4, ev: 'evDocSnap' },
      { key: 'skFonts', level: 4, ev: 'evDirectTmp' },
      { key: 'skEditorUx', level: 3, ev: 'evDocSnap' },
      { key: 'skCi', level: 3, ev: 'evDocSnap' }
    ]
  },
  {
    group: 'backend',
    rows: [
      { key: 'skJs', level: 4, ev: 'evWorker' },
      { key: 'skWorkers', level: 4, ev: 'evWorker' },
      { key: 'skRest', level: 4, ev: 'evApi' },
      { key: 'skOauth', level: 3, ev: 'evOauth' },
      { key: 'skPayments', level: 3, ev: 'evCheckout' },
      { key: 'skLicense', level: 3, ev: 'evLicense' },
      { key: 'skSql', level: 3, ev: 'evDb' }
    ]
  },
  {
    group: 'web',
    rows: [
      { key: 'skHtml', level: 4, ev: 'evSite' },
      { key: 'skI18n', level: 4, ev: 'evI18n' },
      { key: 'skSeo', level: 3, ev: 'evSeo' },
      { key: 'skPython', level: 2, ev: 'evPython' }
    ]
  }
]


// ==========================================
// Certificates.
//
// Listed, never linked and never uploaded - each document carries
// a legal name this site does not publish.
// ==========================================
const CERTIFICATES = [
  { key: 'cTopLearn', issuer: 'iTopLearn', year: '' },
  { key: 'cInstitute', issuer: 'iInstitute', year: '2020' },
  { key: 'cSeGaP', issuer: 'iSeGaP', year: '2021' },
  { key: 'cGoogle', issuer: 'iGoogle', year: '2022' }
]

const COURSES = ['crScratch', 'crPython', 'crAppInventor', 'crWeb']


// ==========================================
// i18n
//
// Each language is written in that language, not translated out of
// English. That matters most in the Persian: a resume that reads
// as machine output is a resume that gets closed, and the tell is
// always the same - English sentence order with Persian words in
// it.
// ==========================================
const I18N = {
  fa: {
    locale: 'fa-IR',
    metaTitle: 'رزومه — AmirCollider',
    metaDesc: 'برنامه‌نویس بازی؛ یونیتی و C#. دو بازی منتشرشده، دو افزونه‌ی ادیتور یونیتی و کل سرویس پشتشان روی Cloudflare Workers — همه نوشته‌ی خودم و همه قابل بررسی.',
    crumb: 'رزومه',

    role: 'برنامه‌نویس بازی · یونیتی و C#',
    h1: 'کارنامه',
    tagline: 'بازی می‌سازم، ابزارِ ساختش را می‌نویسم، و سرویسی که پشت هر دو کار می‌کند هم مال خودم است.',
    ctaContact: 'برای همکاری بنویس',
    ctaWork: 'کارها را ببین',
    ctaPdf: 'دریافت PDF',
    pdfHint: 'صفحه در پنجره‌ی چاپ باز می‌شود؛ مقصد را روی «ذخیره به‌صورت PDF» بگذارید. همین زبانی که می‌خوانید ذخیره می‌شود.',

    // The section strip. Short labels - it is a jump list, not a
    // second set of headings.
    jSummary: 'در یک نگاه',
    jWork: 'کارها',
    jSkills: 'مهارت‌ها',
    jFocus: 'مسیر',
    jCerts: 'مدارک',
    jContact: 'تماس',
    jumpLabel: 'پیمایش بخش‌های رزومه',

    sShipped: 'محصول منتشرشده',
    sLangs: 'زبان، روی هر محصول',
    sStack: 'کدِ نوشته‌ی خودم',
    sDeps: 'وابستگی بیرونی، بدون مرحله‌ی بیلد',

    summaryHead: 'در یک نگاه',
    summary: [
      'کارم سه لایه دارد و هر سه را خودم می‌نویسم: بازی، ابزاری که ساختنش را سریع‌تر می‌کند، و سرویسی که هر دو رویش می‌ایستند. این‌ها نمونه‌کار تمرینی نیستند؛ منتشر شده‌اند، آدم‌ها استفاده می‌کنند و یکی‌شان فروش دارد.',
      'داخل یونیتی کارم سیستم است: چیزی که باید پایدار بماند وقتی بازیکن کاری می‌کند که فکرش را نکرده بودی. ذخیره‌ی ابری، جدول امتیاز، فروشگاه درون‌برنامه‌ای و اقتصادش، تولید بی‌پایان مرحله، و بیلد اندرویدی که روی گوشی مردم هم همان‌طور کار کند که روی سیستم خودم.',
      'بیرون از یونیتی، افزونه‌ی ادیتور می‌نویسم و همان چیزی را که می‌فروشم خودم پشتیبانی می‌کنم: صدور کلید، فعال‌سازی روی دستگاه، پرداخت، تحویل ایمیل. وقتی کسی نصفه‌شب کلیدش کار نکند، تنها کسی که می‌تواند درستش کند من هستم — و همین یک جمله بیشتر از هر ادعایی درباره‌ی «مسئولیت‌پذیری» می‌گوید.'
    ],

    kgame: 'بازی',
    ktool: 'ابزار',
    kservice: 'سرویس',

    // What each game has built into it, as words rather than
    // flags. Read from the registry's capabilities, so a game
    // cannot be credited here with something its own page does
    // not offer.
    capLogin: 'ورود با گوگل',
    capCloud: 'ذخیره‌ی ابری',
    capBoard: 'جدول امتیاز',
    capStore: 'فروشگاه درون‌برنامه‌ای',

    // The same idea for the three projects that are not games.
    // Names stay names - GSUB, HarfBuzz and OAuth are what those
    // things are called in every language - and the rest is
    // written in the reader's.
    bLicensing: 'صدور لایسنس',
    bActivation: 'فعال‌سازی روی دستگاه',
    bCheckout: 'پرداخت رمزارز',
    bExport: 'خروجی HTML آفلاین',
    bGsub: 'جدول‌های GSUB فونت',
    bShaping: 'شکل‌دهی متن راست‌به‌چپ',
    bGlyphs: 'گلیف‌های راستی‌آزمایی‌شده با HarfBuzz',
    bApi: 'API بازی‌ها',
    bOauth: 'OAuth',
    bPayments: 'پرداخت',
    bPanels: 'پنل‌های مدیریت',
    bMailbox: 'صندوق پستی',
    workHead: 'کارها',
    workLede: 'هر چهارتا منتشر شده‌اند و از همین سایت باز می‌شوند.',

    skillsHead: 'مهارت‌ها',
    skillsLede: 'سطح هر مهارت از کاری که واقعاً لازم بوده در آمده، نه از مدت آشنایی. ستون آخر می‌گوید کجا ازش استفاده شده — اگر چیزی پروژه‌ای پشتش نداشته باشد، اصلاً در این جدول نیست.',
    gGameplay: 'گیم‌پلی و یونیتی',
    gTools: 'ابزار و ادیتور',
    gBackend: 'بک‌اند و سرویس',
    gWeb: 'وب',
    lvl4: 'حرفه‌ای',
    lvl3: 'مسلط',
    lvl2: 'در حد کار',

    evGames: 'هر دو بازی',
    evAll: 'هر چهار محصول',
    evStores: 'فروشگاه هر دو بازی',
    evChrono: 'Chrono Blades',
    evAndroid: 'بیلدهای اندروید',
    evDocSnap: 'Unity DocSnap',
    evDirectTmp: 'Unity DirectTMP',
    evWorker: 'همین سایت',
    evApi: 'API بازی‌ها',
    evOauth: 'ورود با گوگل',
    evCheckout: 'چک‌اوت DocSnap',
    evLicense: 'لایسنس DocSnap',
    evDb: 'سه دیتابیس D1',
    evSite: 'همین سایت',
    evI18n: 'کل سایت، سه‌زبانه',
    evSeo: 'sitemap و داده‌ی ساخت‌یافته',
    evPython: 'اسکریپت‌های جانبی',

    focusHead: 'مسیری که جلو می‌روم',
    focus: [
      'تنها کار می‌کنم و این تا اینجا انتخاب بوده، نه ناچاری. کار را خودم تعریف می‌کنم، می‌سازم، منتشر می‌کنم و بعد خودم نگهش می‌دارم — ایمیل پشتیبانی هم به خودم می‌رسد. عادت دارم به‌جای بحث بر سر بهترین راه، چیزی را که کار می‌کند منتشر کنم و بعد بهترش کنم.',
      'این‌ها را محصول می‌بینم، نه نمونه‌کار. Unity DocSnap همین حالا فروش دارد، Chrono Blades خرید درون‌برنامه‌ای دارد و Neon Katana هنوز ندارد اما زیرساختش آماده است. هدفم روشن است: درآمدم از بازی‌ها، ابزارها و سایت‌های خودم باشد و هر کدام روی پای خودش بایستد.',
      'در کنار آن دنبال کار بین‌المللی هستم و همکاری با استودیوهای بزرگ بازی‌سازی. نه به این دلیل که این‌ها را کافی نمی‌دانم، بلکه چون می‌دانم مقیاسی هست که تنها به آن نمی‌رسم: تیمی که کدم را ریویو کند، پروژه‌ای بزرگ‌تر از یک نفر، و روشی از کار کردن که فقط با انجام دادنش یاد گرفته می‌شود. آن تجربه را ندارم و همین اول می‌گویمش.'
    ],

    // The skill rows. Written in Persian, not transliterated from
    // the English list - a name that is a name (GSUB, IL2CPP,
    // TextMeshPro, OAuth) stays as it is written everywhere else,
    // and everything around it is in the reader's language.
    skCsharp: 'سیستم‌های گیم‌پلی با C#',
    skUnity: 'موتور یونیتی (2021.3 LTS تا 6)',
    skEconomy: 'اقتصاد بازی و مسیر پیشرفت بازیکن',
    skProcedural: 'تولید مرحله‌ی رویه‌ای و بی‌پایان',
    skAndroid: 'بیلد، امضا و انتشار اندروید',
    skIl2cpp: 'IL2CPP، حذف کد بی‌استفاده، link.xml',
    skEditor: 'افزونه‌نویسی برای ادیتور یونیتی',
    skReflection: 'Reflection و پیمایش آبجکت‌های سریالایزشده',
    skFonts: 'ساختار داخلی فونت — GSUB، شکل‌دهی، TextMeshPro',
    skEditorUx: 'تجربه‌ی کاربری ادیتور و کارهای طولانی',
    skCi: 'خودکارسازی CI از داخل ادیتور',
    skJs: 'جاوااسکریپت — ماژول‌های ES، بدون مرحله‌ی بیلد',
    skWorkers: 'Cloudflare Workers و D1 و R2',
    skRest: 'REST API برای کلاینت‌های منتشرشده‌ی بازی',
    skOauth: 'OAuth 2.0 و راستی‌آزمایی JWT',
    skPayments: 'پرداخت، وب‌هوک، تحویل ایمن در برابر تکرار',
    skLicense: 'صدور لایسنس و فعال‌سازی روی دستگاه',
    skSql: 'طراحی اسکیمای SQL و مهاجرت داده',
    skHtml: 'HTML و CSS — واکنش‌گرا، راست‌به‌چپ، تم',
    skI18n: 'چندزبانه‌سازی (فارسی / انگلیسی / ژاپنی)',
    skSeo: 'سئوی فنی و داده‌ی ساخت‌یافته',
    skPython: 'پایتون',

    iTopLearn: 'تاپ‌لرن',
    iInstitute: 'بنیاد ملی بازی‌های رایانه‌ای',
    iSeGaP: 'جشنواره‌ی بازی‌های جدی · SeGaP',
    iGoogle: 'Google Digital Garage',

    certHead: 'مدارک',
    certLede: 'فایل مدارک روی سایت نیست — روی هرکدامشان نام و مشخصات شخصی هست. در صورت درخواست مستقیم می‌فرستم.',
    cTopLearn: 'دوره‌ی جامع ساخت بازی با یونیتی، پروژه‌محور',
    cInstitute: 'دوره‌ی تخصصی بازی‌سازی با یونیتی',
    cSeGaP: 'مدرسه‌ی بازی‌های جدی شناختی',
    cGoogle: 'Google Digital Garage',
    onRequest: 'در صورت درخواست',

    courseHead: 'پیش از این‌ها',
    courseSub: 'آکادمی یاسان',
    crScratch: 'چهار ترم اسکرچ',
    crPython: 'دو ترم پایتون',
    crAppInventor: 'دو ترم اپ اینونتور',
    crWeb: 'یک ترم طراحی وب',

    contactHead: 'تماس',
    contactLede: 'کوتاه بنویس، جواب می‌دهم.',
    lContact: 'فرم تماس',
    lGithub: 'گیت‌هاب',
    lInstagram: 'اینستاگرام',
    lX: 'X',
    aboutNote: 'نسخه‌ی خودمانی‌ترش را',
    aboutCta: 'این‌جا',
    aboutNote2: 'نوشته‌ام.'
  },

  en: {
    locale: 'en-US',
    metaTitle: 'Resume — AmirCollider',
    metaDesc: 'Game programmer, Unity and C#. Two published games, two Unity editor extensions, and the whole service behind them on Cloudflare Workers — all written by me, all inspectable.',
    crumb: 'Resume',

    role: 'Game programmer · Unity and C#',
    h1: 'What I have built',
    tagline: 'I make games, I write the tools that make them faster to build, and the service behind both is mine too.',
    ctaContact: 'Start a conversation',
    ctaWork: 'See the work',
    ctaPdf: 'Download PDF',
    pdfHint: 'This opens the print dialog — choose "Save as PDF" as the destination. It saves the language you are reading.',

    jSummary: 'Summary',
    jWork: 'Work',
    jSkills: 'Skills',
    jFocus: 'Direction',
    jCerts: 'Certificates',
    jContact: 'Contact',
    jumpLabel: 'Resume sections',

    sShipped: 'products shipped',
    sLangs: 'languages, every product',
    sStack: 'of it written by me',
    sDeps: 'external dependencies, no build step',

    summaryHead: 'The short version',
    summary: [
      'My work has three layers and I write all of them: the game, the tooling that makes building it faster, and the service both stand on. None of it is portfolio filler — it is published, people use it, and one of it sells.',
      'Inside Unity I build systems: the things that have to keep holding when a player does something nobody planned for. Cloud saves, leaderboards, in-app stores and the economies behind them, endless stage generation, and Android builds that behave the same on somebody else\'s phone as on mine.',
      'Outside Unity I write editor extensions and I support what I sell: key issuing, device activation, payments, delivery. When somebody\'s licence fails at midnight, the only person who can fix it is me — which says more about how I work than any adjective would.'
    ],

    kgame: 'game',
    ktool: 'tool',
    kservice: 'service',

    capLogin: 'Google sign-in',
    capCloud: 'cloud save',
    capBoard: 'leaderboard',
    capStore: 'in-app store',

    bLicensing: 'licensing',
    bActivation: 'device activation',
    bCheckout: 'crypto checkout',
    bExport: 'offline HTML export',
    bGsub: 'GSUB font tables',
    bShaping: 'RTL shaping',
    bGlyphs: 'HarfBuzz-verified glyphs',
    bApi: 'games API',
    bOauth: 'OAuth',
    bPayments: 'payments',
    bPanels: 'operator panels',
    bMailbox: 'mailbox',
    workHead: 'The work',
    workLede: 'All four are published, and all four open from this site.',

    skillsHead: 'Skills',
    skillsLede: 'Levels come from what the work actually demanded, not from how long the tool has been open. The last column names where each was used — anything without a project behind it is not in the table at all.',
    gGameplay: 'Gameplay and Unity',
    gTools: 'Tooling and the editor',
    gBackend: 'Backend and services',
    gWeb: 'Web',
    lvl4: 'Advanced',
    lvl3: 'Proficient',
    lvl2: 'Working',

    evGames: 'both games',
    evAll: 'all four products',
    evStores: 'both game stores',
    evChrono: 'Chrono Blades',
    evAndroid: 'the Android builds',
    evDocSnap: 'Unity DocSnap',
    evDirectTmp: 'Unity DirectTMP',
    evWorker: 'this site',
    evApi: 'the games API',
    evOauth: 'Google sign-in',
    evCheckout: 'the DocSnap checkout',
    evLicense: 'DocSnap licensing',
    evDb: 'three D1 databases',
    evSite: 'this site',
    evI18n: 'the whole site, three languages',
    evSeo: 'sitemap and structured data',
    evPython: 'supporting scripts',

    focusHead: 'Where I am going',
    focus: [
      'I work alone, and so far that has been a choice rather than a constraint. I scope the work, build it, ship it, and then keep it running — the support mail reaches me. I would rather put something that works in front of people and improve it than argue about the best way to start.',
      'I treat these as products, not portfolio pieces. Unity DocSnap sells today, Chrono Blades carries in-app purchases, and Neon Katana does not yet — the plumbing is there for when it does. The goal is plain: I want my games, my tools and my sites to be my income, each of them standing on its own.',
      'Alongside that I am looking for international work, and for the chance to work with large game studios. Not because I think what I have built is small, but because I know there is a scale I cannot reach alone: a team that reviews my code, a project bigger than one person, and a way of working that is only learned by doing it. I have not had that yet, and I would rather say so in the first line than bury it in phrasing.'
    ],

    skCsharp: 'C# gameplay systems',
    skUnity: 'Unity Engine (2021.3 LTS → 6)',
    skEconomy: 'Game economy and progression',
    skProcedural: 'Procedural / endless level generation',
    skAndroid: 'Android build, signing, release',
    skIl2cpp: 'IL2CPP, code stripping, link.xml',
    skEditor: 'Unity Editor extensions',
    skReflection: 'Reflection and serialized-object walking',
    skFonts: 'Font internals — GSUB, shaping, TextMeshPro',
    skEditorUx: 'Editor UX and long-running jobs',
    skCi: 'CI automation from the editor',
    skJs: 'JavaScript — ES modules, no build step',
    skWorkers: 'Cloudflare Workers, D1, R2',
    skRest: 'REST APIs for shipped game clients',
    skOauth: 'OAuth 2.0 and JWT verification',
    skPayments: 'Payments, webhooks, idempotent fulfilment',
    skLicense: 'Licence issuing and device activation',
    skSql: 'SQL schema design and migration',
    skHtml: 'HTML & CSS — responsive, RTL, theming',
    skI18n: 'Internationalisation (fa / en / ja)',
    skSeo: 'Technical SEO and structured data',
    skPython: 'Python',

    iTopLearn: 'TopLearn',
    iInstitute: 'Iran National Games Institute',
    iSeGaP: 'Serious Games Prize · SeGaP',
    iGoogle: 'Google Digital Garage',

    certHead: 'Certificates',
    certLede: 'The documents are not published here — each carries a legal name and personal details. Sent directly on request.',
    cTopLearn: 'Complete Unity game development, project-based',
    cInstitute: 'Unity game development, specialist course',
    cSeGaP: 'School of Cognitive Serious Games',
    cGoogle: 'Google Digital Garage',
    onRequest: 'on request',

    courseHead: 'Before that',
    courseSub: 'Yasan Academy',
    crScratch: 'Four terms of Scratch',
    crPython: 'Two terms of Python',
    crAppInventor: 'Two terms of App Inventor',
    crWeb: 'One term of web design',

    contactHead: 'Get in touch',
    contactLede: 'Keep it short — I answer.',
    lContact: 'Contact form',
    lGithub: 'GitHub',
    lInstagram: 'Instagram',
    lX: 'X',
    aboutNote: 'There is a less formal version of this',
    aboutCta: 'here',
    aboutNote2: '.'
  },

  ja: {
    locale: 'ja-JP',
    metaTitle: '経歴 — AmirCollider',
    metaDesc: 'ゲームプログラマー。Unity と C#。公開済みのゲーム 2 本、Unity エディタ拡張 2 つ、そしてそれらを支えるサービス一式を Cloudflare Workers 上に自作。すべて確認できます。',
    crumb: '経歴',

    role: 'ゲームプログラマー · Unity / C#',
    h1: 'これまで作ったもの',
    tagline: 'ゲームを作り、それを速く作るための道具を書き、両方を支えるサービスの運用も自分で行っております。',
    ctaContact: 'ご相談はこちら',
    ctaWork: '制作物を見る',
    ctaPdf: 'PDF で保存',
    pdfHint: '印刷ダイアログが開きます。出力先を「PDF に保存」にしてください。今ご覧の言語のまま保存されます。',

    jSummary: '概要',
    jWork: '制作物',
    jSkills: 'スキル',
    jFocus: 'これから',
    jCerts: '資格',
    jContact: 'ご連絡',
    jumpLabel: '経歴のセクション',

    sShipped: '本の公開済み製品',
    sLangs: '言語対応、全製品',
    sStack: '自分で書いたコード',
    sDeps: '外部依存、ビルド工程なし',

    summaryHead: '概要',
    summary: [
      '仕事は 3 つの層に分かれていて、そのすべてを自分で書いています。ゲーム本体、それを速く作るための道具、そして両方が乗るサービスです。いずれも練習のための習作ではなく、実際に公開して使っていただいているもので、そのうち 1 つは販売しております。',
      'Unity の中での仕事はシステム作りです。誰も想定しなかった操作をプレイヤーがしたときにも壊れないもの。クラウドセーブ、ランキング、アプリ内ストアとその経済設計、終わりのないステージ生成、そして自分の環境と同じように他人の端末でも動く Android ビルドです。',
      'Unity の外ではエディタ拡張を書き、売ったものを自分で支えています。キーの発行、端末の有効化、決済、配信。深夜に誰かのライセンスが通らなければ、直せるのは自分だけです。自分の仕事の仕方は、どんな言葉を並べるよりも、この一点に表れているように思います。'
    ],

    kgame: 'ゲーム',
    ktool: 'ツール',
    kservice: 'サービス',

    capLogin: 'Google サインイン',
    capCloud: 'クラウドセーブ',
    capBoard: 'ランキング',
    capStore: 'アプリ内ストア',

    bLicensing: 'ライセンス発行',
    bActivation: '端末アクティベーション',
    bCheckout: '暗号資産決済',
    bExport: 'オフライン HTML 出力',
    bGsub: 'GSUB フォントテーブル',
    bShaping: '右横書きのシェーピング',
    bGlyphs: 'HarfBuzz で検証したグリフ',
    bApi: 'ゲーム API',
    bOauth: 'OAuth',
    bPayments: '決済',
    bPanels: '運用パネル',
    bMailbox: 'メールボックス',
    workHead: '制作物',
    workLede: '4 つとも公開しており、このサイトからご覧いただけます。',

    skillsHead: 'スキル',
    skillsLede: 'レベルは触れてきた期間ではなく、実際に必要とされた作業をもとに、自分なりに判断したものです。右端の列は使用箇所です。裏付けとなる制作物がないものは、表に入れておりません。',
    gGameplay: 'ゲームプレイと Unity',
    gTools: 'ツールとエディタ',
    gBackend: 'バックエンド',
    gWeb: 'Web',
    lvl4: '上級',
    lvl3: '実務レベル',
    lvl2: '業務経験あり',

    evGames: 'ゲーム 2 本',
    evAll: '全 4 製品',
    evStores: '両ゲームのストア',
    evChrono: 'Chrono Blades',
    evAndroid: 'Android ビルド',
    evDocSnap: 'Unity DocSnap',
    evDirectTmp: 'Unity DirectTMP',
    evWorker: 'このサイト',
    evApi: 'ゲーム API',
    evOauth: 'Google サインイン',
    evCheckout: 'DocSnap の決済',
    evLicense: 'DocSnap のライセンス',
    evDb: '3 つの D1 データベース',
    evSite: 'このサイト',
    evI18n: 'サイト全体の 3 言語対応',
    evSeo: 'sitemap と構造化データ',
    evPython: '補助スクリプト',

    focusHead: 'これから',
    focus: [
      'これまでは一人で進めてきました。企画から実装、公開、そして公開後の保守まで自分で担当しており、サポートのメールも自分に届きます。最初から完璧な形を議論するより、動くものを世に出してから直していく進め方をしてきました。',
      '作ったものは作品というより製品だと考えています。Unity DocSnap は現在販売しており、Chrono Blades にはアプリ内課金があります。Neon Katana にはまだありませんが、仕組みだけは用意してあります。自分のゲーム・ツール・サイトが、それぞれ自分の力で収益を生む状態にしていきたいと考えています。',
      'あわせて、海外での仕事や、大きなゲームスタジオの方々とご一緒する機会を探しています。今あるものを小さいと思っているからではなく、一人では届かない規模があると分かっているからです。コードをレビューしていただける環境、一人では抱えきれない大きさの案件、そして実際にやってみなければ身につかない働き方。その経験はまだありませんので、隠さず最初に書いておきます。至らない点も多いと思いますが、学ぶ姿勢だけは持ち続けたいと考えています。'
    ],

    skCsharp: 'C# によるゲームプレイ実装',
    skUnity: 'Unity エンジン（2021.3 LTS 〜 6）',
    skEconomy: 'ゲーム内経済と成長設計',
    skProcedural: 'プロシージャル／エンドレスなステージ生成',
    skAndroid: 'Android のビルド・署名・リリース',
    skIl2cpp: 'IL2CPP、コードストリッピング、link.xml',
    skEditor: 'Unity エディタ拡張',
    skReflection: 'リフレクションとシリアライズ済みオブジェクトの走査',
    skFonts: 'フォント内部構造 — GSUB、シェーピング、TextMeshPro',
    skEditorUx: 'エディタの UX と長時間処理',
    skCi: 'エディタからの CI 自動化',
    skJs: 'JavaScript — ES モジュール、ビルド工程なし',
    skWorkers: 'Cloudflare Workers、D1、R2',
    skRest: '出荷済みゲームクライアント向け REST API',
    skOauth: 'OAuth 2.0 と JWT の検証',
    skPayments: '決済、Webhook、冪等な履行',
    skLicense: 'ライセンス発行と端末アクティベーション',
    skSql: 'SQL スキーマ設計とマイグレーション',
    skHtml: 'HTML と CSS — レスポンシブ、RTL、テーマ',
    skI18n: '多言語対応（fa / en / ja）',
    skSeo: 'テクニカル SEO と構造化データ',
    skPython: 'Python',

    iTopLearn: 'TopLearn',
    iInstitute: 'イラン国立ゲーム財団',
    iSeGaP: 'シリアスゲーム賞 · SeGaP',
    iGoogle: 'Google Digital Garage',

    certHead: '資格',
    certLede: '証書そのものは掲載しておりません。いずれにも本名と個人情報が記載されているためです。ご要望をいただければ、直接お送りいたします。',
    cTopLearn: 'Unity ゲーム開発 総合講座（プロジェクト形式）',
    cInstitute: 'Unity ゲーム開発 専門コース',
    cSeGaP: '認知シリアスゲーム スクール',
    cGoogle: 'Google Digital Garage',
    onRequest: '要望に応じて',

    courseHead: 'それ以前',
    courseSub: 'Yasan Academy',
    crScratch: 'Scratch 4 学期',
    crPython: 'Python 2 学期',
    crAppInventor: 'App Inventor 2 学期',
    crWeb: 'Web デザイン 1 学期',

    contactHead: 'ご連絡',
    contactLede: '短いご連絡でも構いません。いただいたお便りには、できるだけ早くお返事いたします。',
    lContact: 'お問い合わせフォーム',
    lGithub: 'GitHub',
    lInstagram: 'Instagram',
    lX: 'X',
    aboutNote: 'もう少しくだけた内容は',
    aboutCta: 'こちら',
    aboutNote2: 'にあります。'
  }
}


// ==========================================
// The portfolio.
//
// Built from the live registry and CONFIG, so a game added in
// Config.js appears here on the next deploy and a version number
// is never a second place to remember.
//
// What each entry SAYS about a game is read from that game's own
// capabilities and its landing copy - never asserted here. An
// earlier version of this file described Chrono Blades as a 3D
// project, which it is not, because the description was written
// by hand instead of read from the registry. Anything a reader
// could check has to come from the same place the game's own page
// reads it from.
// ==========================================
function projects(games, lang) {
  const rows = []
  const t = I18N[lang] || I18N.fa

  for (const game of Object.values(games || {})) {
    if (!game || !game.id) continue

    const caps = game.capabilities || {}
    const built = []
    if (caps.login) built.push(t.capLogin)
    if (caps.cloudSave) built.push(t.capCloud)
    if (caps.leaderboard) built.push(t.capBoard)
    if (caps.store) built.push(t.capStore)

    // The game's own pitch, in the reader's language, falling back
    // through the languages the registry actually has.
    const pitch = (game.landing && game.landing.tagline
      && (game.landing.tagline[lang] || game.landing.tagline.en || game.landing.tagline.fa)) || ''

    rows.push({
      name: game.name,
      href: '/' + game.id,
      kind: 'game',
      pitch,
      tech: 'Unity · C# · Android',
      built
    })
  }

  rows.push({
    name: 'Unity DocSnap',
    href: '/unity-docsnap',
    kind: 'tool',
    pitchKey: 'pDocSnap',
    tech: 'Unity Editor · C# · commercial · v' + CONFIG.DOCSNAP.VERSION,
    built: [t.bLicensing, t.bActivation, t.bCheckout, t.bExport]
  })

  rows.push({
    name: 'Unity DirectTMP',
    href: '/unity-directtmp',
    kind: 'tool',
    pitchKey: 'pDirectTmp',
    tech: 'Unity · C# · MIT · v' + CONFIG.DIRECTTMP.VERSION,
    built: [t.bGsub, t.bShaping, t.bGlyphs]
  })

  rows.push({
    name: 'amircollider.com',
    href: '/',
    kind: 'service',
    pitchKey: 'pSite',
    tech: 'Cloudflare Workers · D1 · R2',
    built: [t.bApi, t.bOauth, t.bPayments, t.bLicensing, t.bPanels, t.bMailbox]
  })

  return rows
}


// Short pitches for the three things that are not games in the
// registry. Kept beside the code that uses them rather than in the
// i18n block, because they are one line each and only render here.
const PITCH = {
  pDocSnap: {
    fa: 'کل پروژه‌ی یونیتی را می‌گردد و یک سایت HTML آفلاین از آن می‌سازد.',
    en: 'Walks an entire Unity project and bakes it into an offline HTML site.',
    ja: 'Unity プロジェクト全体を走査し、オフライン HTML サイトに書き出します。'
  },
  pDirectTmp: {
    fa: 'متن فارسی و عربی را در TextMeshPro با حروف چسبیده و ترتیب درست نشان می‌دهد.',
    en: 'Makes Persian and Arabic text join and read correctly in TextMeshPro.',
    ja: 'TextMeshPro でペルシャ語・アラビア語の文字を正しく連結して表示します。'
  },
  pSite: {
    fa: 'سایت، API بازی‌ها، چک‌اوت، لایسنس و صندوق ایمیل — روی یک Worker.',
    en: 'The site, the games API, the checkout, licensing and a mailbox — on one Worker.',
    ja: 'サイト、ゲーム API、決済、ライセンス、メールボックスを 1 つの Worker で。'
  }
}


// ==========================================
// renderPage
// ==========================================
function renderPage(lang, theme, games) {
  const t = I18N[lang] || I18N.fa
  const nav = NAV_I18N[lang] || NAV_I18N.fa
  const dir = dirFor(lang)
  const themeAttr = themeAttribute(theme)

  const trail = [
    { href: '/', label: nav.home },
    { href: PAGE_PATH, label: t.crumb }
  ]

  const stats = STATS.map(stat => `
        <div class="rs-stat">
          <b>${escapeHtml(stat.value)}</b>
          <span>${escapeHtml(t[stat.key])}</span>
        </div>`).join('')

  const summary = t.summary.map(line => `<p>${escapeHtml(line)}</p>`).join('')
  const focus = t.focus.map(line => `<p>${escapeHtml(line)}</p>`).join('')

  const work = projects(games, lang).map(item => {
    const pitch = item.pitch || (item.pitchKey && PITCH[item.pitchKey][lang]) || ''
    return `
        <a class="rs-card" href="${escapeHtml(localizedPath(item.href, lang))}">
          <span class="rs-card-top">
            <b>${escapeHtml(item.name)}</b>
            <i class="rs-kind rs-${item.kind}">${escapeHtml(t['k' + item.kind] || item.kind)}</i>
          </span>
          ${pitch ? `<span class="rs-pitch">${escapeHtml(pitch)}</span>` : ''}
          <span class="rs-tech">${escapeHtml(item.tech)}</span>
          ${item.built.length
            ? '<span class="rs-tags">' + item.built.map(b => `<i>${escapeHtml(b)}</i>`).join('') + '</span>'
            : ''}
        </a>`
  }).join('')

  // The section strip. Plain anchors, so it works with JavaScript
  // off and so a middle-click opens the section in a new tab; the
  // script only adds the highlight that follows the reader. It
  // scrolls inside its own box rather than widening the page - six
  // labels in Persian do not fit a phone, and a strip that makes
  // the whole document pan sideways is worse than no strip.
  const JUMPS = [
    ['summary', 'jSummary'], ['work', 'jWork'], ['skills', 'jSkills'],
    ['focus', 'jFocus'], ['certificates', 'jCerts'], ['contact', 'jContact']
  ]
  const jump = `
      <nav class="rs-jump" id="rsJump" aria-label="${escapeHtml(t.jumpLabel)}">
        <div class="rs-jump-row">${
          JUMPS.map(([id, key]) =>
            `<a href="#${id}" data-jump="${id}">${escapeHtml(t[key])}</a>`).join('')
        }</div>
      </nav>`

  const groupLabel = { gameplay: t.gGameplay, tools: t.gTools, backend: t.gBackend, web: t.gWeb }

  const skills = SKILLS.map(group => `
        <div class="rs-skills-card">
          <h3>${escapeHtml(groupLabel[group.group])}</h3>
          <ul>
            ${group.rows.map(row => `
            <li>
              <span class="rs-sk-name">${escapeHtml(t[row.key] || '')}</span>
              <span class="rs-sk-right">
                <span class="rs-pips" role="img" aria-label="${escapeHtml(t['lvl' + row.level])}">
                  ${[1, 2, 3, 4].map(step => `<i class="${step <= row.level ? 'on' : ''}"></i>`).join('')}
                </span>
                <span class="rs-sk-ev">${escapeHtml(t[row.ev] || '')}</span>
              </span>
            </li>`).join('')}
          </ul>
        </div>`).join('')

  const certs = CERTIFICATES.map(cert => `
        <li>
          <span class="rs-cert-name">${escapeHtml(t[cert.key])}</span>
          <span class="rs-cert-meta">${escapeHtml(t[cert.issuer] || cert.issuer)}${cert.year ? ' · ' + escapeHtml(cert.year) : ''}</span>
          <span class="rs-cert-tag">${escapeHtml(t.onRequest)}</span>
        </li>`).join('')

  const courses = COURSES.map(key => `<li>${escapeHtml(t[key])}</li>`).join('')

  // Every account except YouTube, which the owner asked to keep off
  // this page. Filtered here rather than removed from CONFIG.SOCIAL,
  // because the footer and /about still link it.
  const links = [
    { href: localizedPath('/contact', lang), label: t.lContact, primary: true },
    { href: CONFIG.SOCIAL.github, label: t.lGithub },
    { href: CONFIG.SOCIAL.instagram, label: t.lInstagram },
    { href: CONFIG.SOCIAL.x, label: t.lX }
  ].filter(entry => entry.href).map(entry =>
    `<a class="rs-link${entry.primary ? ' is-primary' : ''}" href="${escapeHtml(entry.href)}"${
      entry.primary ? '' : ' rel="noopener me"'}>${escapeHtml(entry.label)}</a>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}"${themeAttr}>
<head>
  ${getPageHead({ title: t.metaTitle, amirLogo: CONFIG.AMIR_LOGO, description: t.metaDesc })}
  ${seoHead({
    path: PAGE_PATH,
    title: t.metaTitle,
    description: t.metaDesc,
    lang,
    type: 'profile',
    keywords: keywordList(
      (CONFIG.BRAND && CONFIG.BRAND.ALIASES) || [],
      lang === 'fa'
        ? ['رزومه برنامه‌نویس بازی', 'برنامه‌نویس یونیتی', 'استخدام برنامه‌نویس C#', 'رزومه بازی‌سازی']
        : lang === 'ja'
          ? ['ゲームプログラマー 経歴', 'Unity エンジニア', 'C# プログラマー 採用']
          : ['Unity developer resume', 'game programmer CV', 'gameplay programmer', 'hire Unity developer']
    ),
    webPage: false,
    graph: [
      breadcrumbLd(trail, lang),
      personLd(lang, { description: t.tagline, path: PAGE_PATH }),
      {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': 'https://amircollider.com' + PAGE_PATH + '#resume',
        url: 'https://amircollider.com' + localizedPath(PAGE_PATH, lang),
        inLanguage: lang,
        name: t.metaTitle,
        description: t.metaDesc,
        mainEntity: { '@id': 'https://amircollider.com/about#person' },
        isPartOf: { '@id': 'https://amircollider.com/#website' }
      }
    ]
  })}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap"></noscript>
  ${themeBootScript()}
  <style>${pageFoundationCss({ maxWidth: '900px' })}${siteNavCss()}${css()}</style>
</head>
<body>
  ${siteHeader({ lang, active: 'resume', path: PAGE_PATH })}
  <div class="wrap">
    ${siteBreadcrumb({ lang, trail })}
    <main id="main">

      <div class="rs-print-head" aria-hidden="true">
        <span>${escapeHtml(CONFIG.BRAND && CONFIG.BRAND.NAME ? CONFIG.BRAND.NAME : 'AmirCollider')} — ${escapeHtml(t.crumb)}</span>
        <span>${escapeHtml(CONFIG.SITE_URL.replace(/^https?:\/\//, '') + localizedPath(PAGE_PATH, lang))}</span>
      </div>

      <header class="rs-hero rs-rise">
        <span class="rs-mark" aria-hidden="true">
          <img src="${escapeHtml(CONFIG.AMIR_LOGO)}" alt="" width="56" height="56" loading="eager" decoding="async">
        </span>
        <p class="rs-role">${escapeHtml(t.role)}</p>
        <h1>${escapeHtml(t.h1)}</h1>
        <p class="rs-tagline">${escapeHtml(t.tagline)}</p>
        <div class="rs-cta">
          <a class="rs-btn is-primary" href="${escapeHtml(localizedPath('/contact', lang))}">${escapeHtml(t.ctaContact)}</a>
          <a class="rs-btn" href="#work">${escapeHtml(t.ctaWork)}</a>
          <button type="button" class="rs-btn rs-pdf" id="rsPdf" hidden>${escapeHtml(t.ctaPdf)}</button>
        </div>
        <p class="rs-pdf-hint" id="rsPdfHint" hidden>${escapeHtml(t.pdfHint)}</p>
        <div class="rs-stats">${stats}</div>
      </header>

      ${jump}

      <section class="rs-sec rs-reveal" id="summary">
        <h2>${escapeHtml(t.summaryHead)}</h2>
        <div class="rs-prose">${summary}</div>
      </section>

      <section class="rs-sec rs-reveal" id="work">
        <h2>${escapeHtml(t.workHead)}</h2>
        <p class="rs-lede">${escapeHtml(t.workLede)}</p>
        <div class="rs-cards">${work}</div>
      </section>

      <section class="rs-sec rs-reveal" id="skills">
        <h2>${escapeHtml(t.skillsHead)}</h2>
        <p class="rs-lede">${escapeHtml(t.skillsLede)}</p>
        <div class="rs-skills">${skills}</div>
      </section>

      <section class="rs-sec rs-reveal" id="focus">
        <h2>${escapeHtml(t.focusHead)}</h2>
        <div class="rs-prose">${focus}</div>
      </section>

      <section class="rs-sec rs-reveal" id="certificates">
        <h2>${escapeHtml(t.certHead)}</h2>
        <p class="rs-lede">${escapeHtml(t.certLede)}</p>
        <ul class="rs-certs">${certs}</ul>
        <p class="rs-sub">${escapeHtml(t.courseHead)}
          <small>${escapeHtml(t.courseSub)}</small></p>
        <ul class="rs-courses">${courses}</ul>
      </section>

      <section class="rs-sec rs-end rs-reveal" id="contact">
        <h2>${escapeHtml(t.contactHead)}</h2>
        <p class="rs-lede">${escapeHtml(t.contactLede)}</p>
        <div class="rs-links">${links}</div>

        <!--
          The same details, as text, for the sheet of paper.

          Every control in .rs-links is a thing to press, and the
          print stylesheet hides all of them - which left the
          exported PDF with a Contact heading, an invitation to
          write, and no address to write to. A printed resume that
          cannot be replied to is the one mistake this page cannot
          afford, so the addresses are spelled out here and shown
          only when the page is being printed.
        -->
        <ul class="rs-print-contact" aria-hidden="true">
          <li>${escapeHtml(CONFIG.SUPPORT_EMAIL)}</li>
          <li>${escapeHtml(CONFIG.SITE_URL.replace(/^https?:\/\//, '') + localizedPath('/contact', lang))}</li>
          <li>${escapeHtml(String(CONFIG.SOCIAL.github || '').replace(/^https?:\/\//, ''))}</li>
        </ul>

        <p class="rs-about">${escapeHtml(t.aboutNote)}
          <a href="${escapeHtml(localizedPath('/about', lang))}">${escapeHtml(t.aboutCta)}</a>${escapeHtml(t.aboutNote2)}</p>
      </section>

    </main>
    ${siteFooter({ lang })}
  </div>
  ${siteBackToTop({ lang })}
  ${siteChromeScript()}
  ${RESUME_JS}
</body>
</html>`
}


// ==========================================
// The page's own script.
//
// Everything here is an addition to a page that is already
// finished, and the ordering is the whole trick: the .js-motion
// class that arms every animated rule is set BY THIS SCRIPT. With
// JavaScript off - and for a crawler, and for the print renderer -
// the stylesheet's animated rules never apply at all, so the
// reader gets the finished page immediately rather than a document
// of invisible sections waiting for an observer that will never
// run. Write it the other way round and the page is blank for
// everybody the enhancement was not for.
//
// String.raw, and no backtick and no dollar-brace anywhere inside:
// this is a template literal inside a template literal, and
// CLAUDE.md section 15 records what a stray one does to the file.
// ==========================================
const RESUME_JS = '<' + 'script>' + String.raw`
(function () {
  var doc = document;
  var reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  if (!reduce) doc.documentElement.classList.add('js-motion');

  var sections = [].slice.call(doc.querySelectorAll('.rs-reveal'));
  var jumpLinks = [].slice.call(doc.querySelectorAll('.rs-jump a'));
  var targets = jumpLinks.map(function (a) {
    return { link: a, el: doc.getElementById(a.getAttribute('data-jump')) };
  }).filter(function (pair) { return pair.el; });

  // One pass does both jobs, and it is driven by scroll position
  // rather than by an IntersectionObserver. That is a deliberate
  // choice made twice over:
  //
  //   Revealing. An observer only tells you about a section it
  //   watched cross the edge. Land on /resume#skills, reload
  //   half-way down, or press End, and every section you went PAST
  //   never crossed anything - so with an observer they stay at
  //   opacity 0 and the reader scrolls up into blank space. Asking
  //   "is this section at or above the line" answers correctly no
  //   matter how the reader got there.
  //
  //   Highlighting. "Which section am I in" is a question about
  //   the whole list at one moment; an observer answers it one
  //   section at a time, which flickers where two short sections
  //   meet.
  //
  // Both are cheap: a handful of getBoundingClientRect calls,
  // throttled to one animation frame.
  var ticking = false;

  function pass() {
    ticking = false;
    var h = window.innerHeight;

    // Reveal anything whose top has reached the bottom 8% of the
    // viewport, and everything above it.
    var revealLine = h * 0.92;
    for (var i = 0; i < sections.length; i++) {
      var el = sections[i];
      if (el.classList.contains('is-in')) continue;
      if (el.getBoundingClientRect().top < revealLine) el.classList.add('is-in');
    }

    if (!targets.length) return;

    // The strip. The last section whose top is above a third of
    // the way down the viewport is the one being read.
    var line = h * 0.32;
    var current = null;
    for (var j = 0; j < targets.length; j++) {
      if (targets[j].el.getBoundingClientRect().top <= line) current = targets[j];
    }
    // Above the first section, the first one is the answer; at the
    // very bottom, the last one is, whatever the arithmetic says.
    if (!current) current = targets[0];
    if (h + window.scrollY >= doc.body.scrollHeight - 4) current = targets[targets.length - 1];

    for (var k = 0; k < targets.length; k++) {
      if (targets[k] === current) targets[k].link.classList.add('is-here');
      else targets[k].link.classList.remove('is-here');
    }
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(pass);
  }

  if (reduce) {
    sections.forEach(function (el) { el.classList.add('is-in'); });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  // Anchor navigation moves the page without a scroll event in
  // some browsers, so the hash change is watched as well.
  window.addEventListener('hashchange', schedule);
  pass();

  // ---------- the four numbers ----------
  //
  // The final text is what the server rendered; this only replays
  // the climb up to it and then puts the original string back
  // verbatim. Anything it cannot read as a number it leaves alone,
  // which is how a value like 10+ or a Persian numeral survives a
  // later edit to STATS without this code knowing about it.
  function countUp(el) {
    var finalText = el.textContent;
    var digits = finalText.replace(/[^0-9]/g, '');
    if (!digits) return;
    var target = parseInt(digits, 10);
    if (!isFinite(target) || target <= 0) return;

    var at = finalText.indexOf(digits);
    var prefix = finalText.slice(0, at);
    var suffix = finalText.slice(at + digits.length);
    var started = 0;

    function frame(now) {
      if (!started) started = now;
      var p = Math.min(1, (now - started) / 900);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }

  if (!reduce && typeof requestAnimationFrame === 'function') {
    var nums = [].slice.call(doc.querySelectorAll('.rs-stat b'));
    var runNums = function () { nums.forEach(countUp); };
    var statBox = doc.querySelector('.rs-stats');
    if ('IntersectionObserver' in window && statBox) {
      var io2 = new IntersectionObserver(function (entries) {
        if (!entries[0] || !entries[0].isIntersecting) return;
        io2.disconnect();
        runNums();
      }, { threshold: 0.3 });
      io2.observe(statBox);
    } else {
      runNums();
    }
  }

  // ---------- the identity mark ----------
  //
  // If the logo cannot be fetched, take the whole mark out rather
  // than leave a broken-image glyph at the top of the page. This
  // page is printed and sent to people: an empty bordered square
  // is a design choice, a broken image is a mistake.
  var mark = doc.querySelector('.rs-mark img');
  if (mark) {
    mark.addEventListener('error', function () {
      var box = mark.closest ? mark.closest('.rs-mark') : mark.parentNode;
      if (box) box.style.display = 'none';
    });
    // A load that already failed before this ran fires no event.
    if (mark.complete && mark.naturalWidth === 0) {
      var box0 = mark.closest ? mark.closest('.rs-mark') : mark.parentNode;
      if (box0) box0.style.display = 'none';
    }
  }

  // ---------- PDF ----------
  //
  // The button ships hidden and is revealed here, because what it
  // does needs a script and a control that does nothing is worse
  // than no control at all. What it opens is the browser's own
  // print dialog, whose Save-as-PDF destination writes a real,
  // selectable, searchable PDF of this page in the language being
  // read. The export itself is the print block in the stylesheet;
  // this is only the door to it.
  var pdf = doc.getElementById('rsPdf');
  var hint = doc.getElementById('rsPdfHint');
  if (pdf && typeof window.print === 'function') {
    pdf.hidden = false;
    if (hint) hint.hidden = false;
    pdf.addEventListener('click', function () {
      // Reveal everything before the dialog reads the layout. A
      // section still waiting for its observer would otherwise
      // print as a blank block: the print stylesheet overrides the
      // CSS, but the class has to be on the element first.
      sections.forEach(function (el) { el.classList.add('is-in'); });
      window.print();
    });
  }
})();
` + '<' + '/script>';


// ==========================================
// Handler
// ==========================================
export async function handleResume(url, request, gameId, requestId, GAMES, env) {
  const cookies = parseCookies(request)
  const lang = resolveLang(resolveRequestLang(url, request, cookies))
  const theme = resolveRequestTheme(cookies)

  // The MERGED registry, not the raw one.
  //
  // Every project card reads its pitch from the same place the
  // game's own landing page reads it, and for neon-katana that
  // place is the panel, not Config.js - it ships no landing
  // baseline at all. Rendering the raw map here gave Chrono
  // Blades a pitch and Neon Katana none, on the live site as
  // well as offline: a resume that describes one game and stays
  // silent about the other, for no reason a reader could see.
  //
  // A database that is unreachable falls back to the raw map
  // rather than failing the page. A card without a pitch line is
  // a smaller problem than a resume that does not open.
  const games = await resolveGames(env, GAMES).catch(() => GAMES)

  return createHtmlResponse(renderPage(lang, theme, games), 200, langCookieHeader(url, lang))
}


// ==========================================
// css
//
// The page's own layer only. The tokens, the gradient background
// and the font come from pageFoundationCss(), so this file cannot
// disagree with the rest of the site about what --surface means -
// which is exactly how the first version of this page ended up
// rendering as black serif text on white.
//
// Centred, and generous with space. A resume is read once, quickly,
// often on a phone: one column, big type at the top, and nothing
// that needs a decision to understand.
// ==========================================
function css() {
  return `
    #main { padding-block-start: 8px; }

    /* ---------- motion ----------
       Every animated rule here is an ENHANCEMENT of a page that is
       already complete and already laid out. Nothing starts at
       opacity 0 unless the script has said it is going to move it:
       the .js-motion class is set by the script itself, so a
       reader with JavaScript off, a crawler, and the print
       renderer all get the finished page rather than an empty one.
       That ordering is the whole trick and it is easy to lose. */
    @keyframes rs-rise-in {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: none; }
    }
    .js-motion .rs-rise > * { animation: rs-rise-in 0.62s cubic-bezier(0.22, 0.68, 0.24, 1) backwards; }
    .js-motion .rs-rise > *:nth-child(1) { animation-delay: 0.02s; }
    .js-motion .rs-rise > *:nth-child(2) { animation-delay: 0.09s; }
    .js-motion .rs-rise > *:nth-child(3) { animation-delay: 0.16s; }
    .js-motion .rs-rise > *:nth-child(4) { animation-delay: 0.23s; }
    .js-motion .rs-rise > *:nth-child(5) { animation-delay: 0.30s; }
    .js-motion .rs-rise > *:nth-child(6) { animation-delay: 0.37s; }
    .js-motion .rs-rise > *:nth-child(7) { animation-delay: 0.44s; }

    .js-motion .rs-reveal {
      opacity: 0; transform: translateY(22px);
      transition: opacity 0.62s ease, transform 0.62s cubic-bezier(0.22, 0.68, 0.24, 1);
    }
    .js-motion .rs-reveal.is-in { opacity: 1; transform: none; }

    /* A reader who has asked their system for less motion gets the
       page with none of it, not a slower version of it. */
    @media (prefers-reduced-motion: reduce) {
      .js-motion .rs-rise > *,
      .js-motion .rs-reveal { animation: none !important; transition: none !important;
        opacity: 1 !important; transform: none !important; }
    }

    /* ---------- hero ---------- */
    .rs-hero {
      text-align: center; position: relative;
      padding-block: clamp(24px, 6vw, 54px) clamp(20px, 4vw, 34px);
    }

    /* The glow behind the title. Decorative, sits under everything,
       and is drawn with the brand colour rather than a fixed purple
       so a game-accent theme does not fight it. */
    .rs-hero::before {
      content: ''; position: absolute; z-index: -1;
      inset-block-start: -70px; left: 50%; transform: translateX(-50%);
      width: min(680px, 100%); height: 340px;
      background: radial-gradient(closest-side,
        rgba(var(--brand-rgb), 0.20), rgba(var(--brand-rgb), 0.06) 62%, transparent 100%);
      pointer-events: none;
    }
    /* Two things above are deliberate and both were bugs first.
       LEFT, not inset-inline-start: the offset and the translate
       that centres it have to agree about which way is which, and
       transform is always physical - pairing a logical offset with
       a physical translate put the glow 340 pixels off the edge of
       the Persian page and made the whole document pan sideways.
       And 100%, not 130%: a decoration wider than the box it
       decorates is a horizontal scrollbar waiting for a narrow
       phone. */

    /* The identity mark. The site header carries the same logo, but
       a resume that is printed, exported or read on its own has to
       introduce itself at the top of the page rather than rely on
       chrome that will not be there. */
    .rs-mark {
      display: inline-flex; align-items: center; justify-content: center;
      width: 74px; height: 74px; border-radius: 22px; margin-block-end: 18px;
      background: var(--surface); border: 1px solid var(--border);
      box-shadow: 0 14px 34px rgba(var(--brand-rgb), 0.20);
    }
    .rs-mark img { width: 56px; height: 56px; object-fit: contain; border-radius: 14px; }
    .rs-role {
      font-size: 0.82em; font-weight: 800; letter-spacing: 0.09em;
      text-transform: uppercase; color: var(--brand);
    }
    .rs-hero h1 {
      font-size: clamp(2.1rem, 7vw, 3.4rem); font-weight: 800;
      letter-spacing: -0.02em; line-height: 1.15; margin-block: 12px 14px;
    }
    .rs-tagline {
      color: var(--text-dim); font-size: clamp(1rem, 2.6vw, 1.12rem);
      line-height: 1.85; max-width: 34em; margin-inline: auto;
    }

    .rs-cta { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-block-start: 26px; }
    .rs-btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 48px; padding: 13px 26px; border-radius: 14px;
      font-weight: 700; font-size: 0.95em; text-decoration: none;
      border: 1px solid var(--border); background: var(--surface); color: var(--text);
      transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    }
    .rs-btn:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--brand) 50%, var(--border)); }
    .rs-btn.is-primary {
      background: linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #a78bfa));
      border-color: transparent; color: #fff;
      box-shadow: 0 10px 30px rgba(var(--brand-rgb), 0.32);
    }

    /* The four numbers. A row on a desktop, two-up on a phone -
       never a single column, because four stacked numbers read as
       a list of unrelated facts rather than one summary. */
    .rs-stats {
      display: grid; gap: 10px; margin-block-start: 32px;
      grid-template-columns: repeat(auto-fit, minmax(min(150px, 45%), 1fr));
    }
    .rs-stat {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; padding: 18px 12px; min-width: 0;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .rs-stat:hover {
      transform: translateY(-3px);
      border-color: color-mix(in srgb, var(--brand) 45%, var(--border));
    }
    /* The counting number must not resize the card as it climbs
       from 0 to 100. Tabular figures keep every digit one width. */
    .rs-stat b { font-variant-numeric: tabular-nums; }
    .rs-stat b {
      display: block; font-size: clamp(1.5rem, 4vw, 1.9rem); font-weight: 800;
      letter-spacing: -0.02em; color: var(--brand); line-height: 1.2;
    }
    .rs-stat span {
      display: block; font-size: 0.78em; color: var(--text-dim);
      margin-block-start: 5px; line-height: 1.5;
    }

    .rs-pdf { border-style: dashed; }
    .rs-pdf-hint {
      max-width: 34em; margin: 12px auto 0;
      font-size: 0.78em; color: var(--muted); line-height: 1.7;
    }

    /* ---------- the section strip ----------
       Sticky under the site header, and it scrolls INSIDE itself.
       Six Persian labels are wider than a phone; a strip that made
       the document pan sideways would undo the whole point of the
       page being readable on a phone. */
    .rs-jump {
      position: sticky; top: 8px; z-index: 20;
      margin-block: 4px clamp(28px, 6vw, 44px);
    }
    .rs-jump-row {
      display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none;
      padding: 6px; border-radius: 999px;
      background: color-mix(in srgb, var(--surface) 92%, transparent);
      border: 1px solid var(--border);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      scroll-snap-type: x proximity;
    }
    .rs-jump-row::-webkit-scrollbar { display: none; }
    .rs-jump a {
      flex: none; scroll-snap-align: center;
      padding: 9px 16px; border-radius: 999px; white-space: nowrap;
      font-size: 0.82em; font-weight: 700; text-decoration: none;
      color: var(--text-dim); transition: background 0.18s ease, color 0.18s ease;
    }
    .rs-jump a:hover { color: var(--text); background: var(--surface-2); }
    .rs-jump a.is-here {
      color: #fff;
      background: linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #a78bfa));
    }

    /* ---------- sections ---------- */
    .rs-sec { margin-block: clamp(38px, 8vw, 62px); scroll-margin-top: 82px; }
    .rs-sec > h2 {
      font-size: clamp(1.25rem, 3.4vw, 1.55rem); font-weight: 800;
      letter-spacing: -0.01em; text-align: center;
    }
    .rs-lede {
      color: var(--text-dim); font-size: 0.92em; line-height: 1.85;
      text-align: center; max-width: 46em; margin: 12px auto 26px;
    }
    .rs-prose { max-width: 40em; margin-inline: auto; margin-block-start: 22px; }
    .rs-prose p { line-height: 2; margin-block-end: 16px; color: var(--text-dim); }
    .rs-prose p:last-child { margin-block-end: 0; }

    /* ---------- work ---------- */
    .rs-cards {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
    }
    .rs-card {
      display: flex; flex-direction: column; gap: 9px; min-width: 0;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 22px; text-decoration: none; color: var(--text);
      transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    }
    .rs-card:hover {
      transform: translateY(-3px);
      border-color: color-mix(in srgb, var(--brand) 45%, var(--border));
      background: var(--surface-2);
    }
    .rs-card-top { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
    .rs-card-top b { font-size: 1.06em; font-weight: 800; min-width: 0; overflow-wrap: anywhere; }
    .rs-kind {
      flex: none; font-style: normal; font-size: 0.66em; font-weight: 800;
      letter-spacing: 0.05em; text-transform: uppercase;
      padding: 4px 10px; border-radius: 999px;
      background: var(--surface-2); color: var(--text-dim); border: 1px solid var(--border);
    }
    .rs-game { color: color-mix(in srgb, var(--brand) 70%, var(--text)); }
    .rs-pitch { font-size: 0.9em; color: var(--text-dim); line-height: 1.75; overflow-wrap: anywhere; }
    .rs-tech { font-size: 0.78em; color: var(--muted); overflow-wrap: anywhere; }
    .rs-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-block-start: 2px; }
    .rs-tags i {
      font-style: normal; font-size: 0.72em; padding: 3px 9px; border-radius: 8px;
      background: var(--surface-2); color: var(--text-dim); border: 1px solid var(--border);
    }

    /* ---------- skills ----------
       Cards with rows, not a table. A table needs a horizontal
       scroller on a phone and this page is read on phones; rows
       that wrap need nothing. */
    .rs-skills {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
    }
    .rs-skills-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px 22px; min-width: 0;
    }
    .rs-skills-card h3 {
      font-size: 0.76em; font-weight: 800; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--brand); margin-block-end: 14px;
    }
    .rs-skills-card ul { list-style: none; display: grid; gap: 13px; }
    .rs-skills-card li {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 12px; flex-wrap: wrap; min-width: 0;
    }
    .rs-sk-name { font-size: 0.88em; font-weight: 600; min-width: 0; overflow-wrap: anywhere; flex: 1 1 auto; }
    .rs-sk-right { display: flex; align-items: center; gap: 9px; flex: none; }

    /* Four pips, not a percentage. A percentage on a skill is a
       number nobody can defend; four steps beside the project that
       earned them is a claim somebody can argue with. */
    .rs-pips { display: inline-flex; gap: 3px; }
    .rs-pips i {
      width: 15px; height: 5px; border-radius: 3px;
      background: var(--border); display: block;
    }
    .rs-pips i.on { background: var(--brand); }

    /* The filled pips grow in from the inline start when their card
       arrives, one after another, so the eye reads the row as a
       level rather than as four decorations. transform-origin is
       LOGICAL: on the Persian page the row fills from the right. */
    .js-motion .rs-reveal .rs-pips i.on {
      transform: scaleX(0); transform-origin: left center;
      transition: transform 0.42s cubic-bezier(0.22, 0.68, 0.24, 1);
    }
    [dir="rtl"] .js-motion .rs-reveal .rs-pips i.on { transform-origin: right center; }
    .js-motion .rs-reveal.is-in .rs-pips i.on { transform: scaleX(1); }
    .js-motion .rs-reveal.is-in .rs-pips i.on:nth-child(1) { transition-delay: 0.06s; }
    .js-motion .rs-reveal.is-in .rs-pips i.on:nth-child(2) { transition-delay: 0.13s; }
    .js-motion .rs-reveal.is-in .rs-pips i.on:nth-child(3) { transition-delay: 0.20s; }
    .js-motion .rs-reveal.is-in .rs-pips i.on:nth-child(4) { transition-delay: 0.27s; }
    .rs-sk-ev { font-size: 0.72em; color: var(--muted); white-space: nowrap; }

    /* ---------- certificates ---------- */
    .rs-certs { list-style: none; display: grid; gap: 10px; max-width: 44em; margin-inline: auto; }
    .rs-certs li {
      display: grid; gap: 4px; align-items: center;
      grid-template-columns: 1fr auto;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 15px 18px; min-width: 0;
    }
    .rs-cert-name { font-size: 0.92em; font-weight: 700; overflow-wrap: anywhere; }
    .rs-cert-meta {
      grid-column: 1; font-size: 0.78em; color: var(--text-dim); overflow-wrap: anywhere;
    }
    .rs-cert-tag {
      grid-row: 1 / span 2; grid-column: 2; align-self: center;
      font-size: 0.68em; font-weight: 700; padding: 4px 11px; border-radius: 999px;
      background: var(--surface-2); color: var(--muted); white-space: nowrap;
    }

    .rs-sub {
      text-align: center; font-size: 0.95em; font-weight: 800;
      margin-block: 30px 12px;
    }
    .rs-sub small { font-weight: 600; font-size: 0.82em; color: var(--text-dim); }
    .rs-courses {
      list-style: none; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
    }
    .rs-courses li {
      font-size: 0.82em; color: var(--text-dim);
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 999px; padding: 7px 15px;
    }

    /* ---------- the end ---------- */
    .rs-end { text-align: center; }
    .rs-links { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .rs-link {
      display: inline-flex; align-items: center; min-height: 46px;
      padding: 12px 22px; border-radius: 13px; font-weight: 700; font-size: 0.9em;
      text-decoration: none; border: 1px solid var(--border);
      background: var(--surface); color: var(--text);
      transition: transform 0.18s ease, border-color 0.18s ease;
    }
    .rs-link:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--brand) 45%, var(--border)); }
    .rs-link.is-primary {
      background: linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #a78bfa));
      border-color: transparent; color: #fff;
    }
    .rs-about { margin-block-start: 22px; font-size: 0.86em; color: var(--text-dim); }
    .rs-about a { color: var(--brand); font-weight: 700; }

    @media (max-width: 560px) {
      .rs-certs li { grid-template-columns: 1fr; }
      .rs-cert-tag { grid-row: auto; grid-column: 1; justify-self: start; margin-block-start: 4px; }
      .rs-skills-card li { align-items: flex-start; }
    }

    /* The printed masthead. Hidden on screen - the site header
       already says whose page this is - and the only thing on
       paper that does. */
    .rs-print-head, .rs-print-contact { display: none; }

    /* ==========================================
       Print, which is also the PDF.

       There is no PDF library here and there is not going to be
       one: rule 7 of CLAUDE.md forbids a dependency and a Worker
       has no font stack to lay Persian or Japanese text out with
       anyway. What the browser already has is a typesetter that
       knows all three scripts, has the page's own fonts loaded,
       and writes a real, selectable, searchable PDF. So the
       export IS this stylesheet, and the button only opens the
       dialog.

       Which means every rule below is the document a company
       receives. Three things it has to get right:

         1. COLOUR. The page's tokens are dark by default and a
            dark resume prints as a black rectangle or, with
            backgrounds off, as grey text on white. Every token is
            redefined here for paper, so the sheet is black on
            white whatever theme the reader had on screen.
         2. WHAT IS NOT ON PAPER. Navigation, the language switch,
            the footer, the jump strip, the buttons and the
            back-to-top control are all things to press. A sheet
            of paper has nothing to press.
         3. WHERE THE PAGES BREAK. A skills card split across two
            sheets, or a heading alone at the foot of one, is what
            makes an exported resume look automatic.
       ========================================== */
    @page {
      size: A4;
      margin: 14mm 13mm;
    }

    @media print {
      /* Paper tokens. Overriding the variables rather than the
         rules means every component below keeps its own layout
         and only changes colour - one place to look when the
         printed sheet is wrong. */
      :root, :root[data-theme="dark"], :root[data-theme="light"] {
        --bg-1: #ffffff; --bg-2: #ffffff;
        --surface: #ffffff; --surface-2: #ffffff;
        --border: #c9cedb;
        --text: #111318; --text-dim: #333844; --muted: #565d6e;
        --brand: #4a3fd0;
        color-scheme: light;
      }
      body {
        background: #fff !important;
        color: #111318;
        font-size: 10.2pt; line-height: 1.62;
      }
      .wrap { max-width: none; padding: 0; }
      #main { padding-block-start: 0; }

      /* Everything that exists to be pressed. */
      .ac-nav, .ac-foot, .ac-top, .ac-skip, .ac-crumbs,
      .rs-jump, .rs-cta, .rs-pdf-hint, .rs-links { display: none !important; }

      /* No animation on paper: a rule that starts at opacity 0
         prints a blank sheet if the observer has not run. */
      .js-motion .rs-rise > *, .js-motion .rs-reveal,
      .js-motion .rs-reveal .rs-pips i.on {
        animation: none !important; transition: none !important;
        opacity: 1 !important; transform: none !important;
      }

      .rs-print-head {
        display: flex; justify-content: space-between; gap: 16px;
        font-size: 8.4pt; color: #565d6e; padding-block-end: 7px;
        border-block-end: 1px solid #c9cedb; margin-block-end: 16px;
      }

      .rs-hero { padding-block: 0 14px; }
      .rs-hero::before { display: none; }
      .rs-mark {
        width: 46px; height: 46px; border-radius: 12px;
        margin-block-end: 10px; box-shadow: none;
      }
      .rs-mark img { width: 34px; height: 34px; }
      .rs-hero h1 { font-size: 21pt; margin-block: 5px 7px; }
      .rs-role { font-size: 8pt; }
      .rs-tagline { font-size: 10.4pt; line-height: 1.65; }
      .rs-stats { margin-block-start: 16px; gap: 7px; grid-template-columns: repeat(4, 1fr); }
      .rs-stat { padding: 9px 7px; border-radius: 9px; }
      .rs-stat b { font-size: 14pt; }
      .rs-stat span { font-size: 7.4pt; }

      .rs-sec { margin-block: 18px; }
      .rs-sec > h2 { font-size: 12.6pt; }
      .rs-lede { font-size: 9pt; margin-block-end: 12px; }
      .rs-prose { margin-block-start: 12px; }
      .rs-prose p { line-height: 1.72; margin-block-end: 9px; }

      .rs-cards, .rs-skills { gap: 8px; grid-template-columns: 1fr 1fr; }
      .rs-card, .rs-skills-card { padding: 12px 14px; border-radius: 10px; }
      .rs-card { color: #111318; }
      .rs-skills-card ul { gap: 8px; }
      .rs-certs { gap: 6px; }
      .rs-certs li { padding: 9px 12px; border-radius: 9px; }
      .rs-courses li { padding: 4px 10px; font-size: 8.4pt; }

      /* A pip is a coloured block, and a browser printing with
         backgrounds off drops it. Forcing the colour is the one
         place on this sheet where that is worth doing: without it
         every skill reads as level zero. */
      .rs-pips i { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .rs-pips i.on { background: #4a3fd0 !important; }
      .rs-pips i { background: #dcdfe8 !important; }

      /* The breaks. A card, a certificate row and a skills group
         are each one idea and none of them survives being cut. */
      .rs-card, .rs-skills-card, .rs-certs li, .rs-stat {
        break-inside: avoid; page-break-inside: avoid;
      }
      .rs-sec { break-inside: auto; }
      .rs-sec > h2 { break-after: avoid; page-break-after: avoid; }
      #focus, #certificates { break-before: auto; }

      .rs-print-contact {
        display: flex; flex-wrap: wrap; justify-content: center;
        gap: 6px 22px; list-style: none; margin-block-start: 10px;
        font-size: 9.6pt; color: #111318;
      }
      .rs-print-contact li { direction: ltr; unicode-bidi: isolate; }

      a { color: #111318; text-decoration: none; }
      .rs-about { display: none; }
    }
  `
}
