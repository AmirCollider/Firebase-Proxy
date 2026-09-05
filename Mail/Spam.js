// ==========================================
// Mail/Spam.js
// The contact form's spam filter.
//
// Why a hand-written filter rather than a CAPTCHA
//
// A CAPTCHA is a third-party script on a page that has none, a
// cookie banner's worth of privacy questions, and a wall in front
// of the one thing this page exists to make easy. This form gets a
// handful of real submissions a week; the traffic it has to stop
// is drive-by bots that POST every form they find, not a person
// deliberately attacking it.
//
// So: five cheap signals, scored, with the threshold high enough
// that a real message written in a hurry passes. Every signal is
// listed on the returned object, so a submission that was refused
// can be explained rather than just refused.
//
// What this is NOT: a reputation system, a content classifier, or
// a defence against somebody who reads this file. It is a screen
// door. The rate limiter behind it is what bounds the damage when
// somebody gets through.
//
// Public exports:
//   scoreSubmission({...})  -> { score, reasons, verdict }
//   SPAM_THRESHOLD
// ==========================================


// Above this, the message is refused. A real message scores 0-15;
// the cheapest bot scores 40 on the honeypot alone.
export const SPAM_THRESHOLD = 50


// ==========================================
// The link count that starts to look wrong.
//
// A person asking about a licence pastes one URL - their order
// page, a screenshot host, a repository. Five is a link farm.
// ==========================================
const LINK_SOFT = 2
const LINK_HARD = 5


// How fast a human can plausibly read a form and fill it in. A
// POST arriving under this many milliseconds after the page was
// rendered did not involve reading.
const MIN_FILL_MS = 3000

// And the other end: a form token older than this is stale. It is
// not a spam signal on its own - people leave tabs open - which is
// why it scores low and is listed separately.
const MAX_FILL_MS = 6 * 60 * 60 * 1000


// ==========================================
// Phrases that only appear in bulk mail.
//
// Deliberately short and deliberately unambiguous. A list that
// tries to catch everything catches real messages: "SEO" and
// "backlink" are things somebody might genuinely ask about, so
// they are not here. Each of these is a phrase that a person
// writing to a game developer does not produce by accident.
// ==========================================
const PHRASES = [
  'viagra', 'cialis', 'casino', 'crypto investment', 'forex signal',
  'binary option', 'porn', 'sex chat', 'escort service',
  'guaranteed first page', 'buy backlinks', 'bulk email list',
  'work from home earn', 'make money fast', 'nigerian prince',
  'wire transfer fee', 'bitcoin doubler', 'get rich quick'
]


// ==========================================
// scoreSubmission
//
// Every input is optional; a missing one contributes nothing
// rather than throwing. The caller passes what it has.
// ==========================================
export function scoreSubmission({
  name = '',
  email = '',
  subject = '',
  message = '',
  honeypot = '',
  elapsedMs = null,
  attachments = 0
} = {}) {
  const reasons = []
  let score = 0

  const body = String(message || '')
  const all = [name, subject, body].join('\n').toLowerCase()

  // ==========================================
  // 1. The honeypot.
  //
  // A field the CSS hides and a person never sees. Filling it in
  // is not a human mistake - it is a bot walking the DOM and
  // completing every input it finds. This is the single highest
  // -yield signal there is and it costs one hidden input.
  // ==========================================
  if (String(honeypot || '').trim()) {
    score += 60
    reasons.push('honeypot')
  }

  // ==========================================
  // 2. Time to fill.
  //
  // Signed by the server and checked here. Three seconds is below
  // what reading a subject line and typing a sentence takes, and
  // well above what a script needs.
  // ==========================================
  if (Number.isFinite(elapsedMs)) {
    if (elapsedMs < MIN_FILL_MS) {
      // Decisive on its own, and it has to be: a form completed in
      // under three seconds was not read. There is no message a
      // person writes that fast, so nothing here can be a false
      // positive that a second signal is needed to confirm.
      score += 55
      reasons.push('too-fast')
    } else if (elapsedMs > MAX_FILL_MS) {
      score += 5
      reasons.push('stale-form')
    }
  }

  // ==========================================
  // 3. Links.
  // ==========================================
  const links = (body.match(/https?:\/\/|www\./gi) || []).length
  if (links >= LINK_HARD) {
    score += 35
    reasons.push('many-links')
  } else if (links > LINK_SOFT) {
    score += 12
    reasons.push('several-links')
  }

  // Anchor tags and BBCode in a plain-text box are not something a
  // person types.
  if (/<a\s|\[url[=\]]/i.test(body)) {
    score += 25
    reasons.push('markup-links')
  }

  // ==========================================
  // 4. Phrases.
  // ==========================================
  const hits = PHRASES.filter(phrase => all.includes(phrase))
  if (hits.length) {
    score += Math.min(20 * hits.length, 45)
    reasons.push('phrases:' + hits.length)
  }

  // ==========================================
  // 5. Shape.
  //
  // These are weak on their own and are weighted that way. A
  // three-word message is often a real question; a three-word
  // message that is also all-caps and has four links is not, and
  // the sum is what decides.
  // ==========================================
  const trimmed = body.trim()

  if (trimmed.length < 15) {
    score += 15
    reasons.push('very-short')
  }

  const letters = trimmed.replace(/[^A-Za-z]/g, '')
  if (letters.length > 25) {
    const upper = (trimmed.match(/[A-Z]/g) || []).length
    if (upper / letters.length > 0.7) {
      score += 15
      reasons.push('shouting')
    }
  }

  // The same character twenty times over, which is padding rather
  // than writing.
  if (/(.)\1{19,}/.test(trimmed)) {
    score += 15
    reasons.push('repetition')
  }

  // A subject line that is a URL.
  if (/^https?:\/\//i.test(String(subject || '').trim())) {
    score += 25
    reasons.push('url-subject')
  }

  // A name field carrying a link. Decisive for the same reason
  // the timing check is: nobody types a URL where their name goes.
  // The field exists so a reply can open with "Hello Sara"; a link
  // in it is a bot filling every input it found.
  if (/https?:\/\/|www\./i.test(String(name || ''))) {
    score += 55
    reasons.push('link-in-name')
  }

  // An address whose local part is a long random string. Weak on
  // its own - plenty of real addresses look like this - so it is
  // scored low and only matters alongside something else.
  const local = String(email || '').split('@')[0] || ''
  if (local.length > 24 && /\d{6,}/.test(local)) {
    score += 8
    reasons.push('generated-address')
  }

  // Attachments are normal. A submission with the maximum number
  // of them AND nothing written is not.
  if (attachments > 0 && trimmed.length < 10) {
    score += 20
    reasons.push('attachments-no-text')
  }

  return {
    score,
    reasons,
    verdict: score >= SPAM_THRESHOLD ? 'reject' : 'accept'
  }
}
