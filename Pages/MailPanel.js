// ==========================================
// Pages/MailPanel.js
// The operator's mailbox, at CONFIG.MAIL.PATH (/domail2).
//
// A third panel beside /thegod and /testsite, built the same way:
// its own path-scoped cookie, its own secret, one page of server-
// rendered HTML with its CSS and its script inline, and every
// visible string in fa / en / ja.
//
// What it is for
//
// The domain sells a product by email. Until now every message
// that went out - a licence key, a receipt, a "your order is
// stuck" alert - went out through Commerce/Mailer.js into a
// provider's dashboard, and there was nowhere on this site to
// read one back, and no way at all to answer a customer who
// replied. This is that place: compose an HTML message, send it
// as amircollider@amircollider.com, read what arrives, and look
// at what the checkout has been sending.
//
// Public entries (wired in Worker.js ROUTES):
//   handleMail            GET  {PATH}
//   handleMailLogin       GET  {PATH}/login
//   handleMailLoginPost   POST {PATH}/login
//   handleMailLogout      POST {PATH}/logout
//   isMailAuthenticated   read by Api/MailApi.js
//
// The path is CONFIG.MAIL.PATH and is read from there rather than
// written down here, so moving the panel is one line in Config.js
// plus the four places that cannot import it (each is commented).
//
// The secret is TheEmailPassword, set with:
//   npx wrangler secret put TheEmailPassword
// It does NOT fall back to another panel's password - see the
// note in Core/PanelSession.js for why this one must not.
// ==========================================

import { CONFIG } from '../Config.js'
import { getPageHead } from '../Core/DesignSystem.js'
import { createHtmlResponse, clientIp, timingSafeEqual } from '../Core/Http.js'
import { escapeHtml, hexToRgb } from '../Core/Html.js'
import { logWarning } from '../Core/Logging.js'
import { themeBootScript } from '../Core/PageChrome.js'
import {
  panelPassword, issuePanelCookie, clearPanelCookie, readPanelSession,
  isRateLimited, recordAttempt, clearAttempts
} from '../Core/PanelSession.js'
import { db } from '../Mail/Store.js'
import { dirFor, matchRequestLang, themeFromCookie, langCookieHeader } from '../Core/RequestContext.js'


const AUTH_COOKIE = 'amir_mail_auth'

// Both read from Config so the panel's address is stated once.
// COOKIE_PATH matters as much as the route does: the cookie is
// scoped to it, so a panel that moved without its cookie moving
// would sign nobody in and give no reason why.
const COOKIE_PATH = CONFIG.MAIL.PATH
const PANEL_NAME = 'mail'
const DEFAULT_LANG = 'fa'

// Envelope blue. Distinct from TheGod's and TestSite's accents on
// purpose: three panels behind three passwords should not look
// like one another at a glance, because the whole point of the
// separate cookies is that they are separate places.
const ACCENT = '#3d7bd9'


// ==========================================
// I18N
// Rule 6: every visible string, three times.
// ==========================================
const I18N = {
  fa: {
    dir: 'rtl',
    langName: 'فارسی',
    loginTitle: 'صندوق ایمیل',
    loginSub: 'برای ورود رمز عبور را بنویس',
    password: 'رمز عبور',
    signIn: 'ورود',
    wrong: 'رمز عبور درست نیست',
    blocked: 'تلاش زیاد. چند دقیقه صبر کن',
    notSet: 'رمز این پنل هنوز تعریف نشده. یک secret به نام TheEmailPassword روی ورکر بگذار.',
    foot: 'این صفحه فهرست نمی‌شود و از هیچ‌جای سایت لینک ندارد.',

    title: 'صندوق ایمیل',
    signOut: 'خروج',
    compose: 'نوشتن ایمیل',
    inbox: 'دریافتی',
    sent: 'ارسال‌شده',
    starred: 'ستاره‌دار',
    archived: 'بایگانی',
    system: 'ایمیل‌های سیستم',
    contactBox: 'فرم تماس',
    folders: 'پوشه‌ها',
    newFolder: 'پوشه‌ی جدید',
    folderName: 'نام پوشه',
    folderColor: 'رنگ',
    save: 'ذخیره',
    rename: 'تغییر نام',
    dropFolder: 'حذف پوشه',
    confirmFolder: 'پوشه حذف شود؟ پیام‌هایش پاک نمی‌شوند و به صندوق برمی‌گردند.',
    moveTo: 'انتقال به پوشه',
    noFolder: 'بدون پوشه',
    blocks: 'مسدودها',
    blockAdd: 'مسدود کردن',
    blockAddr: 'یک آدرس',
    blockDomain: 'یک دامنه',
    blockValue: 'آدرس یا دامنه',
    blockNote: 'یادداشت (اختیاری)',
    blockDrop: 'رفع مسدودی',
    blockHits: 'جلوگیری‌شده',
    blockNone: 'هنوز چیزی مسدود نشده.',
    blockThis: 'مسدود کردن فرستنده',
    blockedOk: 'مسدود شد.',
    fromContact: 'از فرم تماس',
    spamScore: 'امتیاز اسپم',
    needsFolders: 'برای پوشه‌ها و مسدودها این فایل را اجرا کن:',
    systemHint: 'چیزهایی که خود سایت فرستاده — کلید لایسنس، رسید، هشدار سفارش.',
    refresh: 'بروزرسانی',
    search: 'جست‌وجو',
    searchPlaceholder: 'موضوع، آدرس یا متن…',
    markAllRead: 'همه را خوانده‌شده کن',
    empty: 'این‌جا چیزی نیست.',
    loading: 'در حال بارگذاری…',
    noSubject: '(بدون موضوع)',
    from: 'از',
    to: 'به',
    reply: 'پاسخ',
    star: 'ستاره',
    unstar: 'برداشتن ستاره',
    archive: 'بایگانی',
    unarchive: 'خروج از بایگانی',
    remove: 'حذف',
    confirmDelete: 'این پیام برای همیشه حذف شود؟',
    truncatedNote: 'این پیام بلندتر از حد ذخیره بود و بریده شده است.',

    cTo: 'گیرنده',
    cToHint: 'چند آدرس را با ویرگول جدا کن.',
    cSubject: 'موضوع',
    cBody: 'متن پیام',
    cSend: 'ارسال',
    cSending: 'در حال ارسال…',
    cCancel: 'انصراف',
    cFrom: 'فرستنده',
    cRich: 'ویرایشگر',
    cHtml: 'کد HTML',
    cPreview: 'پیش‌نمایش',
    cSent: 'ارسال شد.',
    cFailed: 'ارسال نشد.',
    cTemplate: 'قالب',
    tplBlank: 'خالی',
    tplPlain: 'نامه‌ی ساده',
    tplNotice: 'اطلاعیه',
    tplDelivery: 'تحویل محصول',

    bold: 'درشت', italic: 'کج', underline: 'زیرخط',
    h2: 'تیتر', quote: 'نقل‌قول', ul: 'فهرست', ol: 'فهرست شماره‌دار',
    link: 'پیوند', image: 'تصویر', hr: 'خط جدا', clear: 'پاک کردن قالب',
    linkPrompt: 'آدرس پیوند:',
    imagePrompt: 'آدرس تصویر (https):',
    badUrl: 'آدرس باید با https:// شروع شود.',

    setupTitle: 'هنوز آماده نیست',
    setupTable: 'جدول ایمیل ساخته نشده. این فایل را روی amircollider-licenses اجرا کن:',
    setupSend: 'کلید ارسال تعریف نشده. RESEND_API_KEY یا BREVO_API_KEY را روی ورکر بگذار.',
    setupReceive: 'برای دریافت، در داشبورد Cloudflare بخش Email Routing یک قانون برای این آدرس بساز و مقصدش را Send to a Worker روی amircollider بگذار.',
  },

  en: {
    dir: 'ltr',
    langName: 'English',
    loginTitle: 'Mailbox',
    loginSub: 'Enter the password to continue',
    password: 'Password',
    signIn: 'Sign in',
    wrong: 'That password is not right',
    blocked: 'Too many attempts. Wait a few minutes',
    notSet: 'This panel has no password yet. Set a secret named TheEmailPassword on the Worker.',
    foot: 'This page is not indexed and is linked from nowhere on the site.',

    title: 'Mailbox',
    signOut: 'Sign out',
    compose: 'Compose',
    inbox: 'Inbox',
    sent: 'Sent',
    starred: 'Starred',
    archived: 'Archived',
    system: 'System mail',
    contactBox: 'Contact form',
    folders: 'Folders',
    newFolder: 'New folder',
    folderName: 'Folder name',
    folderColor: 'Colour',
    save: 'Save',
    rename: 'Rename',
    dropFolder: 'Delete folder',
    confirmFolder: 'Delete this folder? Its messages are not deleted — they go back to the inbox.',
    moveTo: 'Move to folder',
    noFolder: 'No folder',
    blocks: 'Blocked',
    blockAdd: 'Block',
    blockAddr: 'An address',
    blockDomain: 'A domain',
    blockValue: 'Address or domain',
    blockNote: 'Note (optional)',
    blockDrop: 'Unblock',
    blockHits: 'stopped',
    blockNone: 'Nothing blocked yet.',
    blockThis: 'Block this sender',
    blockedOk: 'Blocked.',
    fromContact: 'from the contact form',
    spamScore: 'spam score',
    needsFolders: 'For folders and blocking, run this file:',
    systemHint: 'What the site itself sent — licence keys, receipts, order alerts.',
    refresh: 'Refresh',
    search: 'Search',
    searchPlaceholder: 'Subject, address or text…',
    markAllRead: 'Mark all read',
    empty: 'Nothing here.',
    loading: 'Loading…',
    noSubject: '(no subject)',
    from: 'From',
    to: 'To',
    reply: 'Reply',
    star: 'Star',
    unstar: 'Unstar',
    archive: 'Archive',
    unarchive: 'Move out of archive',
    remove: 'Delete',
    confirmDelete: 'Delete this message for good?',
    truncatedNote: 'This message was longer than the storage limit and has been cut.',

    cTo: 'To',
    cToHint: 'Separate several addresses with commas.',
    cSubject: 'Subject',
    cBody: 'Message',
    cSend: 'Send',
    cSending: 'Sending…',
    cCancel: 'Cancel',
    cFrom: 'From',
    cRich: 'Editor',
    cHtml: 'HTML source',
    cPreview: 'Preview',
    cSent: 'Sent.',
    cFailed: 'Not sent.',
    cTemplate: 'Template',
    tplBlank: 'Blank',
    tplPlain: 'Plain letter',
    tplNotice: 'Notice',
    tplDelivery: 'Product delivery',

    bold: 'Bold', italic: 'Italic', underline: 'Underline',
    h2: 'Heading', quote: 'Quote', ul: 'Bullets', ol: 'Numbered',
    link: 'Link', image: 'Image', hr: 'Divider', clear: 'Clear formatting',
    linkPrompt: 'Link address:',
    imagePrompt: 'Image address (https):',
    badUrl: 'The address has to start with https://',

    setupTitle: 'Not ready yet',
    setupTable: 'The mail table does not exist. Run this against amircollider-licenses:',
    setupSend: 'No sending key. Set RESEND_API_KEY or BREVO_API_KEY on the Worker.',
    setupReceive: 'To receive, add an Email Routing rule for this address in the Cloudflare dashboard and set its destination to Send to a Worker -> amircollider.',
  },

  ja: {
    dir: 'ltr',
    langName: '日本語',
    loginTitle: 'メールボックス',
    loginSub: 'パスワードを入力してください',
    password: 'パスワード',
    signIn: 'サインイン',
    wrong: 'パスワードが違います',
    blocked: '試行回数が多すぎます。数分お待ちください',
    notSet: 'このパネルにはまだパスワードがありません。Worker に TheEmailPassword という名前のシークレットを設定してください。',
    foot: 'このページはインデックスされず、サイトのどこからもリンクされていません。',

    title: 'メールボックス',
    signOut: 'サインアウト',
    compose: '新規作成',
    inbox: '受信トレイ',
    sent: '送信済み',
    starred: 'スター付き',
    archived: 'アーカイブ',
    system: 'システムメール',
    contactBox: 'お問い合わせ',
    folders: 'フォルダ',
    newFolder: '新しいフォルダ',
    folderName: 'フォルダ名',
    folderColor: '色',
    save: '保存',
    rename: '名前を変更',
    dropFolder: 'フォルダを削除',
    confirmFolder: 'このフォルダを削除しますか? メッセージは削除されず、受信トレイに戻ります。',
    moveTo: 'フォルダへ移動',
    noFolder: 'フォルダなし',
    blocks: 'ブロック',
    blockAdd: 'ブロックする',
    blockAddr: 'アドレス',
    blockDomain: 'ドメイン',
    blockValue: 'アドレスまたはドメイン',
    blockNote: 'メモ (任意)',
    blockDrop: 'ブロック解除',
    blockHits: '件を拒否',
    blockNone: 'まだ何もブロックしていません。',
    blockThis: 'この送信者をブロック',
    blockedOk: 'ブロックしました。',
    fromContact: 'お問い合わせフォームから',
    spamScore: 'スパムスコア',
    needsFolders: 'フォルダとブロック機能には、このファイルを実行してください:',
    systemHint: 'サイトが送信したもの — ライセンスキー、領収書、注文の警告。',
    refresh: '更新',
    search: '検索',
    searchPlaceholder: '件名・アドレス・本文…',
    markAllRead: 'すべて既読にする',
    empty: 'ここには何もありません。',
    loading: '読み込み中…',
    noSubject: '(件名なし)',
    from: '差出人',
    to: '宛先',
    reply: '返信',
    star: 'スター',
    unstar: 'スターを外す',
    archive: 'アーカイブ',
    unarchive: 'アーカイブから戻す',
    remove: '削除',
    confirmDelete: 'このメッセージを完全に削除しますか?',
    truncatedNote: 'このメッセージは保存上限を超えたため、途中で切られています。',

    cTo: '宛先',
    cToHint: '複数のアドレスはカンマで区切ってください。',
    cSubject: '件名',
    cBody: '本文',
    cSend: '送信',
    cSending: '送信中…',
    cCancel: 'キャンセル',
    cFrom: '差出人',
    cRich: 'エディタ',
    cHtml: 'HTML ソース',
    cPreview: 'プレビュー',
    cSent: '送信しました。',
    cFailed: '送信できませんでした。',
    cTemplate: 'テンプレート',
    tplBlank: '空',
    tplPlain: 'シンプルな手紙',
    tplNotice: 'お知らせ',
    tplDelivery: '製品のお届け',

    bold: '太字', italic: '斜体', underline: '下線',
    h2: '見出し', quote: '引用', ul: '箇条書き', ol: '番号付き',
    link: 'リンク', image: '画像', hr: '区切り線', clear: '書式をクリア',
    linkPrompt: 'リンク先のアドレス:',
    imagePrompt: '画像のアドレス (https):',
    badUrl: 'アドレスは https:// で始まる必要があります。',

    setupTitle: 'まだ準備ができていません',
    setupTable: 'メールテーブルがありません。amircollider-licenses に対して実行してください:',
    setupSend: '送信キーがありません。Worker に RESEND_API_KEY または BREVO_API_KEY を設定してください。',
    setupReceive: '受信するには、Cloudflare ダッシュボードの Email Routing でこのアドレスのルールを作り、宛先を Send to a Worker -> amircollider にしてください。',
  }
}


// ==========================================
// mailPassword
// ==========================================
function mailPassword(env) {
  return panelPassword(env, PANEL_NAME)
}


// ==========================================
// isMailAuthenticated
// Read by Api/MailApi.js as well as by this file.
// ==========================================
export async function isMailAuthenticated(request, env) {
  return readPanelSession(request, AUTH_COOKIE, mailPassword(env), CONFIG.MAIL.SESSION_MAX_AGE_MS)
}


function langFor(url, request) {
  const code = matchRequestLang(url, request)
  return I18N[code] ? code : DEFAULT_LANG
}


// ==========================================
// Handler: GET the panel
// ==========================================
export async function handleMail(url, request, gameId, requestId, GAMES, env) {
  if (!(await isMailAuthenticated(request, env))) {
    return Response.redirect(`${url.origin}${COOKIE_PATH}/login`, 302)
  }

  const lang = langFor(url, request)
  const theme = themeFromCookie(request)
  return createHtmlResponse(renderPanel(lang, theme), 200, langCookieHeader(url, lang))
}


// ==========================================
// Handler: GET the login page
// ==========================================
export async function handleMailLogin(url, request, gameId, requestId, GAMES, env) {
  if (await isMailAuthenticated(request, env)) {
    return Response.redirect(`${url.origin}${COOKIE_PATH}`, 302)
  }

  const lang = langFor(url, request)
  const theme = themeFromCookie(request)
  const error = url.searchParams.get('error')
  const configured = Boolean(mailPassword(env))

  return createHtmlResponse(renderLogin(lang, theme, error, configured), 200, langCookieHeader(url, lang))
}


// ==========================================
// Handler: POST the login form
// ==========================================
export async function handleMailLoginPost(url, request, gameId, requestId, GAMES, env) {
  const secret = mailPassword(env)
  const database = db(env)
  const ip = clientIp(request)

  if (await isRateLimited(database, PANEL_NAME, ip)) {
    logWarning('Mail panel login rate limited', { requestId })
    return Response.redirect(`${url.origin}${COOKIE_PATH}/login?error=2`, 302)
  }

  let password = ''
  try {
    password = new URLSearchParams(await request.text()).get('password') || ''
  } catch {
    await recordAttempt(database, PANEL_NAME, ip)
    return Response.redirect(`${url.origin}${COOKIE_PATH}/login?error=1`, 302)
  }

  // An unset secret refuses everything, including the empty
  // string. timingSafeEqual('', '') is true, so without this a
  // deployment that has not set TheEmailPassword would let anybody in
  // by submitting a blank form.
  if (!secret || !timingSafeEqual(password, secret)) {
    await recordAttempt(database, PANEL_NAME, ip)
    logWarning('Mail panel login refused', { requestId })
    return Response.redirect(`${url.origin}${COOKIE_PATH}/login?error=1`, 302)
  }

  await clearAttempts(database, PANEL_NAME, ip)

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}${COOKIE_PATH}`,
      'Set-Cookie': await issuePanelCookie(AUTH_COOKIE, COOKIE_PATH, secret, CONFIG.MAIL.SESSION_MAX_AGE_MS)
    }
  })
}


// ==========================================
// Handler: POST sign out
// ==========================================
export async function handleMailLogout(url, request, gameId, requestId, GAMES, env) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}${COOKIE_PATH}/login`,
      'Set-Cookie': clearPanelCookie(AUTH_COOKIE, COOKIE_PATH)
    }
  })
}


// ==========================================
// css
//
// One stylesheet for the login page and the panel. Written
// mobile-first: the three-column mail layout collapses to one
// column under 900px, and the list and the reading pane become
// two screens the panel switches between rather than two columns
// squeezed side by side. A mailbox on a phone that shows 40
// characters of subject in a 120px column is a mailbox nobody
// opens twice.
//
// Never a backtick and never a dollar-brace inside this string:
// it is a template literal, and either one ends it. CLAUDE.md
// section 15. Code is quoted in plain words here for that reason.
// ==========================================
function css(accentRgb) {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --accent: ${ACCENT};
    --accent-rgb: ${accentRgb};
    --bg: #f4f6fb;
    --surface: #ffffff;
    --surface-2: #eef1f8;
    --border: #dbe1ee;
    --text: #141a26;
    --muted: #5d6880;
    --ok: #1a8a5a;
    --err: #c8324b;
    --warn: #b57611;
    --shadow: 0 2px 14px rgba(20, 26, 38, .07);
    --radius: 14px;
    color-scheme: light;
  }

  [data-theme="dark"] {
    --bg: #0d1017;
    --surface: #151a24;
    --surface-2: #1c2331;
    --border: #2a3241;
    --text: #e8ecf4;
    --muted: #8e9ab2;
    --ok: #4cc38a;
    --err: #ef6a80;
    --warn: #e0a33e;
    --shadow: 0 2px 16px rgba(0, 0, 0, .4);
    color-scheme: dark;
  }

  html { -webkit-text-size-adjust: 100%; }

  body {
    font-family: 'Vazirmatn', 'Segoe UI', system-ui, -apple-system,
                 'Hiragino Sans', 'Noto Sans JP', Tahoma, sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.6;
    min-height: 100vh; display: flex; flex-direction: column;
  }

  a { color: var(--accent); }

  /* ---------- shared controls ---------- */
  .btn {
    appearance: none; border: 1px solid var(--border); cursor: pointer;
    font: inherit; font-size: .88rem; font-weight: 600;
    padding: 9px 15px; border-radius: 10px;
    background: var(--surface); color: var(--text);
    display: inline-flex; align-items: center; gap: 7px;
    transition: background .16s ease, border-color .16s ease, transform .16s ease;

    /* A control a thumb has to hit. 40px is the smallest target
       that does not need a second try on a phone. */
    min-height: 40px;
  }
  .btn:hover { background: var(--surface-2); }
  .btn:active { transform: translateY(1px); }
  .btn.primary {
    background: var(--accent); border-color: var(--accent); color: #fff;
  }
  .btn.primary:hover { filter: brightness(1.07); background: var(--accent); }
  .btn.danger { color: var(--err); }
  .btn:disabled { opacity: .55; cursor: default; }

  .field { display: block; margin-bottom: 14px; }
  .field > span {
    display: block; font-size: .8rem; font-weight: 600;
    color: var(--muted); margin-bottom: 6px;
  }
  .field small { display: block; color: var(--muted); font-size: .74rem; margin-top: 5px; }

  input[type="text"], input[type="email"], input[type="password"], textarea, select {
    width: 100%; font: inherit; font-size: .92rem;
    padding: 11px 13px; border-radius: 10px;
    border: 1px solid var(--border); background: var(--surface-2); color: var(--text);
    outline: none; transition: border-color .16s ease, box-shadow .16s ease;

    /* Anything under 16px makes iOS Safari zoom the whole page on
       focus, and it does not zoom back out. That is the single
       most common "the site is broken on my phone" report there
       is, and it is a font-size. */
    min-height: 44px;
  }
  @media (max-width: 720px) {
    input[type="text"], input[type="email"], input[type="password"], textarea, select {
      font-size: 16px;
    }
  }
  textarea { min-height: 150px; resize: vertical; line-height: 1.6; }
  input:focus, textarea:focus, select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb), .16);
  }

  .note {
    border-radius: 12px; padding: 12px 15px; font-size: .85rem;
    border: 1px solid var(--border); background: var(--surface-2);
    margin-bottom: 14px;
  }
  .note.err { color: var(--err); border-color: rgba(var(--err-rgb, 200 50 75), .4); }
  .note code, code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: .84em; background: var(--surface); padding: 2px 6px; border-radius: 6px;
    direction: ltr; display: inline-block;

    /* A command or an address has no space to wrap at, and the
       longest of them is longer than a phone. Breaking mid-token
       beats a panel that scrolls sideways. */
    overflow-wrap: anywhere;
  }

  /* ---------- top bar ---------- */
  .top {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
    padding: 12px clamp(12px, 3vw, 22px);
    background: var(--surface); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 30;
  }
  .top-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .top-mark {
    width: 34px; height: 34px; border-radius: 10px; flex: none;
    display: grid; place-items: center; color: #fff; font-size: 1rem;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #8a5bff));
  }
  .top-name { font-weight: 800; font-size: .98rem; }
  .top-addr {
    font-size: .76rem; color: var(--muted); direction: ltr;
    overflow-wrap: anywhere;
  }
  .top-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .seg {
    display: inline-flex; gap: 2px; padding: 3px; border-radius: 999px;
    background: var(--surface-2); border: 1px solid var(--border);
  }
  .seg button {
    appearance: none; border: 0; cursor: pointer; font: inherit;
    font-size: .76rem; font-weight: 700; padding: 6px 11px; border-radius: 999px;
    background: transparent; color: var(--muted); min-height: 32px;
  }
  .seg button[aria-pressed="true"] { background: var(--accent); color: #fff; }

  /* ---------- login ---------- */
  .login-wrap { flex: 1; display: grid; place-items: center; padding: 30px 16px 60px; }
  .login-card {
    width: 100%; max-width: 400px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 20px;
    padding: clamp(24px, 5vw, 38px); box-shadow: var(--shadow);
  }
  .login-card h1 { font-size: 1.3rem; font-weight: 800; text-align: center; }
  .login-card .sub { color: var(--muted); font-size: .86rem; text-align: center; margin: 6px 0 22px; }
  .login-mark {
    width: 52px; height: 52px; margin: 0 auto 14px; border-radius: 15px;
    display: grid; place-items: center; font-size: 1.5rem; color: #fff;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #8a5bff));
  }
  .login-foot { text-align: center; color: var(--muted); font-size: .74rem; margin-top: 18px; }

  /* ---------- the mail layout ---------- */
  .shell {
    flex: 1; display: grid; gap: 0;
    grid-template-columns: 210px minmax(min(300px, 100%), 380px) 1fr;
    min-height: 0;
  }
  .rail, .list, .pane { min-width: 0; }

  .rail {
    border-inline-end: 1px solid var(--border); background: var(--surface);
    padding: 14px 10px; display: flex; flex-direction: column; gap: 4px;
  }
  .rail .btn { width: 100%; justify-content: center; margin-bottom: 10px; }
  .rail a {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 10px 12px; border-radius: 10px; text-decoration: none;
    color: var(--text); font-size: .88rem; font-weight: 600; cursor: pointer;
    min-height: 40px;
  }
  .rail a:hover { background: var(--surface-2); }
  .rail a[aria-current="true"] { background: rgba(var(--accent-rgb), .14); color: var(--accent); }
  .rail .count {
    font-size: .74rem; font-weight: 700; color: var(--muted);
    background: var(--surface-2); border-radius: 999px; padding: 1px 8px;
  }
  .rail a[aria-current="true"] .count { background: var(--accent); color: #fff; }
  .rail .hint { font-size: .72rem; color: var(--muted); padding: 6px 12px 0; line-height: 1.5; }

  /* The folder strip. A dot per folder in its colour, so the rail
     reads as a list of places rather than a list of words. */
  .rail .sep {
    font-size: .68rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
    color: var(--muted); padding: 14px 12px 6px;
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; display: inline-block; }
  .dot.blue { background: #3d7bd9; }
  .dot.green { background: #1a8a5a; }
  .dot.amber { background: #b57611; }
  .dot.rose { background: #c8324b; }
  .dot.violet { background: #7a4ed9; }
  .dot.slate { background: #5d6880; }
  .rail a .fname { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .rail a .fname span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* The manage screen: folders and the blocklist, side by side on
     a desktop and stacked on anything narrower. */
  .manage { padding: clamp(14px, 3vw, 24px); overflow-y: auto; flex: 1; }
  .manage-grid {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  }
  .mcard {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 16px; min-width: 0;
  }
  .mcard h3 { font-size: .95rem; font-weight: 800; margin-bottom: 12px; }
  .mrow {
    display: flex; align-items: center; gap: 10px; padding: 9px 0;
    border-bottom: 1px solid var(--border); min-width: 0;
  }
  .mrow:last-child { border-bottom: 0; }
  .mrow .grow { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; font-size: .86rem; }
  .mrow .meta { font-size: .72rem; color: var(--muted); }
  .mform { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .mform input, .mform select { flex: 1 1 min(100%, 150px); min-width: 0; }
  .swatches { display: flex; gap: 6px; flex-wrap: wrap; }
  .swatches button {
    width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
    border: 2px solid transparent; padding: 0; min-height: 26px; min-width: 26px;
  }
  .swatches button[aria-pressed="true"] { border-color: var(--text); }

  .chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: .68rem; font-weight: 700; padding: 1px 8px; border-radius: 999px;
    background: var(--surface-2); color: var(--muted); border: 1px solid var(--border);
  }

  .list {
    border-inline-end: 1px solid var(--border); background: var(--bg);
    display: flex; flex-direction: column;
  }
  .list-head {
    display: flex; gap: 8px; padding: 10px; border-bottom: 1px solid var(--border);
    background: var(--surface); flex-wrap: wrap; align-items: center;
  }
  .list-head input { flex: 1 1 min(100%, 160px); min-width: 0; }
  .list-body { overflow-y: auto; flex: 1; }

  .row {
    display: block; width: 100%; text-align: start; cursor: pointer;
    padding: 12px 14px; border: 0; border-bottom: 1px solid var(--border);
    background: transparent; color: var(--text); font: inherit;
  }
  .row:hover { background: var(--surface-2); }
  .row[aria-current="true"] { background: rgba(var(--accent-rgb), .12); }
  .row.unread .row-who, .row.unread .row-sub { font-weight: 800; }
  .row.unread { border-inline-start: 3px solid var(--accent); }
  .row-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  .row-who { font-size: .86rem; overflow-wrap: anywhere; }
  .row-when { font-size: .72rem; color: var(--muted); flex: none; white-space: nowrap; }
  .row-sub { font-size: .85rem; margin-top: 2px; overflow-wrap: anywhere; }
  .row-pre {
    font-size: .78rem; color: var(--muted); margin-top: 3px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; overflow-wrap: anywhere;
  }
  .row-tags { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
  .tag {
    font-size: .68rem; font-weight: 700; padding: 1px 7px; border-radius: 999px;
    background: var(--surface-2); color: var(--muted); border: 1px solid var(--border);
  }
  .tag.ok { color: var(--ok); } .tag.err { color: var(--err); } .tag.star { color: var(--warn); }

  .pane { background: var(--surface); display: flex; flex-direction: column; overflow: hidden; }
  .pane-head { padding: 16px clamp(14px, 3vw, 24px); border-bottom: 1px solid var(--border); }
  .pane-head h2 { font-size: 1.12rem; font-weight: 800; overflow-wrap: anywhere; }
  .pane-meta { font-size: .8rem; color: var(--muted); margin-top: 6px; overflow-wrap: anywhere; direction: ltr; text-align: start; }
  .pane-tools { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .pane-body { padding: clamp(14px, 3vw, 24px); overflow-y: auto; flex: 1; }

  /* The rendered message. It is somebody else's HTML, so it is
     boxed: it cannot set the page's colours, and anything wide
     inside it scrolls in its own container rather than widening
     the panel. */
  .msg { max-width: 760px; overflow-wrap: anywhere; }
  .msg img { max-width: 100%; height: auto; }
  .msg table { max-width: 100%; }
  .msg pre { overflow-x: auto; }
  .msg-frame {
    width: 100%; min-height: 380px; border: 1px solid var(--border);
    border-radius: 12px; background: #fff;
  }
  .msg-text {
    white-space: pre-wrap; font-family: inherit; font-size: .9rem;
    overflow-wrap: anywhere;
  }

  .empty { padding: 40px 20px; text-align: center; color: var(--muted); font-size: .88rem; }

  /* ---------- compose ---------- */
  .compose { padding: clamp(14px, 3vw, 24px); overflow-y: auto; flex: 1; }
  .compose-inner { max-width: 780px; }
  .tools {
    display: flex; gap: 4px; flex-wrap: wrap; padding: 7px;
    border: 1px solid var(--border); border-bottom: 0;
    border-radius: 10px 10px 0 0; background: var(--surface-2);
  }
  .tools button {
    appearance: none; border: 0; background: transparent; cursor: pointer;
    font: inherit; font-size: .8rem; font-weight: 600; color: var(--text);
    padding: 7px 9px; border-radius: 7px; min-height: 34px; min-width: 34px;
  }
  .tools button:hover { background: var(--surface); }
  .editor {
    border: 1px solid var(--border); border-radius: 0 0 10px 10px;
    background: var(--surface); padding: 15px; min-height: 260px;
    outline: none; overflow-wrap: anywhere; overflow-y: auto;

    /* The composed message is LTR even on a Persian panel unless
       the operator types Persian, in which case the browser's own
       bidi handling gets it right per paragraph. Forcing rtl here
       would mangle an English message written from a Persian UI. */
    direction: ltr; text-align: start;
  }
  .editor:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), .16); }
  .editor img { max-width: 100%; height: auto; }
  .editor blockquote {
    margin: 10px 0; padding-inline-start: 14px;
    border-inline-start: 3px solid var(--border); color: var(--muted);
  }
  .source {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: .84rem; direction: ltr; min-height: 300px;
  }
  .preview {
    border: 1px solid var(--border); border-radius: 10px; background: #fff;
    padding: 0; min-height: 300px;
  }
  .preview iframe { width: 100%; min-height: 300px; border: 0; border-radius: 10px; }

  .send-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
  .send-msg { font-size: .85rem; }
  .send-msg.ok { color: var(--ok); } .send-msg.err { color: var(--err); }

  /* ---------- narrow ---------- */
  .back-btn { display: none; }

  @media (max-width: 980px) {
    .shell { grid-template-columns: 180px 1fr; }
    .pane { display: none; }
    .shell.reading .list { display: none; }
    .shell.reading .pane { display: flex; grid-column: 2; }
    .back-btn { display: inline-flex; }
  }

  @media (max-width: 700px) {
    /* One column. The rail becomes a scrolling strip across the
       top, the list is the screen, and opening a message replaces
       it - which is how every mail app on a phone behaves, and
       the only shape that leaves room for a subject line. */
    .shell { grid-template-columns: 1fr; }
    .rail {
      flex-direction: row; overflow-x: auto; gap: 6px;
      border-inline-end: 0; border-bottom: 1px solid var(--border);
      padding: 8px; align-items: center;
    }
    .rail a { flex: 0 0 auto; padding: 8px 12px; }
    .rail .btn { width: auto; margin: 0; flex: 0 0 auto; }
    .rail .hint { display: none; }
    .list { border-inline-end: 0; }
    .shell.reading .rail { display: none; }
    .shell.reading .pane { grid-column: 1; }
  }

  :where(button, a, input, textarea, select):focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
  `
}


// ==========================================
// langSeg
// The panel's language switcher.
//
// Buttons here, not links, and that is not the bug fixed in
// Core/SiteNav.js: this page is noindex and disallowed in
// robots.txt, so there is no crawler to give a link to. What it
// needs is to not reload a panel with unsent compose text in it,
// which a link would.
// ==========================================
function langSeg(current) {
  return ['fa', 'en', 'ja'].map(code =>
    '<button type="button" onclick="MAIL.setLang(\'' + code + '\')"'
    + ' lang="' + code + '" aria-pressed="' + (code === current ? 'true' : 'false') + '"'
    + ' title="' + escapeHtml(I18N[code].langName) + '">'
    + code.toUpperCase() + '</button>'
  ).join('')
}


// ==========================================
// renderLogin
// ==========================================
function renderLogin(lang, theme, error, configured) {
  const t = I18N[lang]
  const themeAttr = theme === 'light' || theme === 'dark' ? ` data-theme="${theme}"` : ''
  const failed = error === '1' || error === '2'
  const banner = !configured ? t.notSet : (error === '2' ? t.blocked : t.wrong)

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${t.dir}"${themeAttr}>
<head>
  ${getPageHead({ title: escapeHtml(t.loginTitle) + ' | AmirCollider', amirLogo: CONFIG.AMIR_LOGO })}
  <meta name="robots" content="noindex, nofollow">
  ${themeBootScript()}
  <style>${css(hexToRgb(ACCENT))}</style>
</head>
<body>
  <div class="top">
    <div class="top-id">
      <span class="top-mark">✉</span>
      <span>
        <span class="top-name">${escapeHtml(t.loginTitle)}</span>
        <span class="top-addr">${escapeHtml(CONFIG.MAIL.ADDRESS)}</span>
      </span>
    </div>
  </div>

  <div class="login-wrap">
    <form class="login-card" method="POST" action="${escapeHtml(CONFIG.MAIL.PATH)}/login">
      <div class="login-mark">✉</div>
      <h1>${escapeHtml(t.loginTitle)}</h1>
      <p class="sub">${escapeHtml(t.loginSub)}</p>

      ${(failed || !configured) ? `<div class="note err">${escapeHtml(banner)}</div>` : ''}

      <label class="field">
        <span>${escapeHtml(t.password)}</span>
        <input type="password" name="password" autocomplete="current-password"
               autofocus required ${configured ? '' : 'disabled'}>
      </label>

      <button type="submit" class="btn primary" style="width:100%;justify-content:center"
              ${configured ? '' : 'disabled'}>${escapeHtml(t.signIn)}</button>

      <p class="login-foot">${escapeHtml(t.foot)}</p>
    </form>
  </div>
</body>
</html>`
}


// ==========================================
// renderPanel
//
// The shell only. Every list, every message and the compose form
// are painted by the script below from what the API returns, so
// there is exactly one place that knows what a message looks like
// rather than a server copy and a client copy that drift.
// ==========================================
function renderPanel(lang, theme) {
  const t = I18N[lang]
  const themeAttr = theme === 'light' || theme === 'dark' ? ` data-theme="${theme}"` : ''

  // The whole dictionary travels to the browser, because the
  // script renders every string and the language can change
  // without a reload.
  const payload = JSON.stringify({
    lang,
    i18n: I18N,
    address: CONFIG.MAIL.ADDRESS,
    name: CONFIG.MAIL.NAME,

    // The panel's own base path. The script builds every request
    // and every redirect from this rather than from a literal, so
    // moving the panel does not leave the browser calling an
    // address the Worker stopped answering on.
    path: CONFIG.MAIL.PATH
  }).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${t.dir}"${themeAttr}>
<head>
  ${getPageHead({ title: escapeHtml(t.title) + ' | AmirCollider', amirLogo: CONFIG.AMIR_LOGO })}
  <meta name="robots" content="noindex, nofollow">
  ${themeBootScript()}
  <style>${css(hexToRgb(ACCENT))}</style>
</head>
<body>
  <div class="top">
    <div class="top-id">
      <span class="top-mark">✉</span>
      <span>
        <span class="top-name" id="uiTitle">${escapeHtml(t.title)}</span>
        <span class="top-addr">${escapeHtml(CONFIG.MAIL.ADDRESS)}</span>
      </span>
    </div>
    <div class="top-actions">
      <div class="seg" role="group">${langSeg(lang)}</div>
      <button type="button" class="btn" onclick="MAIL.toggleTheme()" aria-label="theme">◐</button>
      <form method="POST" action="${escapeHtml(CONFIG.MAIL.PATH)}/logout" style="display:inline">
        <button type="submit" class="btn" id="uiSignOut">${escapeHtml(t.signOut)}</button>
      </form>
    </div>
  </div>

  <div class="shell" id="shell">
    <nav class="rail" id="rail"></nav>

    <section class="list" id="list">
      <div class="list-head">
        <input type="text" id="q" placeholder="${escapeHtml(t.searchPlaceholder)}"
               aria-label="${escapeHtml(t.search)}">
        <button type="button" class="btn" onclick="MAIL.reload()" id="uiRefresh">${escapeHtml(t.refresh)}</button>
      </div>
      <div class="list-body" id="listBody">
        <p class="empty">${escapeHtml(t.loading)}</p>
      </div>
    </section>

    <section class="pane" id="pane">
      <div class="pane-body"><p class="empty" id="paneEmpty">${escapeHtml(t.empty)}</p></div>
    </section>
  </div>

  <script>window.MAIL_BOOT = ${payload};</script>
  <script>${panelScript()}</script>
</body>
</html>`
}


// ==========================================
// panelScript
//
// String.raw so the client code below is written exactly as it
// runs - no escaping of its own backslashes, and no chance of a
// dollar-brace in a regular expression being read as an
// interpolation by the server. Same device as PANEL_JS in
// Pages/TheGod.js, and for the same reason.
// ==========================================
function panelScript() {
  return String.raw`
(function () {
  var BOOT = window.MAIL_BOOT || {};
  var BASE = BOOT.path || '/domail2';
  var lang = BOOT.lang || 'fa';
  var T = function () { return BOOT.i18n[lang] || BOOT.i18n.fa; };

  var state = {
    box: 'in',
    q: '',
    rows: [],
    folders: [],
    blocks: [],
    folderColor: 'slate',
    editingFolder: null,
    counts: { unread: 0, inbox: 0, sent: 0, starred: 0, archived: 0 },
    current: null,
    status: null,
    composing: false,
    mode: 'rich'
  };

  // ==========================================
  // esc
  // Every string from the API goes through this before it reaches
  // innerHTML. A subject line is written by whoever sent the mail
  // and is the most obviously attacker-controlled text on this
  // page.
  // ==========================================
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function el(id) { return document.getElementById(id); }

  function when(ms) {
    if (!ms) return '';
    var d = new Date(Number(ms));
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    try {
      return sameDay
        ? d.toLocaleTimeString(lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-GB' : 'fa-IR',
            { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString(lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-GB' : 'fa-IR',
            { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return d.toISOString().slice(0, 16).replace('T', ' ');
    }
  }

  // ==========================================
  // api
  // Every call is a POST to one endpoint. A 401 means the session
  // expired while the tab was open, and the honest response to
  // that is the login page rather than an error the operator
  // cannot act on.
  // ==========================================
  function api(action, body) {
    var payload = body || {};
    payload.action = action;
    return fetch(BASE + '/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.status === 401) { window.location.href = BASE + '/login'; return null; }
      return res.json().catch(function () { return { error: 'bad_response' }; });
    });
  }

  // ==========================================
  // The rail
  // ==========================================
  var BOXES = [
    { key: 'in', label: 'inbox', count: 'inbox' },
    { key: 'out', label: 'sent', count: 'sent' },
    { key: 'contact', label: 'contactBox', count: null },
    { key: 'starred', label: 'starred', count: 'starred' },
    { key: 'archived', label: 'archived', count: 'archived' },
    { key: 'system', label: 'system', count: null }
  ];

  var COLORS = ['blue', 'green', 'amber', 'rose', 'violet', 'slate'];

  function paintRail() {
    var t = T();
    var html = '<button type="button" class="btn primary" onclick="MAIL.compose()">'
      + esc(t.compose) + '</button>';

    BOXES.forEach(function (box) {
      var n = box.count ? (state.counts[box.count] || 0) : 0;
      var unread = box.key === 'in' ? (state.counts.unread || 0) : 0;
      html += '<a role="button" tabindex="0" data-box="' + box.key + '"'
        + ' aria-current="' + (state.box === box.key && !state.composing ? 'true' : 'false') + '"'
        + ' onclick="MAIL.open(\'' + box.key + '\')"'
        + ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();MAIL.open(\'' + box.key + '\')}">'
        + '<span>' + esc(t[box.label]) + '</span>'
        + (box.count ? '<span class="count">' + (unread ? unread + ' / ' + n : n) + '</span>' : '')
        + '</a>';
    });

    // The operator's own folders, under a separator so they read
    // as a different kind of thing from the built-in boxes -
    // which they are: those are views, these are places.
    if (state.folders.length) {
      html += '<p class="sep">' + esc(t.folders) + '</p>';
      state.folders.forEach(function (folder) {
        var key = 'folder:' + folder.id;
        html += '<a role="button" tabindex="0" data-box="' + esc(key) + '"'
          + ' aria-current="' + (state.box === key && !state.composing ? 'true' : 'false') + '"'
          + ' onclick="MAIL.open(\'' + esc(key) + '\')"'
          + ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();MAIL.open(\'' + esc(key) + '\')}">'
          + '<span class="fname"><i class="dot ' + esc(folder.color || 'slate') + '"></i>'
          +   '<span>' + esc(folder.name) + '</span></span>'
          + '<span class="count">' + (folder.n || 0) + '</span>'
          + '</a>';
      });
    }

    html += '<p class="hint">' + esc(t.systemHint) + '</p>';

    if (state.box === 'in' && state.counts.unread) {
      html += '<button type="button" class="btn" style="margin-top:10px" onclick="MAIL.readAll()">'
        + esc(t.markAllRead) + '</button>';
    }

    // Folders and the blocklist live on one screen rather than in
    // a dialog: both are lists the operator scans and edits, and a
    // modal over a mailbox hides the thing being organised.
    if (state.hasFolders) {
      html += '<button type="button" class="btn" style="margin-top:8px" onclick="MAIL.manage()">'
        + esc(t.folders) + ' · ' + esc(t.blocks) + '</button>';
    }

    el('rail').innerHTML = html;
  }

  // ==========================================
  // The list
  // ==========================================
  function paintList() {
    var t = T();
    var body = el('listBody');

    if (!state.rows.length) {
      body.innerHTML = '<p class="empty">' + esc(t.empty) + '</p>';
      return;
    }

    body.innerHTML = state.rows.map(function (row) {
      // A system row and a mailbox row are different shapes. Both
      // reduce to "who, when, what" for the list.
      var system = state.box === 'system';
      var who = system
        ? row.to_email
        : (state.box === 'out' ? row.to_addr : (row.from_name || row.from_addr));

      var tags = [];
      if (system) {
        tags.push('<span class="tag">' + esc(row.kind || '') + '</span>');
        tags.push(row.sent_at
          ? '<span class="tag ok">sent</span>'
          : '<span class="tag err">' + (row.attempts ? 'retry ' + row.attempts : 'queued') + '</span>');
      } else {
        if (row.starred) tags.push('<span class="tag star">★</span>');
        if (row.status === 'failed') tags.push('<span class="tag err">' + esc(t.cFailed) + '</span>');
        if (row.truncated) tags.push('<span class="tag">…</span>');
      }

      var unread = !system && !row.read_at && row.direction === 'in';

      return '<button type="button" class="row' + (unread ? ' unread' : '') + '"'
        + ' aria-current="' + (state.current && state.current.id === row.id ? 'true' : 'false') + '"'
        + ' onclick="MAIL.show(\'' + esc(row.id) + '\')">'
        + '<span class="row-top">'
        +   '<span class="row-who">' + esc(who || '') + '</span>'
        +   '<span class="row-when">' + esc(when(row.created_at)) + '</span>'
        + '</span>'
        + '<span class="row-sub">' + esc(row.subject || t.noSubject) + '</span>'
        + (row.preview ? '<span class="row-pre">' + esc(row.preview) + '</span>' : '')
        + (tags.length ? '<span class="row-tags">' + tags.join('') + '</span>' : '')
        + '</button>';
    }).join('');
  }

  function load() {
    var t = T();
    el('listBody').innerHTML = '<p class="empty">' + esc(t.loading) + '</p>';

    var action = state.box === 'system' ? 'system' : 'list';
    api(action, { box: state.box, q: state.q, limit: 60 }).then(function (res) {
      if (!res) return;
      if (res.error) {
        el('listBody').innerHTML = '<p class="empty">' + esc(res.message || res.error) + '</p>';
        return;
      }
      state.rows = res.rows || [];
      if (res.counts) state.counts = res.counts;
      paintRail();
      paintList();
    });
  }

  // ==========================================
  // Reading a message
  //
  // The body is rendered inside a sandboxed iframe with srcdoc and
  // NOT into the page. It is HTML somebody else wrote and sent to
  // this address; putting it in the document would let a message
  // read the panel's session, rewrite its buttons or fetch
  // the API as the operator. allow-same-origin is deliberately
  // absent, so the frame gets an opaque origin and can reach
  // nothing.
  // ==========================================
  function frameFor(html) {
    var doc = '<!DOCTYPE html><html><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<base target="_blank">'
      + '<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;'
      + 'line-height:1.6;color:#141a26;background:#fff;margin:0;padding:16px;'
      + 'overflow-wrap:anywhere}img{max-width:100%;height:auto}'
      + 'table{max-width:100%}pre{overflow-x:auto}</style></head><body>'
      + html + '</body></html>';

    return '<iframe class="msg-frame" sandbox="allow-popups allow-popups-to-escape-sandbox"'
      + ' referrerpolicy="no-referrer" srcdoc="' + esc(doc) + '"></iframe>';
  }

  function paintMessage(message, system) {
    var t = T();
    var pane = el('pane');

    var tools = '<button type="button" class="btn back-btn" onclick="MAIL.back()">←</button>';
    if (!system) {
      tools += '<button type="button" class="btn" onclick="MAIL.reply()">' + esc(t.reply) + '</button>'
        + '<button type="button" class="btn" onclick="MAIL.star()">'
        +   esc(message.starred ? t.unstar : t.star) + '</button>'
        + '<button type="button" class="btn" onclick="MAIL.archive()">'
        +   esc(message.archived ? t.unarchive : t.archive) + '</button>';

      // Filing, as a select rather than a menu: the whole folder
      // list is visible at once and it works with a keyboard and
      // a screen reader without any code of ours.
      if (state.hasFolders) {
        tools += '<select onchange="MAIL.move(this.value)" aria-label="' + esc(t.moveTo) + '">'
          + '<option value="">' + esc(t.noFolder) + '</option>'
          + state.folders.map(function (folder) {
              return '<option value="' + esc(folder.id) + '"'
                + (message.folder_id === folder.id ? ' selected' : '') + '>'
                + esc(folder.name) + '</option>';
            }).join('')
          + '</select>';
      }

      // Blocking from the message itself, which is where the
      // decision is actually made - not from a settings screen the
      // operator has to go and find the address again for.
      if (state.hasFolders && message.direction === 'in' && message.from_addr) {
        tools += '<button type="button" class="btn" onclick="MAIL.blockSender()">'
          + esc(t.blockThis) + '</button>';
      }

      tools += '<button type="button" class="btn danger" onclick="MAIL.remove()">' + esc(t.remove) + '</button>';
    }

    var meta = system
      ? esc(t.to) + ': ' + esc(message.to_email || '')
        + ' · ' + esc(when(message.created_at))
        + (message.sent_at ? ' · sent ' + esc(when(message.sent_at)) : '')
        + (message.last_error ? '<br>' + esc(message.last_error) : '')
      : esc(t.from) + ': ' + esc(message.from_name ? message.from_name + ' <' + message.from_addr + '>' : message.from_addr)
        + '<br>' + esc(t.to) + ': ' + esc(message.to_addr)
        + '<br>' + esc(when(message.created_at))
        // A contact-form message carries an address a stranger
        // TYPED, not one an SMTP envelope proved. The chip is the
        // difference, and it belongs where the operator looks
        // before pressing reply.
        + (message.source === 'contact'
            ? ' · <span class="chip">' + esc(t.fromContact)
              + (message.spam_score ? ' · ' + esc(t.spamScore) + ' ' + message.spam_score : '')
              + '</span>'
            : '')
        + (message.error ? '<br>' + esc(message.error) : '');

    var notes = '';
    if (message.truncated) notes += '<div class="note">' + esc(t.truncatedNote) + '</div>';

    var html = message.html;
    var body = html
      ? frameFor(html)
      : '<div class="msg msg-text">' + esc(message.text || '') + '</div>';

    pane.innerHTML =
      '<div class="pane-head">'
      + '<h2>' + esc(message.subject || t.noSubject) + '</h2>'
      + '<p class="pane-meta">' + meta + '</p>'
      + '<div class="pane-tools">' + tools + '</div>'
      + '</div>'
      + '<div class="pane-body">' + notes + body + '</div>';

    el('shell').classList.add('reading');
  }

  // ==========================================
  // Compose
  // ==========================================
  var TEMPLATES = {
    blank: '',

    plain:
      '<p>Hello,</p><p><br></p><p>&nbsp;</p><p><br></p>'
      + '<p>— ' + '{NAME}' + '<br><a href="https://amircollider.com">amircollider.com</a></p>',

    notice:
      '<div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,Segoe UI,sans-serif">'
      + '<div style="background:#3d7bd9;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">'
      +   '<h1 style="margin:0;font-size:20px">{NAME}</h1></div>'
      + '<div style="border:1px solid #dbe1ee;border-top:0;border-radius:0 0 12px 12px;padding:24px">'
      +   '<h2 style="margin:0 0 12px;font-size:17px;color:#141a26">Title here</h2>'
      +   '<p style="margin:0 0 14px;color:#3d4557;line-height:1.7">Your message.</p>'
      +   '<p style="margin:0"><a href="https://amircollider.com" '
      +     'style="display:inline-block;background:#3d7bd9;color:#fff;text-decoration:none;'
      +     'padding:11px 20px;border-radius:9px;font-weight:600">Open</a></p>'
      + '</div>'
      + '<p style="text-align:center;color:#8a92a6;font-size:12px;margin-top:14px">'
      +   'amircollider.com</p></div>',

    delivery:
      '<div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,Segoe UI,sans-serif">'
      + '<h2 style="color:#141a26;font-size:19px">Thank you for your purchase</h2>'
      + '<p style="color:#3d4557;line-height:1.7">Here is your download and your licence key.</p>'
      + '<div style="background:#f4f6fb;border:1px solid #dbe1ee;border-radius:10px;padding:16px;margin:16px 0">'
      +   '<p style="margin:0 0 6px;font-size:12px;color:#5d6880;font-weight:600">LICENCE KEY</p>'
      +   '<code style="font-size:15px;color:#141a26">PASTE-KEY-HERE</code></div>'
      + '<p style="color:#3d4557;line-height:1.7">Install with Unity Package Manager, '
      +   '<b>Add package from git URL</b>:<br>'
      +   '<code>https://github.com/AmirCollider/UnityDocSnap.git</code></p>'
      + '<p style="color:#8a92a6;font-size:13px">Reply to this email if anything is wrong.</p></div>'
  };

  function composeHtml() {
    var t = T();
    return '<div class="compose"><div class="compose-inner">'
      + '<div class="pane-tools" style="margin-bottom:14px">'
      +   '<button type="button" class="btn back-btn" onclick="MAIL.back()">←</button>'
      + '</div>'
      + '<label class="field"><span>' + esc(t.cFrom) + '</span>'
      +   '<input type="text" value="' + esc(BOOT.address) + '" disabled dir="ltr"></label>'
      + '<label class="field"><span>' + esc(t.cTo) + '</span>'
      +   '<input type="text" id="cTo" dir="ltr" autocomplete="off">'
      +   '<small>' + esc(t.cToHint) + '</small></label>'
      + '<label class="field"><span>' + esc(t.cSubject) + '</span>'
      +   '<input type="text" id="cSubject" autocomplete="off"></label>'
      + '<label class="field"><span>' + esc(t.cTemplate) + '</span>'
      +   '<select id="cTemplate" onchange="MAIL.template(this.value)">'
      +     '<option value="blank">' + esc(t.tplBlank) + '</option>'
      +     '<option value="plain">' + esc(t.tplPlain) + '</option>'
      +     '<option value="notice">' + esc(t.tplNotice) + '</option>'
      +     '<option value="delivery">' + esc(t.tplDelivery) + '</option>'
      +   '</select></label>'

      + '<div class="field"><span>' + esc(t.cBody) + '</span>'
      +   '<div class="seg" style="margin-bottom:8px">'
      +     '<button type="button" data-mode="rich" onclick="MAIL.mode(\'rich\')" aria-pressed="true">'
      +       esc(t.cRich) + '</button>'
      +     '<button type="button" data-mode="html" onclick="MAIL.mode(\'html\')" aria-pressed="false">'
      +       esc(t.cHtml) + '</button>'
      +     '<button type="button" data-mode="preview" onclick="MAIL.mode(\'preview\')" aria-pressed="false">'
      +       esc(t.cPreview) + '</button>'
      +   '</div>'

      +   '<div id="richWrap">'
      +     '<div class="tools">' + toolbar(t) + '</div>'
      +     '<div class="editor" id="cEditor" contenteditable="true" role="textbox"'
      +       ' aria-multiline="true" aria-label="' + esc(t.cBody) + '"></div>'
      +   '</div>'

      +   '<textarea id="cSource" class="source" style="display:none"'
      +     ' aria-label="' + esc(t.cHtml) + '"></textarea>'
      +   '<div id="cPreview" class="preview" style="display:none"></div>'
      + '</div>'

      + '<div class="send-row">'
      +   '<button type="button" class="btn primary" id="cSendBtn" onclick="MAIL.send()">'
      +     esc(t.cSend) + '</button>'
      +   '<button type="button" class="btn" onclick="MAIL.back()">' + esc(t.cCancel) + '</button>'
      +   '<span class="send-msg" id="cMsg"></span>'
      + '</div>'
      + '</div></div>';
  }

  function tool(name, glyph, label) {
    return '<button type="button" onclick="MAIL.fmt(\'' + name + '\')" title="' + esc(label)
      + '" aria-label="' + esc(label) + '">' + glyph + '</button>';
  }

  // ==========================================
  // toolbar
  //
  // A list joined, deliberately, rather than a chain of pluses
  // spread over five lines. Written as a chain it read as
  //
  //     'x' + tool(a) + tool(b)
  //     + tool(c) + tool(d)
  //
  // where the second line begins with a plus and the first ends
  // with one - so the parser saw + (+tool(c)), a UNARY plus, which
  // coerces a string to a number and gives NaN. Four of these
  // eleven buttons rendered the literal word NaN instead of their
  // glyph, and nothing threw. A list cannot express that mistake.
  // ==========================================
  function toolbar(t) {
    return [
      ['bold', 'B', t.bold],
      ['italic', 'I', t.italic],
      ['underline', 'U', t.underline],
      ['h2', 'H', t.h2],
      ['quote', '\u275D', t.quote],
      ['ul', '\u2022', t.ul],
      ['ol', '1.', t.ol],
      ['link', '\u{1F517}', t.link],
      ['image', '\u{1F5BC}', t.image],
      ['hr', '\u2014', t.hr],
      ['clear', '\u232B', t.clear]
    ].map(function (row) { return tool(row[0], row[1], row[2]); }).join('');
  }

  // ==========================================
  // manageHtml
  // Folders and the blocklist, on one screen.
  // ==========================================
  function manageHtml() {
    var t = T();

    var folders = state.folders.length
      ? state.folders.map(function (folder) {
          return '<div class="mrow">'
            + '<i class="dot ' + esc(folder.color || 'slate') + '"></i>'
            + '<span class="grow">' + esc(folder.name)
            +   ' <span class="meta">(' + (folder.n || 0) + ')</span></span>'
            + '<button type="button" class="btn" onclick="MAIL.folderEdit(\'' + esc(folder.id) + '\')">'
            +   esc(t.rename) + '</button>'
            + '<button type="button" class="btn danger" onclick="MAIL.folderDrop(\'' + esc(folder.id) + '\')">'
            +   esc(t.remove) + '</button>'
            + '</div>';
        }).join('')
      : '';

    var swatches = COLORS.map(function (color) {
      return '<button type="button" class="dot ' + color + '" data-color="' + color + '"'
        + ' aria-pressed="' + (state.folderColor === color ? 'true' : 'false') + '"'
        + ' aria-label="' + color + '"'
        + ' onclick="MAIL.pickColor(\'' + color + '\')"></button>';
    }).join('');

    var blocks = state.blocks.length
      ? state.blocks.map(function (block) {
          return '<div class="mrow">'
            + '<span class="grow" dir="ltr">' + esc(block.value)
            +   '<br><span class="meta">' + esc(block.kind)
            +   (block.hits ? ' · ' + block.hits + ' ' + esc(t.blockHits) : '')
            +   (block.note ? ' · ' + esc(block.note) : '') + '</span></span>'
            + '<button type="button" class="btn" onclick="MAIL.blockDrop(\'' + esc(block.id) + '\')">'
            +   esc(t.blockDrop) + '</button>'
            + '</div>';
        }).join('')
      : '<p class="meta">' + esc(t.blockNone) + '</p>';

    return '<div class="manage">'
      + '<div class="pane-tools" style="margin-bottom:14px">'
      +   '<button type="button" class="btn back-btn" onclick="MAIL.back()">←</button>'
      + '</div>'
      + '<div class="manage-grid">'

      +   '<div class="mcard">'
      +     '<h3>' + esc(t.folders) + '</h3>'
      +     folders
      +     '<div class="mform">'
      +       '<input type="text" id="fName" placeholder="' + esc(t.folderName) + '" maxlength="60">'
      +       '<div class="swatches" role="group" aria-label="' + esc(t.folderColor) + '">' + swatches + '</div>'
      +       '<button type="button" class="btn primary" onclick="MAIL.folderSave()">'
      +         esc(t.save) + '</button>'
      +     '</div>'
      +   '</div>'

      +   '<div class="mcard">'
      +     '<h3>' + esc(t.blocks) + '</h3>'
      +     blocks
      +     '<div class="mform">'
      +       '<select id="bKind" aria-label="' + esc(t.blockAdd) + '">'
      +         '<option value="address">' + esc(t.blockAddr) + '</option>'
      +         '<option value="domain">' + esc(t.blockDomain) + '</option>'
      +       '</select>'
      +       '<input type="text" id="bValue" dir="ltr" placeholder="' + esc(t.blockValue) + '">'
      +       '<input type="text" id="bNote" placeholder="' + esc(t.blockNote) + '" maxlength="200">'
      +       '<button type="button" class="btn primary" onclick="MAIL.blockAdd()">'
      +         esc(t.blockAdd) + '</button>'
      +     '</div>'
      +   '</div>'

      + '</div></div>';
  }


  function refreshFolders(res) {
    if (!res) return;
    if (res.folders) state.folders = res.folders;
    if (res.blocks) state.blocks = res.blocks;
  }


  // ==========================================
  // The public object
  // ==========================================
  window.MAIL = {
    open: function (box) {
      state.box = box;
      state.composing = false;
      state.managing = false;
      state.current = null;
      el('shell').classList.remove('reading');
      el('pane').innerHTML = '<div class="pane-body"><p class="empty">' + esc(T().empty) + '</p></div>';
      paintRail();
      load();
    },

    reload: function () { load(); },

    back: function () {
      state.composing = false;
      state.managing = false;
      state.current = null;
      el('shell').classList.remove('reading');
      el('pane').innerHTML = '<div class="pane-body"><p class="empty">' + esc(T().empty) + '</p></div>';
      paintRail();
      paintList();
    },

    show: function (id) {
      var system = state.box === 'system';
      api(system ? 'systemGet' : 'get', { id: id }).then(function (res) {
        if (!res || res.error) return;
        state.current = res.message;
        if (res.counts) state.counts = res.counts;
        paintMessage(res.message, system);
        paintRail();

        // The row loses its unread mark straight away rather than
        // on the next list load, so the list agrees with what the
        // operator just did.
        var row = state.rows.filter(function (r) { return r.id === id; })[0];
        if (row && !row.read_at) row.read_at = Date.now();
        paintList();
      });
    },

    readAll: function () {
      api('readAll', {}).then(function (res) {
        if (!res) return;
        if (res.counts) state.counts = res.counts;
        load();
      });
    },

    star: function () {
      if (!state.current) return;
      var next = state.current.starred ? 0 : 1;
      api('star', { id: state.current.id, starred: Boolean(next) }).then(function (res) {
        if (!res) return;
        state.current.starred = next;
        if (res.counts) state.counts = res.counts;
        paintMessage(state.current, false);
        load();
      });
    },

    archive: function () {
      if (!state.current) return;
      var next = state.current.archived ? 0 : 1;
      api('archive', { id: state.current.id, archived: Boolean(next) }).then(function (res) {
        if (!res) return;
        window.MAIL.back();
        load();
      });
    },

    remove: function () {
      if (!state.current) return;
      if (!window.confirm(T().confirmDelete)) return;
      api('delete', { id: state.current.id }).then(function (res) {
        if (!res) return;
        window.MAIL.back();
        load();
      });
    },

    compose: function (prefill) {
      state.composing = true;
      state.mode = 'rich';
      el('shell').classList.add('reading');
      el('pane').innerHTML = composeHtml();
      paintRail();

      var data = prefill || {};
      if (data.to) el('cTo').value = data.to;
      if (data.subject) el('cSubject').value = data.subject;
      el('cEditor').innerHTML = data.html || '';
      state.replyTo = data.replyTo || null;
      (data.to ? el('cSubject') : el('cTo')).focus();
    },

    reply: function () {
      if (!state.current) return;
      var m = state.current;
      var subject = /^re:/i.test(m.subject || '') ? m.subject : 'Re: ' + (m.subject || '');

      // The quoted original, as a blockquote under an empty
      // paragraph the cursor lands in.
      var quoted = '<p><br></p><p>—</p><blockquote>'
        + (m.html || esc(m.text || '').replace(/\n/g, '<br>'))
        + '</blockquote>';

      window.MAIL.compose({
        to: m.direction === 'in' ? (m.reply_to || m.from_addr) : m.to_addr,
        subject: subject,
        html: quoted,
        replyTo: m.id
      });
    },

    // ==========================================
    // mode
    // Rich editor, HTML source, and preview - the three views of
    // one message, kept in step so switching never loses an edit.
    // ==========================================
    mode: function (next) {
      var editor = el('cEditor');
      var source = el('cSource');
      var preview = el('cPreview');
      if (!editor) return;

      if (state.mode === 'rich' && next !== 'rich') source.value = editor.innerHTML;
      if (state.mode === 'html' && next !== 'html') editor.innerHTML = source.value;

      state.mode = next;
      el('richWrap').style.display = next === 'rich' ? '' : 'none';
      source.style.display = next === 'html' ? '' : 'none';
      preview.style.display = next === 'preview' ? '' : 'none';

      if (next === 'preview') preview.innerHTML = frameFor(editor.innerHTML);

      Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-mode') === next ? 'true' : 'false');
      });
    },

    template: function (key) {
      var html = (TEMPLATES[key] || '').split('{NAME}').join(BOOT.name || 'AmirCollider');
      if (state.mode === 'html') el('cSource').value = html;
      else el('cEditor').innerHTML = html;
      if (state.mode === 'preview') el('cPreview').innerHTML = frameFor(html);
    },

    // ==========================================
    // fmt
    // The formatting toolbar.
    //
    // document.execCommand is deprecated and is still the only
    // thing every browser implements for contenteditable. The
    // replacement - a full selection and range implementation -
    // is a large amount of code for a compose box used by one
    // person, and this degrades to plain typing where it is
    // unsupported rather than breaking.
    // ==========================================
    fmt: function (what) {
      var t = T();
      var editor = el('cEditor');
      if (!editor) return;
      editor.focus();

      try {
        if (what === 'bold') document.execCommand('bold');
        else if (what === 'italic') document.execCommand('italic');
        else if (what === 'underline') document.execCommand('underline');
        else if (what === 'h2') document.execCommand('formatBlock', false, 'H2');
        else if (what === 'quote') document.execCommand('formatBlock', false, 'BLOCKQUOTE');
        else if (what === 'ul') document.execCommand('insertUnorderedList');
        else if (what === 'ol') document.execCommand('insertOrderedList');
        else if (what === 'hr') document.execCommand('insertHorizontalRule');
        else if (what === 'clear') document.execCommand('removeFormat');
        else if (what === 'link' || what === 'image') {
          var url = window.prompt(what === 'link' ? t.linkPrompt : t.imagePrompt, 'https://');
          if (!url) return;

          // https only, and checked here rather than trusted. A
          // javascript: or data: URL typed into this box becomes
          // a link in somebody else's inbox, and an http image in
          // an HTML email is a mixed-content warning in most
          // clients.
          if (!/^https:\/\//i.test(url)) { window.alert(t.badUrl); return; }
          document.execCommand(what === 'link' ? 'createLink' : 'insertImage', false, url);
        }
      } catch (e) { /* an unsupported command is a no-op, not a crash */ }
    },

    send: function () {
      var t = T();
      var btn = el('cSendBtn');
      var msg = el('cMsg');
      var html = state.mode === 'html' ? el('cSource').value : el('cEditor').innerHTML;

      btn.disabled = true;
      msg.className = 'send-msg';
      msg.textContent = t.cSending;

      api('send', {
        to: el('cTo').value,
        subject: el('cSubject').value,
        html: html,
        replyTo: state.replyTo || null
      }).then(function (res) {
        btn.disabled = false;
        if (!res) return;

        if (res.ok) {
          msg.className = 'send-msg ok';
          msg.textContent = t.cSent + ' (' + res.sent + ')';
          if (res.counts) state.counts = res.counts;
          window.setTimeout(function () { window.MAIL.open('out'); }, 900);
        } else {
          msg.className = 'send-msg err';
          // The failure verbatim. An operator whose message did
          // not go needs the provider's reason, not "failed".
          msg.textContent = t.cFailed + ' ' + (res.message || (res.results && res.results[0] && res.results[0].error) || res.error || '');
        }
      });
    },

    // ==========================================
    // Folders and blocking
    // ==========================================
    manage: function () {
      state.composing = false;
      state.managing = true;
      state.current = null;
      el('shell').classList.add('reading');
      el('pane').innerHTML = manageHtml();
      paintRail();
    },

    pickColor: function (color) {
      state.folderColor = color;
      Array.prototype.forEach.call(document.querySelectorAll('.swatches [data-color]'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-color') === color ? 'true' : 'false');
      });
    },

    folderSave: function () {
      var input = el('fName');
      var name = (input && input.value || '').trim();
      if (!name) return;

      api('folderSave', { id: state.editingFolder, name: name, color: state.folderColor })
        .then(function (res) {
          if (!res) return;
          refreshFolders(res);
          state.editingFolder = null;
          window.MAIL.manage();
        });
    },

    folderEdit: function (id) {
      var folder = state.folders.filter(function (f) { return f.id === id; })[0];
      if (!folder) return;
      state.editingFolder = id;
      state.folderColor = folder.color || 'slate';
      window.MAIL.manage();
      var input = el('fName');
      if (input) { input.value = folder.name; input.focus(); }
    },

    folderDrop: function (id) {
      if (!window.confirm(T().confirmFolder)) return;
      api('folderDrop', { id: id }).then(function (res) {
        if (!res) return;
        refreshFolders(res);
        if (res.counts) state.counts = res.counts;

        // The rail may have been showing the folder that just went
        // away. Falling back to the inbox is the only sane place
        // to land.
        if (state.box === 'folder:' + id) state.box = 'in';
        window.MAIL.manage();
        load();
      });
    },

    move: function (folderId) {
      if (!state.current) return;
      api('move', { id: state.current.id, folderId: folderId || null }).then(function (res) {
        if (!res) return;
        refreshFolders(res);
        state.current.folder_id = folderId || null;
        paintRail();
        load();
      });
    },

    blockAdd: function () {
      var value = (el('bValue') && el('bValue').value || '').trim();
      if (!value) return;
      api('blockAdd', {
        kind: el('bKind') ? el('bKind').value : 'address',
        value: value,
        note: el('bNote') ? el('bNote').value : ''
      }).then(function (res) {
        if (!res) return;
        if (res.error) { window.alert(res.message || res.error); return; }
        refreshFolders(res);
        window.MAIL.manage();
      });
    },

    blockDrop: function (id) {
      api('blockDrop', { id: id }).then(function (res) {
        if (!res) return;
        refreshFolders(res);
        window.MAIL.manage();
      });
    },

    // Block the person whose message is open, then archive it -
    // because the operator blocking a sender almost never wants
    // that message left in the inbox, and doing it in two clicks
    // when one will do is how a mailbox stays untidy.
    blockSender: function () {
      if (!state.current || !state.current.from_addr) return;
      var address = state.current.from_addr;
      if (!window.confirm(T().blockThis + '\n\n' + address)) return;

      api('blockAdd', { kind: 'address', value: address }).then(function (res) {
        if (!res) return;
        if (res.error) { window.alert(res.message || res.error); return; }
        refreshFolders(res);
        return api('archive', { id: state.current.id, archived: true });
      }).then(function () {
        window.MAIL.back();
        load();
      });
    },

    setLang: function (code) {
      if (!BOOT.i18n[code]) return;
      lang = code;
      document.documentElement.setAttribute('lang', code);
      document.documentElement.setAttribute('dir', BOOT.i18n[code].dir);
      document.cookie = 'lang=' + code + ';path=/;max-age=31536000;samesite=lax';

      var t = T();
      el('uiTitle').textContent = t.title;
      el('uiSignOut').textContent = t.signOut;
      el('uiRefresh').textContent = t.refresh;
      el('q').setAttribute('placeholder', t.searchPlaceholder);

      Array.prototype.forEach.call(document.querySelectorAll('.seg [lang]'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('lang') === code ? 'true' : 'false');
      });

      paintRail();
      paintList();
      if (state.current) paintMessage(state.current, state.box === 'system');
      else if (state.managing) window.MAIL.manage();
      else if (state.composing) window.MAIL.compose();
    },

    toggleTheme: function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      document.cookie = 'theme=' + next + ';path=/;max-age=31536000;samesite=lax';
      try { window.localStorage.setItem('ac_theme', next); } catch (e) {}
    }
  };

  // ==========================================
  // Search, debounced
  //
  // Every keystroke would be a D1 query per character. A third of
  // a second after the last one is the whole difference between a
  // search box and a load test.
  // ==========================================
  var timer = null;
  el('q').addEventListener('input', function (event) {
    state.q = event.target.value;
    window.clearTimeout(timer);
    timer = window.setTimeout(load, 320);
  });

  // ==========================================
  // Setup check, once, on load.
  //
  // The panel says what is missing BEFORE the operator types a
  // message and watches it fail: no table, no provider key, and
  // the one thing this Worker genuinely cannot verify from the
  // inside - whether an Email Routing rule exists.
  // ==========================================
  api('status', {}).then(function (res) {
    if (!res) return;
    state.status = res;
    state.hasFolders = Boolean(res.foldersReady);
    if (res.counts) state.counts = res.counts;
    paintRail();

    var t = T();
    var problems = [];
    if (!res.tableReady) {
      problems.push(esc(t.setupTable)
        + '<br><code>npx wrangler d1 execute amircollider-licenses --remote '
        + '--file=./migrations/0013_mail_panel.sql</code>');
    }
    if (!res.canSend) problems.push(esc(t.setupSend));

    if (problems.length) {
      el('listBody').innerHTML = '<div style="padding:14px">'
        + '<div class="note err"><b>' + esc(t.setupTitle) + '</b><br><br>'
        + problems.join('<br><br>') + '</div>'
        + '<div class="note">' + esc(t.setupReceive) + '</div></div>';
      return;
    }

    // Folders are a separate migration and a separate probe. The
    // mailbox works fully without them; the rail simply has no
    // folder strip and the manage button does not appear.
    if (state.hasFolders) {
      api('folders', {}).then(function (folders) {
        refreshFolders(folders);
        paintRail();
      });
    } else {
      el('listBody').insertAdjacentHTML('afterbegin',
        '<div style="padding:14px"><div class="note">' + esc(t.needsFolders)
        + '<br><code>npx wrangler d1 execute amircollider-licenses --remote '
        + '--file=./migrations/0014_mail_folders.sql</code></div></div>');
    }

    load();
  });
})();
`
}
