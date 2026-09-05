// ==========================================
// Api/MailApi.js
// POST /mail/api - the mail panel's only endpoint.
//
// One endpoint with an `action` field rather than a dozen routes,
// for the reason Api/TheGodApi.js gives: every action needs the
// same authorisation check, and a single door cannot be forgotten
// on the thirteenth.
//
// Actions
//   list        a page of one box (inbox / sent / starred / archived)
//   get         one message, with its bodies
//   send        compose and send; also used for a reply
//   read        mark one message read or unread
//   readAll     mark the whole inbox read
//   star        star or unstar
//   archive     archive or restore
//   delete      remove a message from the mailbox
//   system      a page of mail_outbox (licence deliveries etc), read-only
//   systemGet   one outbox row, with its rendered body
//   status      what is configured, what is missing, and the counts
//
// Everything that writes is a POST body field; nothing is taken
// from the query string, so no action can be triggered by a link.
// ==========================================

import { CONFIG } from '../Config.js'
import { createJsonResponse } from '../Core/Http.js'
import { logInfo, logWarning } from '../Core/Logging.js'
import { sendNow, mailSendable } from '../Commerce/Mailer.js'
import { isMailAuthenticated } from '../Pages/MailPanel.js'
import {
  db, mailTableReady, listMessages, getMessage, storeMessage,
  markRead, markAllRead, setStarred, setArchived, deleteMessage,
  counts, listSystemMail, getSystemMail
} from '../Mail/Store.js'


// ==========================================
// The action list
//
// Named here rather than inferred from the switch, so an unknown
// action can be refused with the list of real ones. A panel that
// answers "bad_action" and nothing else is a panel whose typo
// costs ten minutes.
// ==========================================
const ACTIONS = [
  'status', 'list', 'get', 'send', 'read', 'readAll',
  'star', 'archive', 'delete', 'system', 'systemGet'
]


// ==========================================
// Sending rate limit
//
// Per isolate, in memory, and that is deliberate: the panel is one
// person and this exists to stop a runaway loop or a stolen
// session, not to be an accounting record. A D1 table for it would
// be a write per send to enforce a limit that has never been hit.
// ==========================================
const sendLog = []

function sendRateExceeded() {
  const since = Date.now() - CONFIG.MAIL.SEND_RATE_WINDOW_MS
  while (sendLog.length && sendLog[0] < since) sendLog.shift()
  return sendLog.length >= CONFIG.MAIL.SEND_RATE_LIMIT
}


// ==========================================
// Address validation
//
// Deliberately permissive about the local part - real addresses
// contain +, ., -, _ and more - and strict about the shape. The
// point is to refuse something that is plainly not an address
// before it reaches a provider, not to implement RFC 5322.
// ==========================================
const ADDRESS = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/

function cleanRecipients(input) {
  // One field, several addresses, separated however the operator
  // typed them. Anything that does not look like an address is
  // reported rather than dropped - silently sending to three of
  // four recipients is the worst outcome here.
  const parts = String(input || '')
    .split(/[,;\s]+/)
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)

  const good = []
  const bad = []
  for (const part of parts) {
    if (ADDRESS.test(part) && !good.includes(part)) good.push(part)
    else if (!ADDRESS.test(part)) bad.push(part)
  }
  return { good, bad }
}


// ==========================================
// textFromHtml
// A plain-text alternative, when the operator wrote only HTML.
//
// Every message goes out multipart with both parts. A mail sent
// as HTML alone scores worse with every spam filter there is, and
// reads as an empty message in a client set to plain text.
// ==========================================
function textFromHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}


// ==========================================
// handleMailApi
// ==========================================
export async function handleMailApi(url, request, gameId, requestId, GAMES, env) {
  if (!(await isMailAuthenticated(request, env))) {
    return createJsonResponse({ error: 'unauthorized', message: 'Sign in at /mail.', requestId }, 401)
  }

  let body = {}
  try {
    body = await request.json()
  } catch {
    return createJsonResponse({ error: 'bad_json', message: 'Body must be JSON.', requestId }, 400)
  }

  const action = String(body.action || '')
  const database = db(env)

  if (!ACTIONS.includes(action)) {
    return createJsonResponse(
      { error: 'bad_action', message: 'Unknown action.', actions: ACTIONS, requestId }, 400)
  }

  if (!database) {
    return createJsonResponse({
      error: 'db_not_bound',
      message: 'LICENSE_DB is not bound to this Worker.',
      requestId
    }, 500)
  }

  const ready = await mailTableReady(database)

  // Everything except `status` needs the table. `status` is the
  // action the panel calls to FIND OUT that it is missing, so it
  // must answer without it.
  if (!ready && action !== 'status') {
    return createJsonResponse({
      error: 'mail_table_missing',
      message: 'Run migrations/0013_mail_panel.sql against amircollider-licenses.',
      requestId
    }, 503)
  }

  try {
    switch (action) {
      // ==========================================
      case 'status': {
        return createJsonResponse({
          ok: true,
          address: CONFIG.MAIL.ADDRESS,
          name: CONFIG.MAIL.NAME,
          tableReady: ready,

          // Which provider will carry a send, without ever saying
          // what the key is. CLAUDE.md rule 8.
          canSend: mailSendable(env),
          providers: {
            resend: Boolean(env && env.RESEND_API_KEY),
            brevo: Boolean(env && env.BREVO_API_KEY)
          },

          // Receiving is not something this Worker can check. It
          // depends on an Email Routing rule in the Cloudflare
          // dashboard, which no API call from inside the Worker
          // can see. The panel says so rather than claiming a
          // green tick it cannot justify.
          receiveHint: 'Inbound needs an Email Routing rule for '
            + CONFIG.MAIL.ADDRESS + ' set to "Send to a Worker" -> amircollider.',

          counts: ready ? await counts(database) : null,
          limits: {
            maxBody: CONFIG.MAIL.MAX_BODY,
            maxSubject: CONFIG.MAIL.MAX_SUBJECT,
            perHour: CONFIG.MAIL.SEND_RATE_LIMIT
          },
          requestId
        })
      }

      // ==========================================
      case 'list': {
        const page = await listMessages(database, {
          box: body.box,
          limit: body.limit,
          offset: body.offset,
          q: body.q
        })
        return createJsonResponse({ ok: true, ...page, counts: await counts(database), requestId })
      }

      // ==========================================
      case 'get': {
        const message = await getMessage(database, body.id)
        if (!message) {
          return createJsonResponse({ error: 'not_found', message: 'No such message.', requestId }, 404)
        }

        // Opening a message marks it read. Doing it here rather
        // than in a second call from the browser means a message
        // cannot be left unread because the follow-up request
        // was lost.
        if (!message.read_at) await markRead(database, message.id, true)

        return createJsonResponse({
          ok: true,
          message: { ...message, read_at: message.read_at || Date.now() },
          counts: await counts(database),
          requestId
        })
      }

      // ==========================================
      case 'send': {
        if (!mailSendable(env)) {
          return createJsonResponse({
            error: 'mail_not_configured',
            message: 'Set RESEND_API_KEY or BREVO_API_KEY on this Worker.',
            requestId
          }, 503)
        }

        if (sendRateExceeded()) {
          logWarning('Mail panel send rate limited', { requestId })
          return createJsonResponse({
            error: 'rate_limited',
            message: 'Too many messages this hour (' + CONFIG.MAIL.SEND_RATE_LIMIT + ').',
            requestId
          }, 429)
        }

        const { good, bad } = cleanRecipients(body.to)
        if (bad.length) {
          return createJsonResponse({
            error: 'bad_recipient',
            message: 'Not an email address: ' + bad.join(', '),
            requestId
          }, 400)
        }
        if (!good.length) {
          return createJsonResponse({ error: 'no_recipient', message: 'Add at least one address.', requestId }, 400)
        }

        const subject = String(body.subject || '').slice(0, CONFIG.MAIL.MAX_SUBJECT).trim()
        if (!subject) {
          return createJsonResponse({ error: 'no_subject', message: 'A subject is required.', requestId }, 400)
        }

        const html = String(body.html || '')
        const text = String(body.text || '') || textFromHtml(html)

        if (!html.trim() && !text.trim()) {
          return createJsonResponse({ error: 'empty_body', message: 'The message is empty.', requestId }, 400)
        }
        if (html.length > CONFIG.MAIL.MAX_BODY || text.length > CONFIG.MAIL.MAX_BODY) {
          return createJsonResponse({
            error: 'too_large',
            message: 'The message is over ' + Math.round(CONFIG.MAIL.MAX_BODY / 1024) + ' KB. Shorten it or link to the content.',
            requestId
          }, 413)
        }

        // A reply quotes the message it answers, so the recipient's
        // client threads it instead of starting a new conversation.
        const parent = body.replyTo ? await getMessage(database, body.replyTo) : null
        const inReplyTo = (parent && parent.message_id) || null

        const results = []

        // One send per recipient rather than one message with
        // several To: addresses. Two reasons: nobody's address is
        // shown to anybody else, and one refused address does not
        // fail the delivery to the other three.
        for (const to of good) {
          const attempt = await sendNow(env, {
            to,
            subject,
            html: html || undefined,
            text,
            from: CONFIG.MAIL.ADDRESS,
            fromName: CONFIG.MAIL.NAME,
            replyTo: CONFIG.MAIL.ADDRESS,
            kind: 'panel'
          })

          const id = await storeMessage(database, {
            direction: 'out',
            from: CONFIG.MAIL.ADDRESS,
            fromName: CONFIG.MAIL.NAME,
            to,
            replyTo: CONFIG.MAIL.ADDRESS,
            subject,
            html,
            text,
            inReplyTo,
            providerRef: attempt.ok ? attempt.via : null,
            status: attempt.ok ? 'sent' : 'failed',
            error: attempt.ok ? null : String(attempt.error || '').slice(0, 400),
            createdAt: Date.now()
          })

          results.push({ to, id, sent: Boolean(attempt.ok), error: attempt.ok ? null : attempt.error })
          if (attempt.ok) sendLog.push(Date.now())
        }

        const sent = results.filter(row => row.sent).length

        // Addresses and outcome, never the subject or the body.
        logInfo('Mail panel send', { requestId, recipients: results.length, sent })

        return createJsonResponse({
          ok: sent > 0,
          sent,
          failed: results.length - sent,
          results,
          counts: await counts(database),
          requestId
        }, sent > 0 ? 200 : 502)
      }

      // ==========================================
      case 'read':
        return createJsonResponse({
          ok: await markRead(database, body.id, body.read !== false),
          counts: await counts(database),
          requestId
        })

      case 'readAll':
        return createJsonResponse({
          ok: true,
          changed: await markAllRead(database),
          counts: await counts(database),
          requestId
        })

      case 'star':
        return createJsonResponse({
          ok: await setStarred(database, body.id, Boolean(body.starred)),
          counts: await counts(database),
          requestId
        })

      case 'archive':
        return createJsonResponse({
          ok: await setArchived(database, body.id, Boolean(body.archived)),
          counts: await counts(database),
          requestId
        })

      case 'delete':
        return createJsonResponse({
          ok: await deleteMessage(database, body.id),
          counts: await counts(database),
          requestId
        })

      // ==========================================
      case 'system': {
        const page = await listSystemMail(database, {
          limit: body.limit, offset: body.offset, q: body.q
        })
        return createJsonResponse({ ok: true, ...page, requestId })
      }

      case 'systemGet': {
        const row = await getSystemMail(database, body.id)
        if (!row) {
          return createJsonResponse({ error: 'not_found', message: 'No such outbox row.', requestId }, 404)
        }
        return createJsonResponse({ ok: true, message: row, requestId })
      }
    }
  } catch (error) {
    // The message, never the upstream body. CLAUDE.md rule 8.
    logWarning('Mail API failed', { requestId, action, error: error.message })
    return createJsonResponse({ error: 'mail_api_failed', message: error.message, requestId }, 500)
  }

  return createJsonResponse({ error: 'bad_action', message: 'Unknown action.', actions: ACTIONS, requestId }, 400)
}
