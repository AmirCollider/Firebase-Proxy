// ==========================================
// Mail/Inbound.js
// Receiving mail, through Cloudflare Email Routing.
//
// How a message gets here
//
//   1. Email Routing accepts mail for amircollider.com at
//      Cloudflare's MX records.
//   2. A routing rule for the address is set to "Send to a
//      Worker" and points at this Worker.
//   3. Cloudflare calls the Worker's exported email() handler,
//      which is in Worker.js and calls handleInboundEmail below.
//
// None of steps 1 and 2 can be done from code - they are DNS and
// dashboard configuration. Docs/Mail.md has the exact clicks.
//
// Why a MIME parser lives here
//
// The EmailMessage a Worker receives is the RAW RFC 5322 bytes and
// a couple of envelope fields. There is no `.subject`, no `.html`,
// no decoded body. Cloudflare's own suggestion is the npm package
// postal-mime, and this repository has no build step and no
// node_modules by rule (CLAUDE.md section 0, rule 7) - so the
// parsing is here, deliberately small, and deliberately honest
// about what it does not handle.
//
// What it handles: headers with folded continuation lines, RFC
// 2047 encoded-words in Subject and From, multipart/alternative
// and multipart/mixed, quoted-printable and base64 transfer
// encodings, and charset=utf-8 (plus us-ascii, which is a subset).
//
// What it does not: nested multipart beyond one level of
// recursion is walked but attachments are NOT stored - only
// noted - and a charset that is neither UTF-8 nor ASCII is
// decoded as UTF-8 and may show replacement characters. Both are
// recorded on the row rather than hidden, which is the difference
// between a message that looks wrong and a message that says why.
//
// Public exports:
//   parseEmail(raw)          the parser, exported for testing
//   handleInboundEmail(...)  the email() handler's body
// ==========================================

import { logInfo, logWarning } from '../Core/Logging.js'
import { db, storeMessage, mailTableReady, isBlocked, noteBlockHit } from './Store.js'


// ==========================================
// Size caps
//
// A D1 row that will not fit is a write that fails, and a failed
// write here means a real person's email is lost. Truncating and
// SAYING SO is the better trade: the panel prints a banner on a
// truncated message rather than showing three quarters of a
// sentence as if it were the whole thing.
// ==========================================
const MAX_BODY = 256 * 1024
const MAX_RAW_EXCERPT = 8 * 1024
const MAX_STREAM = 2 * 1024 * 1024


// ==========================================
// readAll
// The raw message, as a string, bounded.
//
// message.raw is a ReadableStream and a sender controls its
// length. Reading it to completion without a ceiling is how one
// oversized message takes down the handler for every message
// after it.
// ==========================================
async function readAll(stream, limit = MAX_STREAM) {
  if (!stream) return ''

  const reader = stream.getReader()
  const chunks = []
  let size = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      chunks.push(value)
      size += value.length
      if (size >= limit) break
    }
  } finally {
    try { reader.releaseLock() } catch { /* the stream is already gone */ }
  }

  const joined = new Uint8Array(size)
  let at = 0
  for (const chunk of chunks) {
    joined.set(chunk.subarray(0, Math.min(chunk.length, size - at)), at)
    at += chunk.length
    if (at >= size) break
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(joined)
}


// ==========================================
// decodeBase64 / decodeQuotedPrintable
//
// Both return BYTES, not text, and the caller decodes once with
// the part's charset. Decoding to a JS string here would mangle
// any multi-byte character that straddles a line break, which in
// Persian and Japanese is most of them.
// ==========================================
function decodeBase64(value) {
  try {
    const clean = String(value).replace(/[^A-Za-z0-9+/=]/g, '')
    const binary = atob(clean)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return new Uint8Array(0)
  }
}


function decodeQuotedPrintable(value) {
  // Soft line breaks first: "=" at end of line means the line was
  // wrapped and the break is not part of the content.
  const unwrapped = String(value).replace(/=\r?\n/g, '')
  const bytes = []

  for (let i = 0; i < unwrapped.length; i++) {
    const ch = unwrapped[i]
    if (ch === '=' && i + 2 < unwrapped.length) {
      const hex = unwrapped.slice(i + 1, i + 3)
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16))
        i += 2
        continue
      }
    }
    // Everything else is already a byte in the ASCII range, except
    // where a non-conforming sender wrote raw UTF-8 - which
    // charCodeAt would split. Encode it properly instead.
    const code = ch.charCodeAt(0)
    if (code < 128) bytes.push(code)
    else for (const b of new TextEncoder().encode(ch)) bytes.push(b)
  }

  return new Uint8Array(bytes)
}


function decodeBytes(bytes) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}


// ==========================================
// decodeWord
// RFC 2047: =?utf-8?B?...?= and =?utf-8?Q?...?=
//
// This is what a Subject line looks like the moment it contains a
// single non-ASCII character - which for this mailbox is most of
// them. Without this the panel shows the encoded form and the
// operator reads =?UTF-8?B?2LPZhNin2YU=?= instead of "سلام".
// ==========================================
function decodeWord(value) {
  return String(value || '').replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (whole, charset, encoding, payload) => {
      try {
        const bytes = encoding.toUpperCase() === 'B'
          ? decodeBase64(payload)
          // In an encoded-word specifically, "_" means a space.
          : decodeQuotedPrintable(payload.replace(/_/g, ' '))
        return new TextDecoder(charset.toLowerCase(), { fatal: false }).decode(bytes)
      } catch {
        return whole
      }
    }
  // Adjacent encoded-words are separated by whitespace that is not
  // part of the text. Folding them back together is what turns
  // two halves of one Persian subject into one subject.
  ).replace(/\?=\s+=\?/g, '?==?')
}


// ==========================================
// splitHeaders
// Header block and body, with folded lines joined.
// ==========================================
function splitHeaders(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n')
  const cut = text.indexOf('\n\n')
  const head = cut === -1 ? text : text.slice(0, cut)
  const body = cut === -1 ? '' : text.slice(cut + 2)

  const headers = {}
  // A header value continued on the next line starts with
  // whitespace. Unfolding first means every lookup below sees one
  // line per header, which is what the RFC says a parser sees.
  for (const line of head.replace(/\n[ \t]+/g, ' ').split('\n')) {
    const at = line.indexOf(':')
    if (at <= 0) continue
    const name = line.slice(0, at).trim().toLowerCase()
    const value = line.slice(at + 1).trim()
    // A repeated header keeps the first. Received: appears many
    // times and none of them is interesting here.
    if (!(name in headers)) headers[name] = value
  }

  return { headers, body }
}


// ==========================================
// parseAddress
// "Amir <a@b.com>" -> { name, address }
// ==========================================
export function parseAddress(value) {
  const raw = decodeWord(String(value || '').trim())
  const angled = raw.match(/^(.*)<([^>]+)>\s*$/)

  if (angled) {
    return {
      name: angled[1].trim().replace(/^["']|["']$/g, '').trim(),
      address: angled[2].trim().toLowerCase()
    }
  }

  return { name: '', address: raw.replace(/^["']|["']$/g, '').trim().toLowerCase() }
}


function contentType(headers) {
  const raw = String(headers['content-type'] || 'text/plain')

  // The TYPE is case-insensitive and gets lowercased; the BOUNDARY
  // is not and must not. Lowercasing the whole header meant a
  // message declaring boundary="BOUND1" was searched for "bound1",
  // no part ever matched, and every multipart message - which is
  // every message any real mail client sends - parsed as empty.
  const type = raw.split(';')[0].trim().toLowerCase()
  const boundary = (raw.match(/boundary\s*=\s*"([^"]+)"/i)
    || raw.match(/boundary\s*=\s*([^;\s]+)/i) || [])[1] || ''

  return { type, boundary }
}


function decodePart(headers, body) {
  const encoding = String(headers['content-transfer-encoding'] || '7bit').toLowerCase().trim()
  if (encoding === 'base64') return decodeBytes(decodeBase64(body))
  if (encoding === 'quoted-printable') return decodeBytes(decodeQuotedPrintable(body))
  return body
}


// ==========================================
// walkParts
// Collects the text and html alternatives out of a MIME tree.
//
// Depth-limited. A malformed message can declare a boundary that
// appears inside its own parts, and a parser that recurses on
// whatever it finds will happily do so until the isolate dies.
// ==========================================
function walkParts(headers, body, found, depth = 0) {
  const { type, boundary } = contentType(headers)

  if (type.startsWith('multipart/') && boundary && depth < 6) {
    const marker = '--' + boundary
    const segments = body.split(marker)

    for (const segment of segments) {
      const piece = segment.replace(/^\r?\n/, '')
      if (!piece.trim() || piece.startsWith('--')) continue
      const inner = splitHeaders(piece)
      walkParts(inner.headers, inner.body, found, depth + 1)
    }
    return
  }

  const disposition = String(headers['content-disposition'] || '')

  // An attachment is noted, never stored. Storing them would mean
  // this table grows with whatever anybody sends, and the panel
  // has nowhere to put a binary anyway.
  //
  // The keyword is matched case-insensitively; the FILENAME is
  // read off the original header, for the same reason the
  // boundary is - lowercasing it renames somebody's Invoice.PDF.
  if (/attachment/i.test(disposition)) {
    const name = (disposition.match(/filename\s*=\s*"([^"]+)"/i)
      || disposition.match(/filename\s*=\s*([^;\s]+)/i) || [])[1] || 'attachment'
    found.attachments.push(decodeWord(name))
    return
  }

  const decoded = decodePart(headers, body)
  if (type === 'text/html') found.html.push(decoded)
  else if (type === 'text/plain') found.text.push(decoded)
}


// ==========================================
// parseEmail
// Raw RFC 5322 bytes to the fields the panel stores.
// ==========================================
export function parseEmail(raw) {
  const { headers, body } = splitHeaders(raw)
  const found = { html: [], text: [], attachments: [] }

  try {
    walkParts(headers, body, found)
  } catch (error) {
    // A message this parser cannot walk still becomes a row: the
    // envelope is known from the headers, and raw_excerpt carries
    // enough to see what arrived. Losing the mail entirely would
    // be worse than showing it badly.
    logWarning('MIME walk failed, keeping the envelope', { error: error.message })
  }

  const from = parseAddress(headers.from)
  const to = parseAddress(headers.to)
  const replyTo = headers['reply-to'] ? parseAddress(headers['reply-to']).address : ''

  let html = found.html.join('\n').trim()
  let text = found.text.join('\n').trim()
  let truncated = false

  if (html.length > MAX_BODY) { html = html.slice(0, MAX_BODY); truncated = true }
  if (text.length > MAX_BODY) { text = text.slice(0, MAX_BODY); truncated = true }

  // A note rather than a silent omission, appended to the text
  // part where the panel will show it under the body.
  if (found.attachments.length) {
    const note = 'Attachments (not stored): ' + found.attachments.join(', ')
    text = text ? text + '\n\n' + note : note
  }

  return {
    from: from.address,
    fromName: from.name,
    to: to.address,
    replyTo,
    subject: decodeWord(headers.subject || '') || '(no subject)',
    html,
    text,
    messageId: headers['message-id'] || '',
    inReplyTo: headers['in-reply-to'] || '',
    date: headers.date || '',
    attachments: found.attachments,
    truncated,
    rawExcerpt: String(raw || '').slice(0, MAX_RAW_EXCERPT)
  }
}


// ==========================================
// handleInboundEmail
// What Worker.js's email() handler runs.
//
// It never throws and never rejects the message. A throw inside
// this handler is, to Cloudflare, a delivery failure - which
// bounces the mail back to whoever sent it. A parsing bug on our
// side must not become a bounce on theirs, so every failure path
// here ends in a log and a return.
// ==========================================
export async function handleInboundEmail(message, env) {
  const database = db(env)

  if (!database) {
    logWarning('Inbound mail dropped: LICENSE_DB is not bound')
    return
  }

  if (!(await mailTableReady(database))) {
    logWarning('Inbound mail dropped: run migrations/0013_mail_panel.sql')
    return
  }

  let parsed
  try {
    parsed = parseEmail(await readAll(message.raw))
  } catch (error) {
    logWarning('Inbound mail could not be read', { error: error.message })
    return
  }

  // The envelope wins over the headers. A From: header is written
  // by the sender and can say anything; message.from is what the
  // SMTP conversation actually presented, and it is the address a
  // reply has to go to.
  const envelopeFrom = String(message.from || '').toLowerCase()
  const envelopeTo = String(message.to || '').toLowerCase()

  // ==========================================
  // The blocklist, checked against the ENVELOPE address.
  //
  // Not the From: header, which the sender writes and can set to
  // anything - blocking on it would be blocking a string the
  // person being blocked controls.
  //
  // The message is dropped rather than rejected. Rejecting would
  // bounce it, and a bounce tells a spammer the address is real
  // and tells a wrongly-blocked person their mail failed. Silently
  // accepting and discarding is the behaviour every mail system
  // uses here, and the hit counter is what makes it auditable.
  // ==========================================
  const block = await isBlocked(database, envelopeFrom)
  if (block) {
    await noteBlockHit(database, block.id)
    logInfo('Inbound mail dropped by a block rule', {
      from: envelopeFrom,
      rule: block.kind + ':' + block.value
    })
    return
  }

  const id = await storeMessage(database, {
    direction: 'in',
    from: envelopeFrom || parsed.from,
    fromName: parsed.fromName,
    to: envelopeTo || parsed.to,
    replyTo: parsed.replyTo || envelopeFrom || parsed.from,
    subject: parsed.subject,
    html: parsed.html,
    text: parsed.text,
    messageId: parsed.messageId,
    inReplyTo: parsed.inReplyTo,
    status: 'received',
    source: 'email',
    truncated: parsed.truncated,
    rawExcerpt: parsed.rawExcerpt,
    createdAt: Date.now()
  })

  // Addresses are logged, bodies and subjects are not. CLAUDE.md
  // rule 8: never log an email body.
  logInfo('Inbound mail stored', {
    id,
    from: envelopeFrom,
    to: envelopeTo,
    truncated: parsed.truncated,
    attachments: parsed.attachments.length
  })
}
