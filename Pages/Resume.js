// ==========================================
// Pages/Resume.js
// /resume - the formal counterpart to /about.
//
// Why two pages about one person
//
// /about is written in the first person, casually, and is the page
// somebody reads because they liked a game and wondered who made
// it. It is good at exactly that and is deliberately left alone.
//
// This is the page a studio's hiring lead, a client, or a
// publisher's producer opens. Same facts, different register:
// what was built, what it was built with, at what level, and what
// is being looked for next. It does not repeat the jokes and it
// does not hedge.
//
// What is NOT here, on purpose
//
//   - The legal name. It appears on the certificates and the owner
//     does not publish it. Nothing on this site does, and adding
//     it to a resume page is exactly how it would first appear.
//   - Certificate FILES. Same reason: every one of them carries
//     the name and, on two of them, more. They are listed as
//     facts - issuer, subject, year - and not linked.
//   - YouTube. Every other account in CONFIG.SOCIAL is here; the
//     owner asked for that one to stay off this page.
//   - A photograph, a location, an age, an availability date.
//
// Public entry (wired in Worker.js ROUTES):
//   handleResume  GET /resume
// ==========================================

import { CONFIG } from '../Config.js'
import { getPageHead } from '../Core/DesignSystem.js'
import { createHtmlResponse } from '../Core/Http.js'
import { escapeHtml } from '../Core/Html.js'
import { themeBootScript } from '../Core/PageChrome.js'
import { seoHead, breadcrumbLd, personLd, keywordList } from '../Core/Seo.js'
import { localizedPath } from '../Core/Locale.js'
import {
  siteNavCss, siteHeader, siteBreadcrumb, siteFooter, siteBackToTop, siteChromeScript, NAV_I18N
} from '../Core/SiteNav.js'
import {
  dirFor, langCookieHeader, parseCookies, resolveLang, resolveRequestLang, resolveRequestTheme,
  themeAttribute
} from '../Core/RequestContext.js'


const PAGE_PATH = '/resume'


// ==========================================
// The skill matrix.
//
// Levels are assigned from what the projects actually required,
// not from how long the tool has been used - which is the number
// most self-assessments quietly report instead.
//
// The scale, and what earns each step:
//
//   4  Built and shipped systems in it that other people rely on,
//      including the parts that only show up under load or on
//      somebody else's device.
//   3  Shipped real features with it; comfortable without a
//      tutorial open; knows where its sharp edges are.
//   2  Has used it for real work and would need to look things up.
//   1  Read it, changed it, would not claim it.
//
// The evidence column is what makes this checkable rather than a
// claim: every entry names a thing on this site that used it.
// ==========================================
const SKILLS = [
  {
    group: 'unity',
    rows: [
      { name: 'C# — 2D gameplay systems', level: 4, ev: 'evNeon' },
      { name: 'Unity Editor extensions', level: 4, ev: 'evDocSnap' },
      { name: 'Unity Engine (2021.3 LTS → 6)', level: 4, ev: 'evBoth' },
      { name: 'C# — 3D mobile', level: 3, ev: 'evChrono' },
      { name: 'Mobile build and optimisation', level: 3, ev: 'evAndroid' },
      { name: 'TextMeshPro, fonts, RTL shaping', level: 4, ev: 'evDirectTmp' },
      { name: 'IL2CPP, stripping, link.xml', level: 3, ev: 'evAndroid' }
    ]
  },
  {
    group: 'backend',
    rows: [
      { name: 'JavaScript (ES modules, no build step)', level: 4, ev: 'evWorker' },
      { name: 'Cloudflare Workers', level: 4, ev: 'evWorker' },
      { name: 'SQL / D1 schema design', level: 3, ev: 'evDb' },
      { name: 'OAuth 2.0, JWT verification', level: 3, ev: 'evOauth' },
      { name: 'REST API design for game clients', level: 4, ev: 'evApi' },
      { name: 'Payments, webhooks, idempotent fulfilment', level: 3, ev: 'evCheckout' },
      { name: 'Licensing, key signing, device activation', level: 3, ev: 'evLicense' }
    ]
  },
  {
    group: 'web',
    rows: [
      { name: 'HTML & CSS (responsive, RTL, theming)', level: 4, ev: 'evSite' },
      { name: 'Technical SEO & structured data', level: 3, ev: 'evSeo' },
      { name: 'Accessibility and i18n (fa / en / ja)', level: 3, ev: 'evI18n' },
      { name: 'Python', level: 2, ev: 'evPython' },
      { name: 'Git and release discipline', level: 3, ev: 'evGit' }
    ]
  }
]


// ==========================================
// Certificates.
//
// Listed, never linked and never uploaded: each document carries
// the owner's legal name, which this site does not publish. Year
// and issuer are the parts a reader actually checks against.
// ==========================================
const CERTIFICATES = [
  { key: 'cTopLearn', year: '', issuer: 'TopLearn' },
  { key: 'cInstitute', year: '۱۳۹۹ / 2020', issuer: 'Iran National Games Institute' },
  { key: 'cSeGaP', year: '2021', issuer: 'Serious Games Prize — SeGaP' },
  { key: 'cGoogle', year: '2022', issuer: 'Google Digital Garage' }
]

// The supplementary courses, as a compact list. Terms rather than
// hours, because that is the unit the academy issued them in.
const COURSES = ['crScratch', 'crPython', 'crAppInventor', 'crWeb']


// ==========================================
// i18n
// ==========================================
const I18N = {
  fa: {
    locale: 'fa-IR',
    metaTitle: 'رزومه — AmirCollider',
    metaDesc: 'رزومه‌ی حرفه‌ای AmirCollider: توسعه‌ی بازی با یونیتی و C#، افزونه‌های ادیتور، بک‌اند روی Cloudflare Workers، به‌همراه پروژه‌ها، سطح مهارت‌ها و گواهینامه‌ها.',
    crumb: 'رزومه',

    h1: 'رزومه',
    role: 'توسعه‌دهنده‌ی بازی — یونیتی و C#',
    tagline: 'ساخت بازی موبایل و ابزار ادیتور، به‌همراه بک‌اندی که خودم نوشته‌ام و در حال سرویس‌دهی است.',
    contactCta: 'ارتباط با من',
    toolsCta: 'ابزارها',

    summaryHead: 'خلاصه',
    summary: [
      'توسعه‌دهنده‌ی بازی با تمرکز بر یونیتی و C#. از هشت‌سالگی برنامه‌نویسی را خودآموز شروع کرده‌ام و امروز کار من سه لایه دارد که هر سه را خودم می‌نویسم: بازی، ابزارِ ساختِ بازی، و سرویسی که پشت هر دو کار می‌کند.',
      'تخصص اصلی من سیستم‌ها و مکانیک‌های ۲بعدی در یونیتی است؛ در این حوزه پیاده‌سازی هر سیستمی — از ذخیره‌ی ابری و لیدربورد تا فروشگاه درون‌برنامه‌ای و اقتصاد بازی — کار روزمره‌ی من است. پروژه‌های سه‌بعدی موبایل را هم در سطح تولید جلو برده‌ام.',
      'در کنار آن، یک افزونه‌ی تجاری برای ادیتور یونیتی نوشته‌ام که فروخته می‌شود و لایسنس دارد، و کل زیرساخت پشت آن — احراز هویت، پرداخت، صدور و فعال‌سازی کلید، تحویل ایمیل — روی Cloudflare Workers و D1 نوشته‌ی خودم است.'
    ],

    focusHead: 'چه چیزی را دنبال می‌کنم',
    focus: [
      'تا امروز مستقل کار کرده‌ام: پروژه‌ها را خودم تعریف، اجرا و منتشر کرده‌ام و همه‌شان زنده و قابل بررسی‌اند. سابقه‌ی استخدام در شرکت را ندارم و این را همین‌جا صریح می‌گویم؛ چیزی که به‌جایش دارم، محصولاتی است که کار می‌کنند و کدی که خودم نگه‌داری می‌کنم.',
      'دنبال کار در یک تیم حرفه‌ای هستم — به‌عنوان برنامه‌نویس گیم‌پلی یا توسعه‌دهنده‌ی ابزار. جایی که کد ریویو شود، کسی از من ایراد بگیرد و مقیاس کار از چیزی که یک نفر تنها می‌تواند نگه دارد بزرگ‌تر باشد. دورکاری یا حضوری، هر دو.'
    ],

    workHead: 'پروژه‌ها',
    workLede: 'همه‌ی این‌ها منتشر شده‌اند و از همین سایت قابل دیدن‌اند.',

    skillsHead: 'مهارت‌های فنی',
    skillsLede: 'سطح‌ها بر اساس کاری که واقعاً با آن ابزار انجام شده تعیین شده‌اند، نه بر اساس مدت آشنایی. ستون آخر می‌گوید هر کدام کجا استفاده شده است.',
    gUnity: 'یونیتی و C#',
    gBackend: 'بک‌اند و سرویس',
    gWeb: 'وب و ابزار',
    colSkill: 'مهارت',
    colLevel: 'سطح',
    colEvidence: 'کجا',
    lvl4: 'حرفه‌ای',
    lvl3: 'مسلط',
    lvl2: 'در حد کار',
    lvl1: 'آشنا',

    evNeon: 'Neon Katana',
    evChrono: 'Chrono Blades',
    evBoth: 'هر دو بازی + هر دو افزونه',
    evDocSnap: 'Unity DocSnap',
    evDirectTmp: 'Unity DirectTMP',
    evAndroid: 'بیلدهای اندروید',
    evWorker: 'همین سایت و API آن',
    evDb: 'D1 — سه دیتابیس',
    evOauth: 'ورود با گوگل',
    evApi: 'API بازی‌ها',
    evCheckout: 'چک‌اوت DocSnap',
    evLicense: 'سیستم لایسنس DocSnap',
    evSite: 'همین سایت',
    evSeo: 'sitemap و structured data سایت',
    evI18n: 'سه‌زبانه بودن کل سایت',
    evPython: 'اسکریپت‌های جانبی',
    evGit: 'مخازن گیت‌هاب',

    certHead: 'گواهینامه‌ها',
    certLede: 'فایل این گواهی‌ها روی سایت منتشر نشده، چون نام و مشخصات شخصی روی همه‌شان هست. در صورت نیاز مستقیم ارسال می‌شود.',
    cTopLearn: 'آموزش جامع ساخت بازی با یونیتی (پروژه‌محور)',
    cInstitute: 'دوره‌ی تخصصی بازی‌سازی با یونیتی',
    cSeGaP: 'مدرسه‌ی بازی‌های جدی شناختی',
    cGoogle: 'Google Digital Garage — بازاریابی و توسعه‌ی دیجیتال',
    certOnRequest: 'ارائه در صورت درخواست',

    courseHead: 'دوره‌های تکمیلی',
    courseSub: 'آکادمی یاسان',
    crScratch: 'چهار ترم برنامه‌نویسی تخصصی اسکرچ',
    crPython: 'دو ترم برنامه‌نویسی با پایتون',
    crAppInventor: 'دو ترم برنامه‌نویسی با اپ اینونتور',
    crWeb: 'یک ترم طراحی وب‌سایت',

    linksHead: 'لینک‌ها',
    lGithub: 'گیت‌هاب',
    lSite: 'وب‌سایت',
    lInstagram: 'اینستاگرام',
    lX: 'X',
    lContact: 'فرم تماس',

    aboutLink: 'نسخه‌ی خودمانی‌تر این صفحه در «درباره‌ی من» است.',
    aboutLinkCta: 'درباره‌ی من'
  },

  en: {
    locale: 'en-US',
    metaTitle: 'Resume — AmirCollider',
    metaDesc: 'The professional resume of AmirCollider: Unity and C# game development, editor extensions, and a self-built Cloudflare Workers backend — with projects, skill levels and certificates.',
    crumb: 'Resume',

    h1: 'Resume',
    role: 'Game developer — Unity and C#',
    tagline: 'Mobile games and editor tooling, on top of a backend I wrote and still run.',
    contactCta: 'Get in touch',
    toolsCta: 'The tools',

    summaryHead: 'Summary',
    summary: [
      'Game developer working in Unity and C#. Self-taught from the age of eight, and the work now sits in three layers I write all of: the game, the tooling that builds the game, and the service behind both.',
      'The core of it is 2D systems and mechanics in Unity — cloud save, leaderboards, in-app stores and their economies are ordinary work rather than a stretch. I have taken 3D mobile projects to production as well.',
      'Alongside that I build and sell a commercial Unity Editor extension with its own licensing, and the whole infrastructure under it — authentication, payments, key issuing and activation, email delivery — is mine, on Cloudflare Workers and D1.'
    ],

    focusHead: 'What I am looking for',
    focus: [
      'I have worked independently so far: I defined, built and shipped these projects myself, and every one of them is live and can be inspected. I have not been employed at a studio, and I would rather say that plainly than dress it up — what I have instead is products that work and code I still maintain.',
      'I am looking to join a professional team as a gameplay or tools programmer. Somewhere code gets reviewed, somebody argues with me about it, and the scale is larger than one person can hold. Remote or on-site, either works.'
    ],

    workHead: 'Projects',
    workLede: 'All shipped, and all reachable from this site.',

    skillsHead: 'Technical skills',
    skillsLede: 'Levels are set by what the work actually required, not by how long the tool has been open. The last column says where each one was used.',
    gUnity: 'Unity and C#',
    gBackend: 'Backend and services',
    gWeb: 'Web and tooling',
    colSkill: 'Skill',
    colLevel: 'Level',
    colEvidence: 'Where',
    lvl4: 'Advanced',
    lvl3: 'Proficient',
    lvl2: 'Working',
    lvl1: 'Familiar',

    evNeon: 'Neon Katana',
    evChrono: 'Chrono Blades',
    evBoth: 'both games and both packages',
    evDocSnap: 'Unity DocSnap',
    evDirectTmp: 'Unity DirectTMP',
    evAndroid: 'the Android builds',
    evWorker: 'this site and its API',
    evDb: 'D1 — three databases',
    evOauth: 'Google sign-in',
    evApi: 'the games API',
    evCheckout: 'the DocSnap checkout',
    evLicense: 'DocSnap licensing',
    evSite: 'this site',
    evSeo: 'the site sitemap and structured data',
    evI18n: 'the whole site in three languages',
    evPython: 'supporting scripts',
    evGit: 'the GitHub repositories',

    certHead: 'Certificates',
    certLede: 'The documents themselves are not published here — every one of them carries my legal name and personal details. They can be sent directly on request.',
    cTopLearn: 'Complete Unity game development (project-based)',
    cInstitute: 'Unity game development, specialist course',
    cSeGaP: 'School of Cognitive Serious Games',
    cGoogle: 'Google Digital Garage — digital marketing and development',
    certOnRequest: 'available on request',

    courseHead: 'Earlier coursework',
    courseSub: 'Yasan Academy',
    crScratch: 'Four terms of Scratch programming',
    crPython: 'Two terms of Python',
    crAppInventor: 'Two terms of App Inventor',
    crWeb: 'One term of web design',

    linksHead: 'Links',
    lGithub: 'GitHub',
    lSite: 'Website',
    lInstagram: 'Instagram',
    lX: 'X',
    lContact: 'Contact form',

    aboutLink: 'There is a less formal version of this page under About me.',
    aboutLinkCta: 'About me'
  },

  ja: {
    locale: 'ja-JP',
    metaTitle: '経歴 — AmirCollider',
    metaDesc: 'AmirCollider の職務経歴。Unity と C# によるゲーム開発、エディタ拡張、自作の Cloudflare Workers バックエンド、実績・スキルレベル・資格をまとめています。',
    crumb: '経歴',

    h1: '経歴',
    role: 'ゲーム開発者 — Unity / C#',
    tagline: 'モバイルゲームとエディタツール、そしてその両方を支える自作のバックエンド。',
    contactCta: 'お問い合わせ',
    toolsCta: 'ツール',

    summaryHead: '概要',
    summary: [
      'Unity と C# を中心に活動するゲーム開発者です。8 歳から独学でプログラミングを始め、現在の仕事は 3 つの層すべてを自分で書いています。ゲーム本体、それを作るためのツール、そして両者を支えるサービスです。',
      '中心は Unity での 2D システムとメカニクスです。クラウドセーブ、リーダーボード、アプリ内ストアとその経済設計は日常的な作業です。3D モバイルプロジェクトも製品版まで進めた経験があります。',
      'あわせて、ライセンス機能を備えた商用の Unity エディタ拡張を開発・販売しており、その基盤 — 認証、決済、キーの発行と有効化、メール配信 — はすべて Cloudflare Workers と D1 上に自分で構築したものです。'
    ],

    focusHead: '希望する働き方',
    focus: [
      'これまでは個人で活動してきました。企画・開発・公開をすべて自分で行い、そのすべてが現在も稼働していて確認できます。スタジオでの勤務経験はありません。その点は率直にお伝えします。代わりにあるのは、実際に動く製品と、今も自分で保守しているコードです。',
      '今後はプロのチームで、ゲームプレイまたはツールのプログラマーとして働きたいと考えています。コードがレビューされ、誰かが指摘してくれて、規模が一人で抱えられる範囲を超えている場所です。リモートでも出社でも構いません。'
    ],

    workHead: '制作物',
    workLede: 'いずれも公開済みで、このサイトから確認できます。',

    skillsHead: '技術スキル',
    skillsLede: 'レベルは触れてきた期間ではなく、実際に必要とされた作業内容に基づいています。右端の列は、それぞれをどこで使ったかを示しています。',
    gUnity: 'Unity / C#',
    gBackend: 'バックエンド・サービス',
    gWeb: 'Web・ツール',
    colSkill: 'スキル',
    colLevel: 'レベル',
    colEvidence: '使用箇所',
    lvl4: '上級',
    lvl3: '実務レベル',
    lvl2: '業務経験あり',
    lvl1: '基礎',

    evNeon: 'Neon Katana',
    evChrono: 'Chrono Blades',
    evBoth: '2 本のゲームと 2 つのパッケージ',
    evDocSnap: 'Unity DocSnap',
    evDirectTmp: 'Unity DirectTMP',
    evAndroid: 'Android ビルド',
    evWorker: 'このサイトとその API',
    evDb: 'D1 — 3 つのデータベース',
    evOauth: 'Google サインイン',
    evApi: 'ゲーム API',
    evCheckout: 'DocSnap の決済',
    evLicense: 'DocSnap のライセンス',
    evSite: 'このサイト',
    evSeo: 'サイトの sitemap と構造化データ',
    evI18n: 'サイト全体の 3 言語対応',
    evPython: '補助スクリプト',
    evGit: 'GitHub リポジトリ',

    certHead: '資格・修了証',
    certLede: '証書そのものは公開していません。いずれにも本名と個人情報が記載されているためです。ご要望があれば直接お送りします。',
    cTopLearn: 'Unity ゲーム開発 総合講座 (プロジェクト形式)',
    cInstitute: 'Unity ゲーム開発 専門コース',
    cSeGaP: '認知シリアスゲーム スクール',
    cGoogle: 'Google Digital Garage — デジタルマーケティングと開発',
    certOnRequest: 'ご要望に応じて提出',

    courseHead: 'これまでの受講歴',
    courseSub: 'Yasan Academy',
    crScratch: 'Scratch プログラミング 4 学期',
    crPython: 'Python 2 学期',
    crAppInventor: 'App Inventor 2 学期',
    crWeb: 'Web デザイン 1 学期',

    linksHead: 'リンク',
    lGithub: 'GitHub',
    lSite: 'ウェブサイト',
    lInstagram: 'Instagram',
    lX: 'X',
    lContact: 'お問い合わせフォーム',

    aboutLink: 'よりくだけた内容は「私について」のページにあります。',
    aboutLinkCta: '私について'
  }
}


// ==========================================
// The portfolio.
//
// Built from the live registry and CONFIG rather than written out,
// so a game added in Config.js appears here on the next deploy and
// a version bump is never a second place to remember. Every entry
// links to the page that proves it.
// ==========================================
function projects(games, lang) {
  const rows = []

  for (const game of Object.values(games || {})) {
    if (!game || !game.id) continue

    // What the game actually does, read off its capabilities -
    // so a resume can never claim a system the build does not have.
    const caps = game.capabilities || {}
    const built = []
    if (caps.login) built.push('OAuth')
    if (caps.cloudSave) built.push('cloud save')
    if (caps.leaderboard) built.push('leaderboard')
    if (caps.store) built.push('in-app store')

    rows.push({
      name: game.name,
      href: '/' + game.id,
      kind: 'game',
      tech: 'Unity · C# · Android',
      built,
      products: ((game.store && game.store.products) || []).length
    })
  }

  rows.push({
    name: 'Unity DocSnap',
    href: '/unity-docsnap',
    kind: 'tool',
    tech: 'Unity Editor · C# · commercial',
    built: ['licensing', 'device activation', 'crypto checkout', 'offline HTML export'],
    version: CONFIG.DOCSNAP.VERSION
  })

  rows.push({
    name: 'Unity DirectTMP',
    href: '/unity-directtmp',
    kind: 'tool',
    tech: 'Unity · C# · MIT, open source',
    built: ['GSUB font tables', 'RTL shaping', 'HarfBuzz-verified glyphs'],
    version: CONFIG.DIRECTTMP.VERSION
  })

  rows.push({
    name: 'amircollider.com',
    href: '/',
    kind: 'service',
    tech: 'Cloudflare Workers · D1 · R2',
    built: ['games API', 'OAuth proxy', 'payments', 'licensing', 'operator panels', 'mailbox']
  })

  return rows
}


// ==========================================
// renderPage
// ==========================================
function renderPage(lang, theme, games) {
  const t = I18N[lang] || I18N.fa
  const nav = NAV_I18N[lang] || NAV_I18N.fa
  const dir = dirFor(lang)
  const themeAttr = themeAttribute(theme)
  const levelWord = level => t['lvl' + level]

  const trail = [
    { href: '/', label: nav.home },
    { href: PAGE_PATH, label: t.crumb }
  ]

  const summary = t.summary.map(line => `<p>${escapeHtml(line)}</p>`).join('')
  const focus = t.focus.map(line => `<p>${escapeHtml(line)}</p>`).join('')

  const work = projects(games, lang).map(item => `
        <article class="rs-item">
          <div class="rs-item-head">
            <h3><a href="${escapeHtml(localizedPath(item.href, lang))}">${escapeHtml(item.name)}</a></h3>
            <span class="rs-kind rs-${item.kind}">${escapeHtml(item.kind)}</span>
          </div>
          <p class="rs-tech">${escapeHtml(item.tech)}${item.version ? ' · v' + escapeHtml(item.version) : ''}</p>
          ${item.built.length
            ? '<ul class="rs-built">' + item.built.map(b => `<li>${escapeHtml(b)}</li>`).join('') + '</ul>'
            : ''}
        </article>`).join('')

  const groupLabel = { unity: t.gUnity, backend: t.gBackend, web: t.gWeb }

  const skills = SKILLS.map(group => `
        <div class="rs-skill-group">
          <h3>${escapeHtml(groupLabel[group.group])}</h3>
          <div class="rs-table-scroll">
            <table class="rs-table">
              <thead>
                <tr>
                  <th>${escapeHtml(t.colSkill)}</th>
                  <th>${escapeHtml(t.colLevel)}</th>
                  <th>${escapeHtml(t.colEvidence)}</th>
                </tr>
              </thead>
              <tbody>
                ${group.rows.map(row => `
                <tr>
                  <td class="rs-skill-name">${escapeHtml(row.name)}</td>
                  <td>
                    <span class="rs-bar" role="img"
                          aria-label="${escapeHtml(levelWord(row.level))}">
                      ${[1, 2, 3, 4].map(step =>
                        `<i class="${step <= row.level ? 'on' : ''}"></i>`).join('')}
                    </span>
                    <span class="rs-lvl">${escapeHtml(levelWord(row.level))}</span>
                  </td>
                  <td class="rs-ev">${escapeHtml(t[row.ev] || '')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`).join('')

  const certs = CERTIFICATES.map(cert => `
        <li class="rs-cert">
          <span class="rs-cert-main">
            <b>${escapeHtml(t[cert.key])}</b>
            <small>${escapeHtml(cert.issuer)}${cert.year ? ' · ' + escapeHtml(cert.year) : ''}</small>
          </span>
          <span class="rs-cert-tag">${escapeHtml(t.certOnRequest)}</span>
        </li>`).join('')

  const courses = COURSES.map(key => `<li>${escapeHtml(t[key])}</li>`).join('')

  // Every account except YouTube, which the owner asked to keep off
  // this page. Read from CONFIG.SOCIAL so a changed handle is one
  // edit; the omission is a filter here rather than a shorter list
  // there, because the footer and the About page still link it.
  const links = [
    { href: CONFIG.SOCIAL.github, label: t.lGithub },
    { href: CONFIG.SOCIAL.instagram, label: t.lInstagram },
    { href: CONFIG.SOCIAL.x, label: t.lX }
  ].filter(entry => entry.href).map(entry =>
    `<li><a href="${escapeHtml(entry.href)}" rel="noopener me">${escapeHtml(entry.label)}</a></li>`
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
        ? ['رزومه برنامه‌نویس بازی', 'توسعه‌دهنده یونیتی', 'استخدام برنامه‌نویس C#', 'رزومه بازی‌سازی']
        : lang === 'ja'
          ? ['ゲーム開発者 経歴', 'Unity エンジニア', 'C# プログラマー 採用']
          : ['Unity developer resume', 'game programmer CV', 'C# gameplay programmer', 'hire Unity developer']
    ),

    // The page emits its own ProfilePage-shaped node below, so
    // seoHead does not add a second WebPage for the same document.
    webPage: false,
    graph: [
      breadcrumbLd(trail, lang),

      // The same Person the About page declares, pointed at from a
      // second page rather than duplicated as a second person.
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
  <style>${siteNavCss()}${css()}</style>
</head>
<body>
  ${siteHeader({ lang, active: 'about', path: PAGE_PATH })}
  <div class="wrap">
    ${siteBreadcrumb({ lang, trail })}
    <main id="main" class="rs">

      <header class="rs-hero">
        <p class="rs-role">${escapeHtml(t.role)}</p>
        <h1>${escapeHtml(t.h1)}</h1>
        <p class="rs-tagline">${escapeHtml(t.tagline)}</p>
        <div class="rs-cta">
          <a class="rs-btn primary" href="${escapeHtml(localizedPath('/contact', lang))}">${escapeHtml(t.contactCta)}</a>
          <a class="rs-btn" href="${escapeHtml(localizedPath('/tools', lang))}">${escapeHtml(t.toolsCta)}</a>
        </div>
      </header>

      <section class="rs-sec">
        <h2>${escapeHtml(t.summaryHead)}</h2>
        <div class="rs-prose">${summary}</div>
      </section>

      <section class="rs-sec">
        <h2>${escapeHtml(t.workHead)}</h2>
        <p class="rs-lede">${escapeHtml(t.workLede)}</p>
        <div class="rs-items">${work}</div>
      </section>

      <section class="rs-sec">
        <h2>${escapeHtml(t.skillsHead)}</h2>
        <p class="rs-lede">${escapeHtml(t.skillsLede)}</p>
        ${skills}
      </section>

      <section class="rs-sec">
        <h2>${escapeHtml(t.focusHead)}</h2>
        <div class="rs-prose">${focus}</div>
      </section>

      <section class="rs-sec">
        <h2>${escapeHtml(t.certHead)}</h2>
        <p class="rs-lede">${escapeHtml(t.certLede)}</p>
        <ul class="rs-certs">${certs}</ul>

        <h3 class="rs-sub">${escapeHtml(t.courseHead)}
          <small>${escapeHtml(t.courseSub)}</small></h3>
        <ul class="rs-courses">${courses}</ul>
      </section>

      <section class="rs-sec">
        <h2>${escapeHtml(t.linksHead)}</h2>
        <ul class="rs-links">
          ${links}
          <li><a href="${escapeHtml(localizedPath('/contact', lang))}">${escapeHtml(t.lContact)}</a></li>
        </ul>
        <p class="rs-lede" style="margin-top:16px">${escapeHtml(t.aboutLink)}
          <a href="${escapeHtml(localizedPath('/about', lang))}">${escapeHtml(t.aboutLinkCta)}</a></p>
      </section>

    </main>
    ${siteFooter({ lang })}
  </div>
  ${siteBackToTop({ lang })}
  ${siteChromeScript()}
</body>
</html>`
}


// ==========================================
// Handler
// ==========================================
export async function handleResume(url, request, gameId, requestId, GAMES) {
  const cookies = parseCookies(request)
  const lang = resolveLang(resolveRequestLang(url, request, cookies))
  const theme = resolveRequestTheme(cookies)

  return createHtmlResponse(renderPage(lang, theme, GAMES), 200, langCookieHeader(url, lang))
}


// ==========================================
// css
//
// Restrained on purpose. This page is read by somebody deciding
// whether to reply to an email, often on a phone, often quickly -
// so it is a document first: generous line height, one accent, and
// a skill table that stays a table.
//
// Every grid floor is min(x, 100%) and every table sits in its own
// horizontal scroller, which is what stops the page panning
// sideways on a 320px screen. Both are the mistakes the rest of
// this site had to be fixed for; making them again here would be
// careless.
// ==========================================
function css() {
  return `
    .rs { max-width: 860px; margin-inline: auto; padding-inline: 4px; }

    .rs-hero { padding-block: 28px 10px; }
    .rs-role {
      font-size: .82rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase;
      color: var(--brand, #3d7bd9);
    }
    .rs-hero h1 {
      font-size: clamp(2rem, 6vw, 2.9rem); font-weight: 800;
      letter-spacing: -.02em; margin-block: 6px 10px;
    }
    .rs-tagline { color: var(--text-dim, #5d6880); font-size: 1.03rem; line-height: 1.8; max-width: 620px; }

    .rs-cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    .rs-btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 46px; padding: 12px 22px; border-radius: 12px;
      font-weight: 700; font-size: .93rem; text-decoration: none;
      border: 1px solid var(--border, #dbe1ee);
      background: var(--surface, #fff); color: var(--text, #141a26);
      transition: transform .16s ease, filter .16s ease;
    }
    .rs-btn:hover { transform: translateY(-1px); text-decoration: none; }
    .rs-btn.primary {
      background: var(--brand, #3d7bd9); border-color: var(--brand, #3d7bd9); color: #fff;
    }

    .rs-sec { margin-block: 40px; }
    .rs-sec > h2 {
      font-size: 1.32rem; font-weight: 800; letter-spacing: -.01em;
      padding-block-end: 10px; margin-block-end: 16px;
      border-block-end: 2px solid var(--border, #dbe1ee);
    }
    .rs-lede { color: var(--text-dim, #5d6880); font-size: .92rem; line-height: 1.8; margin-block-end: 16px; }
    .rs-prose p { line-height: 1.9; margin-block-end: 14px; }
    .rs-prose p:last-child { margin-block-end: 0; }

    /* ---------- projects ---------- */
    .rs-items {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
    }
    .rs-item {
      background: var(--surface, #fff); border: 1px solid var(--border, #dbe1ee);
      border-radius: 14px; padding: 18px; min-width: 0;
    }
    .rs-item-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
    .rs-item h3 { font-size: 1.02rem; font-weight: 800; min-width: 0; overflow-wrap: anywhere; }
    .rs-item h3 a { text-decoration: none; }
    .rs-item h3 a:hover { text-decoration: underline; }
    .rs-kind {
      flex: none; font-size: .66rem; font-weight: 800; letter-spacing: .05em;
      text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
      background: var(--surface-2, #f4f6fb); color: var(--text-dim, #5d6880);
      border: 1px solid var(--border, #dbe1ee);
    }
    .rs-tech {
      font-size: .8rem; color: var(--text-dim, #5d6880);
      margin-block: 8px 10px; overflow-wrap: anywhere;
    }
    .rs-built { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
    .rs-built li {
      font-size: .74rem; padding: 3px 9px; border-radius: 8px;
      background: var(--surface-2, #f4f6fb); color: var(--text-dim, #5d6880);
    }

    /* ---------- skills ---------- */
    .rs-skill-group { margin-block-end: 26px; }
    .rs-skill-group h3 {
      font-size: .82rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
      color: var(--text-dim, #5d6880); margin-block-end: 10px;
    }

    /* The table is allowed to scroll inside this box and nowhere
       else. A skill table on a 320px phone is wider than the
       screen and always will be; the choice is a scroller here or
       the whole page moving. */
    .rs-table-scroll { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border, #dbe1ee); }
    .rs-table { width: 100%; border-collapse: collapse; background: var(--surface, #fff); min-width: 420px; }
    .rs-table th {
      text-align: start; font-size: .72rem; font-weight: 800; letter-spacing: .05em;
      text-transform: uppercase; color: var(--text-dim, #5d6880);
      padding: 11px 14px; background: var(--surface-2, #f4f6fb);
      border-block-end: 1px solid var(--border, #dbe1ee); white-space: nowrap;
    }
    .rs-table td {
      padding: 11px 14px; font-size: .88rem;
      border-block-end: 1px solid var(--border, #dbe1ee); vertical-align: middle;
    }
    .rs-table tr:last-child td { border-block-end: 0; }
    .rs-skill-name { font-weight: 600; overflow-wrap: anywhere; }
    .rs-ev { color: var(--text-dim, #5d6880); font-size: .82rem; overflow-wrap: anywhere; }

    /* Four pips rather than a percentage. A percentage on a skill
       is a number nobody can defend; four steps with a word beside
       them is a claim that can be argued with, which is the point. */
    .rs-bar { display: inline-flex; gap: 3px; vertical-align: middle; }
    .rs-bar i {
      width: 16px; height: 6px; border-radius: 3px;
      background: var(--border, #dbe1ee); display: block;
    }
    .rs-bar i.on { background: var(--brand, #3d7bd9); }
    .rs-lvl {
      display: block; font-size: .72rem; color: var(--text-dim, #5d6880);
      margin-block-start: 4px; white-space: nowrap;
    }

    /* ---------- certificates ---------- */
    .rs-certs { list-style: none; display: grid; gap: 10px; }
    .rs-cert {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      flex-wrap: wrap; min-width: 0;
      background: var(--surface, #fff); border: 1px solid var(--border, #dbe1ee);
      border-radius: 12px; padding: 14px 16px;
    }
    .rs-cert-main { min-width: 0; flex: 1 1 min(100%, 260px); }
    .rs-cert-main b { display: block; font-size: .93rem; font-weight: 700; overflow-wrap: anywhere; }
    .rs-cert-main small {
      display: block; font-size: .78rem; color: var(--text-dim, #5d6880);
      margin-block-start: 3px; overflow-wrap: anywhere;
    }
    .rs-cert-tag {
      flex: none; font-size: .7rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;
      background: var(--surface-2, #f4f6fb); color: var(--text-dim, #5d6880);
    }

    .rs-sub {
      font-size: .95rem; font-weight: 800; margin-block: 26px 10px;
      display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
    }
    .rs-sub small { font-size: .78rem; font-weight: 600; color: var(--text-dim, #5d6880); }
    .rs-courses { list-style: none; display: grid; gap: 7px; }
    .rs-courses li {
      font-size: .88rem; color: var(--text-dim, #5d6880);
      padding-inline-start: 16px; position: relative; overflow-wrap: anywhere;
    }
    .rs-courses li::before {
      content: ''; position: absolute; inset-inline-start: 2px; top: .62em;
      width: 5px; height: 5px; border-radius: 50%; background: var(--brand, #3d7bd9);
    }

    /* ---------- links ---------- */
    .rs-links { list-style: none; display: flex; flex-wrap: wrap; gap: 10px; }
    .rs-links a {
      display: inline-flex; align-items: center; min-height: 42px;
      padding: 10px 18px; border-radius: 11px; font-weight: 700; font-size: .88rem;
      text-decoration: none; border: 1px solid var(--border, #dbe1ee);
      background: var(--surface, #fff);
    }
    .rs-links a:hover { background: var(--surface-2, #f4f6fb); text-decoration: none; }

    @media (max-width: 560px) {
      .rs-sec { margin-block: 30px; }
      .rs-cert { align-items: flex-start; }
    }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
  `
}
