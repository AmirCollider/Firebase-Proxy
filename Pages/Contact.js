// ==========================================
// Pages/Contact.js
// /contact - the way to reach the owner from the site itself.
//
// What it does
//
// A visitor writes a subject and a message, optionally attaches a
// screenshot or two, and it arrives in the operator's mailbox at
// CONFIG.MAIL.PATH as an ordinary message - beside the mail that
// came in over SMTP, in one place. No form provider, no third
// -party script, no dashboard to remember to open.
//
// Public entries (wired in Worker.js ROUTES):
//   handleContact       GET  /contact
//   handleContactSend   POST /contact/send
//
// Why the POST is not a normal form submit
//
// Attachments. A multipart form post with three images in it is
// the same request either way, but doing it with fetch() lets the
// page report which file was too large, and lets the operator's
// mailbox get a rendered HTML message rather than a raw dump. The
// form still has a real action and real names, so a reader without
// JavaScript gets a working plain submit - see submitFallback().
//
// The anti-spam story is in Mail/Spam.js. This file supplies the
// two signals that filter cannot compute for itself: the honeypot
// field, and a signed timestamp proving when the form was
// rendered.
// ==========================================

import { CONFIG } from '../Config.js'
import { getPageHead, pageFoundationCss } from '../Core/DesignSystem.js'
import { createHtmlResponse, createJsonResponse, clientIp } from '../Core/Http.js'
import { escapeHtml } from '../Core/Html.js'
import { logInfo, logWarning } from '../Core/Logging.js'
import { themeBootScript } from '../Core/PageChrome.js'
import { seoHead, breadcrumbLd } from '../Core/Seo.js'
import { localizedPath } from '../Core/Locale.js'
import {
  siteNavCss, siteHeader, siteBreadcrumb, siteFooter, siteChromeScript, NAV_I18N
} from '../Core/SiteNav.js'
import {
  dirFor, langCookieHeader, parseCookies, resolveLang, resolveRequestLang, resolveRequestTheme,
  themeAttribute
} from '../Core/RequestContext.js'
import { db, storeMessage, mailTableReady, isBlocked, noteBlockHit } from '../Mail/Store.js'
import { scoreSubmission } from '../Mail/Spam.js'


const PAGE_PATH = '/contact'


// ==========================================
// i18n
// ==========================================
const I18N = {
  fa: {
    locale: 'fa-IR',
    metaTitle: 'ارتباط با من — AmirCollider',
    metaDesc: 'سوال، گزارش باگ یا پیشنهادت را مستقیم برای من بفرست. فرم ساده است و جواب به همان ایمیلی می‌رسد که می‌نویسی.',
    h1: 'ارتباط با من',
    lede: 'هر سوالی درباره‌ی بازی‌ها، Unity DocSnap یا DirectTMP داری، همین‌جا بنویس. گزارش باگ و پیشنهاد هم همین‌جا. پیام مستقیم به صندوق خودم می‌آید و خودم جواب می‌دهم.',

    name: 'اسمت',
    namePh: 'مثلاً سارا',
    email: 'ایمیلت',
    emailPh: 'you@example.com',
    emailHint: 'جواب به همین آدرس می‌آید. اگر اشتباه بنویسی، راهی برای رساندن جواب نیست.',
    topic: 'موضوع پیام درباره‌ی چیست؟',
    subject: 'موضوع',
    subjectPh: 'خلاصه‌ی یک خطی',
    message: 'پیام',
    messagePh: 'هرچه لازم است بنویس…',
    files: 'عکس (اختیاری)',
    filesHint: (n, mb) => `تا ${n} تصویر، هرکدام حداکثر ${mb} مگابایت. PNG، JPEG، WebP یا GIF.`,
    filesPick: 'انتخاب تصویر',
    filesRemove: 'حذف',
    send: 'ارسال پیام',
    sending: 'در حال ارسال…',

    tGeneral: 'سوال عمومی',
    tBug: 'گزارش باگ',
    tOrder: 'سفارش و لایسنس',
    tIdea: 'پیشنهاد یا همکاری',

    okTitle: 'پیامت رسید',
    okBody: 'ممنون. پیام توی صندوق من است و در اولین فرصت جواب می‌دهم — معمولاً به همان آدرسی که نوشتی.',
    okAgain: 'ارسال یک پیام دیگر',

    errTitle: 'ارسال نشد',
    errName: 'اسمت را بنویس.',
    errEmail: 'یک آدرس ایمیل درست بنویس.',
    errSubject: 'یک موضوع بنویس.',
    errMessage: 'متن پیام خالی است.',
    errLong: 'پیام خیلی بلند است. کوتاهش کن یا لینک بده.',
    errFiles: 'فایل قابل قبول نیست: فقط تصویر، و حداکثر همان اندازه‌ی گفته‌شده.',
    errTooMany: 'تعداد تصویرها بیش از حد مجاز است.',
    errRate: 'در این ساعت پیام‌های زیادی از این آدرس فرستاده شده. کمی بعد دوباره امتحان کن.',
    errSpam: 'این پیام به‌عنوان اسپم تشخیص داده شد. اگر واقعاً پیام خودت است، لینک‌ها را کم کن و دوباره بفرست.',
    errBlocked: 'امکان ارسال از این آدرس وجود ندارد.',
    errServer: 'مشکلی پیش آمد و پیام ثبت نشد. کمی بعد دوباره امتحان کن.',
    errNoMailbox: 'صندوق پیام هنوز راه‌اندازی نشده. فعلاً از طریق ایمیل مستقیم در تماس باش.',

    altTitle: 'راه‌های دیگر',
    altMail: 'ایمیل مستقیم',
    privacy: 'چیزی که می‌نویسی فقط به صندوق شخصی من می‌رود. نه جای دیگری ذخیره می‌شود، نه به کسی داده می‌شود، نه برایت خبرنامه می‌آید.',
    crumb: 'ارتباط با من'
  },

  en: {
    locale: 'en-US',
    metaTitle: 'Contact — AmirCollider',
    metaDesc: 'Send a question, a bug report or an idea straight to me. A simple form, and the reply goes to the address you write.',
    h1: 'Contact me',
    lede: 'Anything about the games, Unity DocSnap or DirectTMP — write it here. Bug reports and ideas too. It goes straight to my own mailbox and I answer it myself.',

    name: 'Your name',
    namePh: 'Sara, for example',
    email: 'Your email',
    emailPh: 'you@example.com',
    emailHint: 'The reply goes here. Get it wrong and there is no way to reach you.',
    topic: 'What is this about?',
    subject: 'Subject',
    subjectPh: 'One line',
    message: 'Message',
    messagePh: 'As much as you need…',
    files: 'Images (optional)',
    filesHint: (n, mb) => `Up to ${n} images, ${mb} MB each. PNG, JPEG, WebP or GIF.`,
    filesPick: 'Choose images',
    filesRemove: 'Remove',
    send: 'Send message',
    sending: 'Sending…',

    tGeneral: 'General question',
    tBug: 'Bug report',
    tOrder: 'Order and licence',
    tIdea: 'Idea or collaboration',

    okTitle: 'Message received',
    okBody: 'Thank you. It is in my mailbox and I will reply as soon as I can — normally to the address you gave.',
    okAgain: 'Send another message',

    errTitle: 'Not sent',
    errName: 'Please write your name.',
    errEmail: 'Please write a valid email address.',
    errSubject: 'Please write a subject.',
    errMessage: 'The message is empty.',
    errLong: 'The message is very long. Shorten it, or link to the details.',
    errFiles: 'That file is not accepted: images only, within the stated size.',
    errTooMany: 'Too many images.',
    errRate: 'Too many messages from this address this hour. Try again a little later.',
    errSpam: 'This was flagged as spam. If it really is you, cut the links down and send it again.',
    errBlocked: 'Messages cannot be sent from this address.',
    errServer: 'Something went wrong and the message was not stored. Try again shortly.',
    errNoMailbox: 'The mailbox is not set up yet. Please use direct email for now.',

    altTitle: 'Other ways',
    altMail: 'Email directly',
    privacy: 'What you write goes to my personal mailbox and nowhere else. It is not stored anywhere further, not passed to anybody, and there is no newsletter.',
    crumb: 'Contact'
  },

  ja: {
    locale: 'ja-JP',
    metaTitle: 'お問い合わせ — AmirCollider',
    metaDesc: 'ご質問・不具合の報告・ご提案を直接お送りください。返信はご記入のアドレス宛に届きます。',
    h1: 'お問い合わせ',
    lede: 'ゲーム、Unity DocSnap、DirectTMP について何でもこちらへ。不具合の報告やご提案も歓迎です。私の受信箱に直接届き、私が返信します。',

    name: 'お名前',
    namePh: '例: 田中',
    email: 'メールアドレス',
    emailPh: 'you@example.com',
    emailHint: '返信はこのアドレスに届きます。誤りがあるとご連絡できません。',
    topic: 'ご用件',
    subject: '件名',
    subjectPh: '一行で',
    message: '本文',
    messagePh: '必要なだけお書きください…',
    files: '画像 (任意)',
    filesHint: (n, mb) => `最大 ${n} 枚、1 枚あたり ${mb} MB まで。PNG・JPEG・WebP・GIF。`,
    filesPick: '画像を選ぶ',
    filesRemove: '削除',
    send: '送信',
    sending: '送信中…',

    tGeneral: '一般的な質問',
    tBug: '不具合の報告',
    tOrder: '注文とライセンス',
    tIdea: '提案・協業',

    okTitle: '送信しました',
    okBody: 'ありがとうございます。受信箱に届きました。できるだけ早く、ご記入のアドレス宛に返信します。',
    okAgain: 'もう一通送る',

    errTitle: '送信できませんでした',
    errName: 'お名前をご記入ください。',
    errEmail: '正しいメールアドレスをご記入ください。',
    errSubject: '件名をご記入ください。',
    errMessage: '本文が空です。',
    errLong: '本文が長すぎます。短くするか、リンクをご利用ください。',
    errFiles: 'このファイルは受け付けられません。画像のみ、指定サイズ以内です。',
    errTooMany: '画像の枚数が多すぎます。',
    errRate: 'この時間帯にこのアドレスから多数の送信がありました。しばらくしてからお試しください。',
    errSpam: 'スパムと判定されました。ご本人の場合はリンクを減らして再送してください。',
    errBlocked: 'このアドレスからは送信できません。',
    errServer: '問題が発生し、保存できませんでした。しばらくしてからお試しください。',
    errNoMailbox: '受信箱がまだ設定されていません。当面は直接メールをご利用ください。',

    altTitle: 'その他の方法',
    altMail: '直接メールする',
    privacy: 'ご記入の内容は私個人の受信箱にのみ届きます。他所に保存することも、第三者に渡すこともなく、メールマガジンもありません。',
    crumb: 'お問い合わせ'
  }
}


// The four topics, as stable keys. The key travels in the subject
// line so the operator can filter on it; the label is per language.
const TOPICS = ['general', 'bug', 'order', 'idea']
const TOPIC_LABEL = { general: 'tGeneral', bug: 'tBug', order: 'tOrder', idea: 'tIdea' }


// ==========================================
// The form token
//
// A signed statement of when the form was rendered, so the spam
// filter can tell a person who read the page from a script that
// POSTed to it. Signed rather than trusted, because an unsigned
// timestamp in a hidden field is a number the sender chooses.
//
// Keyed on STATE_SIGNING_SECRET, which every deployment that signs
// OAuth state already has. A deployment without it gets a form
// that still works and simply does not score the timing signal -
// a reduced feature rather than a page that will not load, which
// is the rule the whole codebase follows.
// ==========================================
async function signToken(secret, issuedAt) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(issuedAt)))
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}


async function makeToken(env) {
  const secret = env && env.STATE_SIGNING_SECRET
  if (!secret) return ''
  const issuedAt = Date.now()
  return issuedAt + '.' + await signToken(secret, issuedAt)
}


/** Milliseconds since the form was rendered, or null if unknowable. */
async function tokenAge(env, token) {
  const secret = env && env.STATE_SIGNING_SECRET
  if (!secret || !token) return null

  const cut = String(token).indexOf('.')
  if (cut <= 0) return null

  const issuedAt = Number(String(token).slice(0, cut))
  const signature = String(token).slice(cut + 1)
  if (!Number.isFinite(issuedAt)) return null

  // A forged timestamp is worth more to a spammer than a missing
  // one, so a bad signature is treated as "no information" rather
  // than as a valid age.
  const expected = await signToken(secret, issuedAt)
  if (expected !== signature) return null

  return Date.now() - issuedAt
}


// ==========================================
// Rate limiting
//
// Per IP, in the panel_attempts table the two operator panels
// already use - one table, one sweep, one thing to reason about.
// The panel column carries a distinct name so a contact-form flood
// can never lock somebody out of /thegod.
// ==========================================
async function hashIp(ip) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('contact|' + (ip || 'unknown')))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}


async function overRateLimit(database, ip) {
  if (!database) return false
  try {
    const since = Date.now() - CONFIG.CONTACT.RATE_WINDOW_MS
    await database.prepare("DELETE FROM panel_attempts WHERE panel = 'contact' AND at < ?")
      .bind(since).run()

    const row = await database.prepare(
      "SELECT COUNT(*) AS n FROM panel_attempts WHERE ip_hash = ? AND panel = 'contact' AND at >= ?"
    ).bind(await hashIp(ip), since).first()

    return (row && row.n ? row.n : 0) >= CONFIG.CONTACT.RATE_LIMIT
  } catch {
    // A limiter that cannot read is not a reason to refuse a real
    // message. The spam filter is still in front of this.
    return false
  }
}


async function noteSubmission(database, ip) {
  if (!database) return
  try {
    await database.prepare("INSERT INTO panel_attempts (ip_hash, panel, at) VALUES (?, 'contact', ?)")
      .bind(await hashIp(ip), Date.now()).run()
  } catch {
    // Nothing to do about it, and nothing broken by it.
  }
}


const ADDRESS = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/


// ==========================================
// storeAttachments
//
// Images go to R2 under CONFIG.CONTACT.FILE_PREFIX and the message
// links to them. They are NOT inlined as data URIs: a 4 MB image
// base64-encoded into an HTML body is a 5.3 MB database row, three
// times over, in a table that is read on every list.
//
// Every file is checked against the allow-list by its declared
// type AND its magic bytes. A declared type is whatever the
// browser was told; the first bytes are what the file actually is,
// and accepting an executable because it claimed to be a PNG is
// the whole reason to look.
// ==========================================
const MAGIC = [
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP is "RIFF....WEBP"; the first four are enough here because
  // the declared type has to agree as well.
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }
]


function looksLikeImage(declared, head) {
  const match = MAGIC.find(entry => entry.type === declared)
  if (!match) return false
  return match.bytes.every((byte, index) => head[index] === byte)
}


async function storeAttachments(env, files, requestId) {
  const bucket = env && env.ASSETS
  const stored = []

  if (!bucket || !files.length) return stored

  for (const file of files.slice(0, CONFIG.CONTACT.MAX_FILES)) {
    try {
      const buffer = new Uint8Array(await file.arrayBuffer())
      if (!looksLikeImage(file.type, buffer.subarray(0, 8))) continue

      // A name of our own, never the sender's. An uploaded filename
      // is attacker-controlled text that would otherwise become a
      // path in a bucket.
      const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
      const key = CONFIG.CONTACT.FILE_PREFIX
        + new Date().toISOString().slice(0, 10) + '/'
        + crypto.randomUUID() + '.' + extension

      await bucket.put(key, buffer, {
        httpMetadata: { contentType: file.type },

        // The expiry a sweep reads. R2 has no TTL of its own, so
        // this is a note for whatever eventually deletes them
        // rather than something enforced here.
        customMetadata: { expiresAt: String(Date.now() + CONFIG.CONTACT.FILE_RETENTION_MS) }
      })

      stored.push({ key, type: file.type, size: buffer.length })
    } catch (error) {
      logWarning('Contact attachment not stored', { requestId, error: error.message })
    }
  }

  return stored
}


// ==========================================
// messageHtml
// What the operator sees in their mailbox.
//
// Built here rather than stored raw, so the panel shows a message
// with the sender's details at the top and the attachments as
// thumbnails - and so every field is escaped exactly once, at the
// point it becomes HTML.
//
// The sender's text is escaped and then newline-to-<br>, never
// interpreted. Somebody who writes HTML into this box gets it
// shown as the characters they typed. This body ends up in the
// panel's sandboxed iframe as well, so that is belt and braces -
// but the belt is here, because this is the only place that knows
// the text came from a stranger.
// ==========================================
function messageHtml(fields, attachments, origin, verdict) {
  const row = (label, value) => value
    ? `<tr><td style="padding:6px 14px 6px 0;color:#5d6880;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>`
      + `<td style="padding:6px 0;color:#141a26;font-size:14px;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`
    : ''

  const body = escapeHtml(fields.message).replace(/\n/g, '<br>')

  const shots = attachments.length
    ? '<div style="margin-top:18px">'
      + '<p style="margin:0 0 8px;color:#5d6880;font-size:13px;font-weight:600">'
      + attachments.length + ' attachment' + (attachments.length === 1 ? '' : 's') + '</p>'
      + attachments.map(file =>
          `<a href="${escapeHtml(origin)}/assets/${escapeHtml(file.key)}" style="display:inline-block;margin:0 8px 8px 0">`
          + `<img src="${escapeHtml(origin)}/assets/${escapeHtml(file.key)}" alt=""`
          + ' style="max-width:260px;max-height:200px;border:1px solid #dbe1ee;border-radius:8px"></a>'
        ).join('')
      + '</div>'
    : ''

  // The score is shown to the operator and only to them. A message
  // that scored 30 and got through is worth recognising when a
  // second one arrives from the same person.
  const flags = verdict.score > 0
    ? `<p style="margin:16px 0 0;color:#8a92a6;font-size:12px">spam score ${verdict.score}`
      + (verdict.reasons.length ? ' — ' + escapeHtml(verdict.reasons.join(', ')) : '') + '</p>'
    : ''

  return '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:640px">'
    + '<table style="border-collapse:collapse;margin-bottom:16px">'
    +   row('Name', fields.name)
    +   row('Email', fields.email)
    +   row('Topic', fields.topicLabel)
    +   row('Sent from', PAGE_PATH)
    + '</table>'
    + `<div style="border-top:1px solid #dbe1ee;padding-top:16px;color:#141a26;font-size:15px;line-height:1.7;overflow-wrap:anywhere">${body}</div>`
    + shots
    + flags
    + '</div>'
}


// ==========================================
// Handler: POST /contact/send
//
// Answers JSON always, including for the no-JavaScript path -
// which posts here with a normal form and gets redirected back to
// the page with a result in the query string. See submitFallback().
// ==========================================
export async function handleContactSend(url, request, gameId, requestId, GAMES, env) {
  const cookies = parseCookies(request)
  const lang = resolveLang(resolveRequestLang(url, request, cookies))
  const t = I18N[lang] || I18N.fa

  const fail = (key, status = 400, extra = {}) =>
    createJsonResponse({ ok: false, error: key, message: t[key] || t.errServer, requestId, ...extra }, status)

  const database = db(env)
  if (!database || !(await mailTableReady(database))) {
    logWarning('Contact form has no mailbox to write to', { requestId })
    return fail('errNoMailbox', 503)
  }

  // ==========================================
  // Reading the body.
  //
  // multipart/form-data when there are files, and the same parser
  // handles the plain case - so there is one path rather than a
  // branch that only one of them is ever tested on.
  // ==========================================
  let form
  try {
    form = await request.formData()
  } catch {
    return fail('errServer', 400)
  }

  const field = name => String(form.get(name) || '').trim()

  const fields = {
    name: field('name').slice(0, CONFIG.CONTACT.MAX_NAME),
    email: field('email').toLowerCase().slice(0, 160),
    subject: field('subject').slice(0, CONFIG.CONTACT.MAX_SUBJECT),
    message: field('message'),
    topic: TOPICS.includes(field('topic')) ? field('topic') : 'general'
  }
  fields.topicLabel = t[TOPIC_LABEL[fields.topic]]

  // ==========================================
  // Validation, before anything expensive.
  // ==========================================
  if (!fields.name) return fail('errName')
  if (!ADDRESS.test(fields.email)) return fail('errEmail')
  if (!fields.subject) return fail('errSubject')
  if (!fields.message) return fail('errMessage')
  if (fields.message.length > CONFIG.CONTACT.MAX_MESSAGE) return fail('errLong', 413)

  // ==========================================
  // The blocklist, before the rate limit and before any storage.
  //
  // The same rule the inbound handler enforces - otherwise this
  // form is the documented way around a block.
  // ==========================================
  const block = await isBlocked(database, fields.email)
  if (block) {
    await noteBlockHit(database, block.id)
    logInfo('Contact submission refused by a block rule', {
      requestId, rule: block.kind + ':' + block.value
    })
    return fail('errBlocked', 403)
  }

  const ip = clientIp(request)
  if (await overRateLimit(database, ip)) {
    logInfo('Contact submission rate limited', { requestId })
    return fail('errRate', 429)
  }

  // ==========================================
  // The files.
  //
  // Counted and size-checked before they are read, so an oversized
  // upload is refused rather than buffered.
  // ==========================================
  const offered = form.getAll('files').filter(entry => entry && typeof entry.arrayBuffer === 'function')
  if (offered.length > CONFIG.CONTACT.MAX_FILES) return fail('errTooMany', 413)

  for (const file of offered) {
    if (file.size > CONFIG.CONTACT.MAX_FILE_BYTES) return fail('errFiles', 413)
    if (!CONFIG.CONTACT.ALLOWED_TYPES.includes(file.type)) return fail('errFiles', 415)
  }

  // ==========================================
  // The spam filter.
  // ==========================================
  const verdict = scoreSubmission({
    name: fields.name,
    email: fields.email,
    subject: fields.subject,
    message: fields.message,
    honeypot: field('website'),
    elapsedMs: await tokenAge(env, field('token')),
    attachments: offered.length
  })

  if (verdict.verdict === 'reject') {
    // Counted against the rate limit as well: a bot that keeps
    // trying should run out of attempts, not just be told no.
    await noteSubmission(database, ip)

    // Reasons, never the message body. CLAUDE.md rule 8.
    logInfo('Contact submission refused as spam', {
      requestId, score: verdict.score, reasons: verdict.reasons.join(',')
    })
    return fail('errSpam', 422)
  }

  const attachments = await storeAttachments(env, offered, requestId)

  const stored = await storeMessage(database, {
    direction: 'in',

    // The address the sender TYPED, which is not a verified
    // envelope - the panel shows a "contact form" chip precisely
    // so the operator knows the difference before hitting reply.
    from: fields.email,
    fromName: fields.name,
    to: CONFIG.MAIL.ADDRESS,
    replyTo: fields.email,

    // The topic rides in the subject so the mailbox can be
    // filtered on it without a second column.
    subject: '[' + fields.topic + '] ' + fields.subject,

    html: messageHtml(fields, attachments, url.origin, verdict),
    text: fields.name + ' <' + fields.email + '>\n'
      + fields.topicLabel + '\n\n' + fields.message
      + (attachments.length ? '\n\n' + attachments.length + ' attachment(s)' : ''),

    status: 'received',
    source: 'contact',
    senderName: fields.name,
    spamScore: verdict.score,
    createdAt: Date.now()
  })

  if (!stored) {
    logWarning('Contact message could not be stored', { requestId })
    return fail('errServer', 500)
  }

  await noteSubmission(database, ip)

  // The address is logged; the subject and the body are not.
  logInfo('Contact message stored', {
    requestId, id: stored, topic: fields.topic,
    attachments: attachments.length, score: verdict.score
  })

  return createJsonResponse({ ok: true, message: t.okBody, requestId })
}


// ==========================================
// Handler: GET /contact
// ==========================================
export async function handleContact(url, request, gameId, requestId, GAMES, env) {
  const cookies = parseCookies(request)
  const lang = resolveLang(resolveRequestLang(url, request, cookies))
  const theme = resolveRequestTheme(cookies)
  const token = await makeToken(env)

  return createHtmlResponse(
    renderPage(lang, theme, token),
    200,
    langCookieHeader(url, lang)
  )
}


// ==========================================
// css
//
// Mobile-first, and the input font-size floor is not cosmetic: an
// input under 16px makes iOS Safari zoom the page on focus and
// never zoom back. On a form this is the difference between
// usable and abandoned.
// ==========================================
function css() {
  return `
    .ct-wrap { max-width: 720px; margin-inline: auto; padding: 0 4px; }
    .ct-head { margin-block: 26px 22px; }
    .ct-head h1 { font-size: clamp(1.7rem, 5vw, 2.3rem); font-weight: 800; letter-spacing: -.01em; }
    .ct-head p { color: var(--text-dim); margin-top: 10px; line-height: 1.8; }

    .ct-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; padding: clamp(18px, 4vw, 30px);
      box-shadow: 0 2px 14px rgba(20, 26, 38, .06);
    }

    .ct-field { display: block; margin-bottom: 18px; min-width: 0; }
    .ct-field > span {
      display: block; font-size: .84rem; font-weight: 700;
      color: var(--text); margin-bottom: 7px;
    }
    .ct-field small {
      display: block; color: var(--text-dim);
      font-size: .78rem; margin-top: 6px; line-height: 1.6;
    }

    .ct-card input[type="text"],
    .ct-card input[type="email"],
    .ct-card textarea,
    .ct-card select {
      width: 100%; font: inherit; font-size: 1rem; min-height: 46px;
      padding: 12px 14px; border-radius: 11px;
      border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text);
      outline: none; transition: border-color .16s ease, box-shadow .16s ease;
    }
    @media (max-width: 720px) {
      .ct-card input, .ct-card textarea, .ct-card select { font-size: 16px; }
    }
    .ct-card textarea { min-height: 190px; resize: vertical; line-height: 1.7; }
    .ct-card input:focus, .ct-card textarea:focus, .ct-card select:focus {
      border-color: var(--brand);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent);
    }

    /* The topic buttons. Radios, styled - so the choice survives a
       page without JavaScript and is announced as a radio group. */
    .ct-topics { display: flex; flex-wrap: wrap; gap: 8px; }
    /* The label is only the hit area; the span inside it is the
       pill that is seen. Styling both gave every topic a pill
       drawn inside another pill. */
    .ct-topics label { cursor: pointer; display: inline-flex; }
    .ct-topics input { position: absolute; opacity: 0; width: 0; height: 0; }
    .ct-topics input:checked + span {
      background: var(--brand); border-color: var(--brand); color: #fff;
    }
    .ct-topics span {
      border: 1px solid var(--border); border-radius: 999px;
      padding: 9px 15px; font-size: .86rem; font-weight: 600;
      display: inline-flex; align-items: center; min-height: 40px;
      background: var(--surface-2); color: var(--text-dim);
      transition: background .16s ease, color .16s ease, border-color .16s ease;
    }
    .ct-topics input:focus-visible + span { outline: 2px solid var(--brand); outline-offset: 2px; }

    /* The honeypot. Not display:none - some bots skip hidden
       fields on the assumption that they are traps, and some
       screen readers announce a display:none field anyway. Taken
       out of the tab order and told not to autocomplete, it is
       invisible to a person using the page in any normal way and
       present in the DOM for a bot that walks inputs. aria-hidden
       keeps it out of the accessibility tree.

       It is CLIPPED rather than pushed off-screen, and that is
       the whole point of this rule. The usual trick is a
       left of minus 9999 pixels. In a left-to-right document a
       browser does not make room for overflow past the left edge,
       so it costs nothing and nobody notices. In a RIGHT-to-left
       document that edge is the inline END, and the browser
       scrolls to it: the Persian contact page could be dragged
       nearly ten thousand pixels sideways, which on a phone is a
       page that will not sit still. A one-pixel box with its
       contents clipped occupies no space in either direction. */
    .ct-hp {
      position: absolute; width: 1px; height: 1px;
      margin: -1px; padding: 0; border: 0;
      overflow: hidden; clip-path: inset(50%); white-space: nowrap;
    }

    /* The real file input, hidden behind the drop zone that opens
       it. Same clipping as the honeypot and for the same reason:
       an off-screen offset here made the Persian page scroll
       sideways just as surely as the honeypot did. It must stay in
       the DOM and stay focusable - the drop zone calls click() on
       it - so it cannot be display:none. */
    .ct-vh {
      position: absolute; width: 1px; height: 1px;
      margin: -1px; padding: 0; border: 0;
      overflow: hidden; clip-path: inset(50%); white-space: nowrap;
    }

    .ct-files { display: grid; gap: 10px; }
    .ct-drop {
      border: 1.5px dashed var(--border); border-radius: 12px;
      padding: 18px; text-align: center; cursor: pointer;
      background: var(--surface-2); color: var(--text-dim);
      font-size: .88rem; min-height: 60px;
      display: flex; align-items: center; justify-content: center;
      transition: border-color .16s ease, background .16s ease;
    }
    .ct-drop:hover { border-color: var(--brand); }
    .ct-thumbs { display: flex; flex-wrap: wrap; gap: 10px; }
    .ct-thumb { position: relative; width: 92px; }
    .ct-thumb img {
      width: 92px; height: 92px; object-fit: cover; border-radius: 10px;
      border: 1px solid var(--border); display: block;
    }
    .ct-thumb button {
      position: absolute; inset-block-start: -7px; inset-inline-end: -7px;
      width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--text); font: inherit; font-size: .8rem; line-height: 1;
      display: grid; place-items: center;
    }
    .ct-thumb span {
      display: block; font-size: .68rem; color: var(--text-dim);
      margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .ct-send {
      appearance: none; border: 0; cursor: pointer; font: inherit;
      font-size: 1rem; font-weight: 700; padding: 14px 26px; border-radius: 12px;
      color: #fff; background: var(--brand); min-height: 50px;
      transition: filter .16s ease, transform .16s ease;
    }
    .ct-send:hover { filter: brightness(1.07); }
    .ct-send:active { transform: translateY(1px); }
    .ct-send:disabled { opacity: .6; cursor: default; transform: none; }

    .ct-status { margin-top: 14px; font-size: .9rem; line-height: 1.7; }
    .ct-status.err { color: #c8324b; }
    .ct-status.ok { color: #1a8a5a; }

    .ct-done {
      text-align: center; padding: 34px 20px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px;
    }
    .ct-done .mark {
      width: 58px; height: 58px; margin: 0 auto 16px; border-radius: 50%;
      display: grid; place-items: center; font-size: 1.6rem; color: #fff;
      background: #1a8a5a;
    }
    .ct-done h2 { font-size: 1.25rem; font-weight: 800; }
    .ct-done p { color: var(--text-dim); margin: 10px auto 20px; max-width: 420px; line-height: 1.8; }

    .ct-alt {
      margin-block: 26px 40px; padding: 18px 20px; border-radius: 14px;
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .ct-alt h2 { font-size: .95rem; font-weight: 800; margin-bottom: 8px; }
    .ct-alt p { color: var(--text-dim); font-size: .86rem; line-height: 1.8; }
    .ct-alt a { font-weight: 700; overflow-wrap: anywhere; }

    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; }
    }
  `
}


// ==========================================
// renderPage
// ==========================================
function renderPage(lang, theme, token) {
  const t = I18N[lang] || I18N.fa
  const nav = NAV_I18N[lang] || NAV_I18N.fa
  const dir = dirFor(lang)
  const themeAttr = themeAttribute(theme)

  const trail = [
    { href: '/', label: nav.home },
    { href: PAGE_PATH, label: t.crumb }
  ]

  const topics = TOPICS.map((key, index) => `
        <label>
          <input type="radio" name="topic" value="${key}"${index === 0 ? ' checked' : ''}>
          <span>${escapeHtml(t[TOPIC_LABEL[key]])}</span>
        </label>`).join('')

  const megabytes = Math.round(CONFIG.CONTACT.MAX_FILE_BYTES / (1024 * 1024))

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}"${themeAttr}>
<head>
  ${getPageHead({ title: t.metaTitle, amirLogo: CONFIG.AMIR_LOGO, description: t.metaDesc })}
  ${seoHead({
    path: PAGE_PATH,
    title: t.metaTitle,
    description: t.metaDesc,
    lang,
    keywords: lang === 'fa'
      ? ['ارتباط با AmirCollider', 'پشتیبانی Unity DocSnap', 'گزارش باگ بازی']
      : lang === 'ja'
        ? ['AmirCollider お問い合わせ', 'Unity DocSnap サポート', '不具合報告']
        : ['contact AmirCollider', 'Unity DocSnap support', 'report a bug'],
    graph: [breadcrumbLd(trail, lang)]
  })}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap"></noscript>
  ${themeBootScript()}
  <style>${pageFoundationCss({ maxWidth: '760px' })}${siteNavCss()}${css()}</style>
</head>
<body>
  ${siteHeader({ lang, path: PAGE_PATH })}
  <div class="wrap">
    ${siteBreadcrumb({ lang, trail })}
    <main id="main" class="ct-wrap">
      <header class="ct-head">
        <h1>${escapeHtml(t.h1)}</h1>
        <p>${escapeHtml(t.lede)}</p>
      </header>

      <div class="ct-card" id="ctCard">
        <form id="ctForm" method="POST" action="${PAGE_PATH}/send" enctype="multipart/form-data" novalidate>
          <input type="hidden" name="token" value="${escapeHtml(token)}">

          <!--
            The honeypot. A person never sees this and never fills
            it in; a bot that completes every input it finds does.
            See the note on .ct-hp in the stylesheet for why it is
            clipped rather than display:none, and why clipping
            rather than an off-screen offset.
          -->
          <div class="ct-hp" aria-hidden="true">
            <label>Website
              <input type="text" name="website" tabindex="-1" autocomplete="off">
            </label>
          </div>

          <label class="ct-field">
            <span>${escapeHtml(t.name)}</span>
            <input type="text" name="name" required maxlength="${CONFIG.CONTACT.MAX_NAME}"
                   autocomplete="name" placeholder="${escapeHtml(t.namePh)}">
          </label>

          <label class="ct-field">
            <span>${escapeHtml(t.email)}</span>
            <input type="email" name="email" required dir="ltr"
                   autocomplete="email" placeholder="${escapeHtml(t.emailPh)}">
            <small>${escapeHtml(t.emailHint)}</small>
          </label>

          <div class="ct-field">
            <span>${escapeHtml(t.topic)}</span>
            <div class="ct-topics" role="radiogroup" aria-label="${escapeHtml(t.topic)}">${topics}</div>
          </div>

          <label class="ct-field">
            <span>${escapeHtml(t.subject)}</span>
            <input type="text" name="subject" required maxlength="${CONFIG.CONTACT.MAX_SUBJECT}"
                   placeholder="${escapeHtml(t.subjectPh)}">
          </label>

          <label class="ct-field">
            <span>${escapeHtml(t.message)}</span>
            <textarea name="message" required maxlength="${CONFIG.CONTACT.MAX_MESSAGE}"
                      placeholder="${escapeHtml(t.messagePh)}"></textarea>
          </label>

          <div class="ct-field">
            <span>${escapeHtml(t.files)}</span>
            <div class="ct-files">
              <div class="ct-drop" id="ctDrop" role="button" tabindex="0">${escapeHtml(t.filesPick)}</div>
              <input type="file" name="files" id="ctFiles" multiple class="ct-vh"
                     accept="${CONFIG.CONTACT.ALLOWED_TYPES.join(',')}">
              <div class="ct-thumbs" id="ctThumbs"></div>
            </div>
            <small>${escapeHtml(t.filesHint(CONFIG.CONTACT.MAX_FILES, megabytes))}</small>
          </div>

          <button type="submit" class="ct-send" id="ctSend">${escapeHtml(t.send)}</button>
          <p class="ct-status" id="ctStatus" role="status" aria-live="polite"></p>
        </form>
      </div>

      <section class="ct-alt">
        <h2>${escapeHtml(t.altTitle)}</h2>
        <p>${escapeHtml(t.privacy)}</p>
        <p style="margin-top:10px">${escapeHtml(t.altMail)}:
          <a href="mailto:${escapeHtml(CONFIG.SUPPORT_EMAIL)}" dir="ltr">${escapeHtml(CONFIG.SUPPORT_EMAIL)}</a></p>
      </section>
    </main>
    ${siteFooter({ lang })}
  </div>
  ${siteChromeScript()}
  <script>${clientScript(t, lang)}</script>
</body>
</html>`
}


// ==========================================
// clientScript
//
// String.raw, so the code below is written exactly as it runs and
// no dollar-brace inside a regular expression is read as an
// interpolation by the server. The two strings it needs are passed
// in as a small JSON blob rather than interpolated one by one.
// ==========================================
function clientScript(t, lang) {
  const strings = JSON.stringify({
    sending: t.sending,
    okTitle: t.okTitle,
    okBody: t.okBody,
    okAgain: t.okAgain,
    send: t.send,
    errFiles: t.errFiles,
    errTooMany: t.errTooMany,
    errServer: t.errServer,
    filesRemove: t.filesRemove,
    maxFiles: CONFIG.CONTACT.MAX_FILES,
    maxBytes: CONFIG.CONTACT.MAX_FILE_BYTES,
    types: CONFIG.CONTACT.ALLOWED_TYPES,
    action: PAGE_PATH + '/send'
  }).replace(/</g, '\\u003c')

  return 'var CT = ' + strings + ';\n' + String.raw`
(function () {
  var form = document.getElementById('ctForm');
  var card = document.getElementById('ctCard');
  var input = document.getElementById('ctFiles');
  var drop = document.getElementById('ctDrop');
  var thumbs = document.getElementById('ctThumbs');
  var status = document.getElementById('ctStatus');
  var send = document.getElementById('ctSend');
  if (!form) return;

  // The chosen files, held here rather than read off the input.
  // A file input's FileList is read-only, so "remove this one"
  // is impossible without keeping our own list and rebuilding a
  // DataTransfer from it at submit time.
  var chosen = [];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fail(text) {
    status.className = 'ct-status err';
    status.textContent = text;
  }

  function paintThumbs() {
    thumbs.innerHTML = '';
    chosen.forEach(function (file, index) {
      var wrap = document.createElement('div');
      wrap.className = 'ct-thumb';

      var img = document.createElement('img');
      img.alt = '';
      // Revoked on load, so a form with three images does not leak
      // three object URLs for the life of the page.
      var url = URL.createObjectURL(file);
      img.src = url;
      img.onload = function () { URL.revokeObjectURL(url); };

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', CT.filesRemove);
      remove.onclick = function () {
        chosen.splice(index, 1);
        paintThumbs();
      };

      var name = document.createElement('span');
      name.textContent = file.name;

      wrap.appendChild(img);
      wrap.appendChild(remove);
      wrap.appendChild(name);
      thumbs.appendChild(wrap);
    });
  }

  function addFiles(list) {
    status.textContent = '';
    for (var i = 0; i < list.length; i++) {
      var file = list[i];
      if (chosen.length >= CT.maxFiles) { fail(CT.errTooMany); break; }
      if (CT.types.indexOf(file.type) === -1) { fail(CT.errFiles); continue; }
      if (file.size > CT.maxBytes) { fail(CT.errFiles); continue; }
      chosen.push(file);
    }
    paintThumbs();
  }

  drop.addEventListener('click', function () { input.click(); });
  drop.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); }
  });
  input.addEventListener('change', function () {
    addFiles(input.files);
    // Cleared so choosing the same file twice still fires change.
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach(function (name) {
    drop.addEventListener(name, function (event) {
      event.preventDefault();
      drop.style.borderColor = 'var(--brand)';
    });
  });
  ['dragleave', 'drop'].forEach(function (name) {
    drop.addEventListener(name, function (event) {
      event.preventDefault();
      drop.style.borderColor = '';
    });
  });
  drop.addEventListener('drop', function (event) {
    if (event.dataTransfer && event.dataTransfer.files) addFiles(event.dataTransfer.files);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var data = new FormData(form);
    // The input's own files are not in the list we curated, so
    // they are removed and re-added from the chosen array.
    data.delete('files');
    chosen.forEach(function (file) { data.append('files', file); });

    send.disabled = true;
    status.className = 'ct-status';
    status.textContent = CT.sending;

    fetch(CT.action, { method: 'POST', body: data })
      .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        send.disabled = false;
        if (res && res.ok) {
          card.innerHTML =
            '<div class="ct-done">'
            + '<div class="mark">✓</div>'
            + '<h2>' + esc(CT.okTitle) + '</h2>'
            + '<p>' + esc(CT.okBody) + '</p>'
            + '<button type="button" class="ct-send" onclick="window.location.reload()">'
            +   esc(CT.okAgain) + '</button>'
            + '</div>';
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        // The server's own message, which names the actual reason -
        // "too many links", "wrong address" - rather than a generic
        // failure the sender cannot act on.
        fail((res && res.message) || CT.errServer);
      })
      .catch(function () {
        send.disabled = false;
        fail(CT.errServer);
      });
  });
})();
`
}
