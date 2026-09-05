// ==========================================
// Mail/Store.js
// Every LICENSE_DB query the mail panel makes.
//
// The panel's handlers do no SQL of their own, for the same
// reason Games/Store.js exists: one file to read when the
// question is "what does this touch", and one place to change
// when a column moves.
//
// Public exports:
//   db(env)                       the LICENSE_DB binding, or null
//   mailTableReady(database)      has 0013 been run?
//   newMessageId()                an id for a row
//   storeMessage(...)             write one message
//   listMessages(...)             the list view
//   getMessage(...)               one message, whole
//   markRead / markAllRead / setStarred / setArchived / deleteMessage
//   counts(database)              unread and per-box totals
//   listSystemMail(...)           mail_outbox, read-only
//   getSystemMail(...)
// ==========================================

import { logWarning } from '../Core/Logging.js'


// ==========================================
// The binding
//
// Same shape as Commerce/Orders.js db(): a missing binding is a
// null rather than a throw, so every caller degrades into "the
// mailbox is not set up" instead of a 500.
// ==========================================
export function db(env) {
  return (env && env.LICENSE_DB) || null
}


// ==========================================
// mailTableReady
//
// 0013 is a new migration and, per CLAUDE.md section 12, a
// migration file in this repository is not evidence that it has
// been run. Every entry point asks this first and the panel says
// which command to run rather than showing an error nobody can
// act on.
// ==========================================
export async function mailTableReady(database) {
  if (!database) return false
  try {
    await database.prepare('SELECT id FROM mail_messages LIMIT 1').first()
    return true
  } catch {
    return false
  }
}


export function newMessageId() {
  return 'msg_' + Date.now().toString(36) + '_' + crypto.randomUUID().slice(0, 8)
}


// ==========================================
// storeMessage
// One row, inbound or outbound.
//
// Returns the id it wrote. A failure is logged and swallowed into
// a null: for an INBOUND message the alternative is rejecting mail
// at the SMTP edge because a column is missing, which bounces a
// real person's email back at them.
// ==========================================
export async function storeMessage(database, message) {
  if (!database) return null

  const id = message.id || newMessageId()

  try {
    await database.prepare(
      `INSERT INTO mail_messages
         (id, direction, from_addr, from_name, to_addr, reply_to, subject,
          html, text, message_id, in_reply_to, provider_ref, status, error,
          read_at, starred, archived, raw_excerpt, truncated, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
    ).bind(
      id,
      message.direction === 'out' ? 'out' : 'in',
      String(message.from || ''),
      message.fromName || null,
      String(message.to || ''),
      message.replyTo || null,
      message.subject || null,
      message.html || null,
      message.text || null,
      message.messageId || null,
      message.inReplyTo || null,
      message.providerRef || null,
      message.status || (message.direction === 'out' ? 'sent' : 'received'),
      message.error || null,

      // An outbound message is read by definition - the operator
      // just typed it. Leaving it unread would put every sent
      // message into the unread badge.
      message.direction === 'out' ? Date.now() : null,

      message.rawExcerpt || null,
      message.truncated ? 1 : 0,
      message.createdAt || Date.now()
    ).run()

    return id
  } catch (error) {
    logWarning('Mail row could not be written', { error: error.message, direction: message.direction })
    return null
  }
}


// ==========================================
// listMessages
// The list view: newest first, one box at a time.
//
// The body columns are deliberately NOT selected. A list of fifty
// messages that each carry a full HTML body is megabytes crossing
// the wire to render a subject line and a date; the preview comes
// from a SUBSTR of the text part instead, which D1 does in the
// query.
// ==========================================
export async function listMessages(database, { box = 'in', limit = 50, offset = 0, q = '' } = {}) {
  if (!database) return { rows: [], total: 0 }

  const size = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
  const skip = Math.max(parseInt(offset, 10) || 0, 0)

  const where = []
  const args = []

  if (box === 'archived') {
    where.push('archived = 1')
  } else if (box === 'starred') {
    where.push('archived = 0 AND starred = 1')
  } else {
    where.push('archived = 0 AND direction = ?')
    args.push(box === 'out' ? 'out' : 'in')
  }

  const term = String(q || '').trim()
  if (term) {
    // Subject, address and body. LIKE rather than FTS: this is one
    // person's mailbox, the table is small, and an FTS index is a
    // second thing to migrate and keep in step for a search that
    // runs a few times a day.
    where.push('(subject LIKE ? OR from_addr LIKE ? OR to_addr LIKE ? OR text LIKE ?)')
    const like = '%' + term.replace(/[%_]/g, ch => '\\' + ch) + '%'
    args.push(like, like, like, like)
  }

  const clause = 'WHERE ' + where.join(' AND ')

  try {
    const { results } = await database.prepare(
      `SELECT id, direction, from_addr, from_name, to_addr, subject,
              message_id, provider_ref, status, error, read_at, starred, archived,
              truncated, created_at,
              SUBSTR(COALESCE(text, ''), 1, 220) AS preview
         FROM mail_messages ${clause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`
    ).bind(...args, size, skip).all()

    const total = await database
      .prepare(`SELECT COUNT(*) AS n FROM mail_messages ${clause}`)
      .bind(...args).first()

    return { rows: results || [], total: (total && total.n) || 0, limit: size, offset: skip }
  } catch (error) {
    logWarning('Mail list failed', { error: error.message })
    return { rows: [], total: 0 }
  }
}


export async function getMessage(database, id) {
  if (!database || !id) return null
  try {
    return await database.prepare('SELECT * FROM mail_messages WHERE id = ? LIMIT 1').bind(id).first()
  } catch {
    return null
  }
}


export async function markRead(database, id, read = true) {
  if (!database || !id) return false
  try {
    const result = await database
      .prepare('UPDATE mail_messages SET read_at = ? WHERE id = ?')
      .bind(read ? Date.now() : null, id).run()
    return Boolean(result.meta && result.meta.changes)
  } catch {
    return false
  }
}


export async function markAllRead(database) {
  if (!database) return 0
  try {
    const result = await database
      .prepare('UPDATE mail_messages SET read_at = ? WHERE read_at IS NULL AND archived = 0')
      .bind(Date.now()).run()
    return (result.meta && result.meta.changes) || 0
  } catch {
    return 0
  }
}


export async function setStarred(database, id, starred) {
  if (!database || !id) return false
  try {
    const result = await database
      .prepare('UPDATE mail_messages SET starred = ? WHERE id = ?')
      .bind(starred ? 1 : 0, id).run()
    return Boolean(result.meta && result.meta.changes)
  } catch {
    return false
  }
}


export async function setArchived(database, id, archived) {
  if (!database || !id) return false
  try {
    const result = await database
      .prepare('UPDATE mail_messages SET archived = ? WHERE id = ?')
      .bind(archived ? 1 : 0, id).run()
    return Boolean(result.meta && result.meta.changes)
  } catch {
    return false
  }
}


export async function deleteMessage(database, id) {
  if (!database || !id) return false
  try {
    const result = await database.prepare('DELETE FROM mail_messages WHERE id = ?').bind(id).run()
    return Boolean(result.meta && result.meta.changes)
  } catch {
    return false
  }
}


// ==========================================
// counts
// What the sidebar prints.
// ==========================================
export async function counts(database) {
  const empty = { unread: 0, inbox: 0, sent: 0, starred: 0, archived: 0 }
  if (!database) return empty

  try {
    const row = await database.prepare(
      `SELECT
         SUM(CASE WHEN read_at IS NULL AND archived = 0 AND direction = 'in' THEN 1 ELSE 0 END) AS unread,
         SUM(CASE WHEN archived = 0 AND direction = 'in'  THEN 1 ELSE 0 END) AS inbox,
         SUM(CASE WHEN archived = 0 AND direction = 'out' THEN 1 ELSE 0 END) AS sent,
         SUM(CASE WHEN archived = 0 AND starred = 1 THEN 1 ELSE 0 END) AS starred,
         SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) AS archived
       FROM mail_messages`
    ).first()

    if (!row) return empty
    return {
      unread: row.unread || 0,
      inbox: row.inbox || 0,
      sent: row.sent || 0,
      starred: row.starred || 0,
      archived: row.archived || 0
    }
  } catch {
    return empty
  }
}


// ==========================================
// listSystemMail
// mail_outbox, read-only.
//
// This is where a licence delivery lives. The operator's question
// - "did the person who bought Pro actually get their key?" - is
// answered by this table and not by mail_messages, because the
// checkout queues its mail there and always has.
//
// Read-only on purpose: the cron owns those rows, and a panel that
// could edit a queue the cron is walking is a panel that can
// double-send somebody's licence key.
// ==========================================
export async function listSystemMail(database, { limit = 50, offset = 0, q = '' } = {}) {
  if (!database) return { rows: [], total: 0 }

  const size = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
  const skip = Math.max(parseInt(offset, 10) || 0, 0)

  const where = []
  const args = []

  const term = String(q || '').trim()
  if (term) {
    where.push('(subject LIKE ? OR to_email LIKE ? OR kind LIKE ?)')
    const like = '%' + term.replace(/[%_]/g, ch => '\\' + ch) + '%'
    args.push(like, like, like)
  }

  const clause = where.length ? 'WHERE ' + where.join(' AND ') : ''

  try {
    const { results } = await database.prepare(
      `SELECT id, order_id, kind, to_email, lang, subject, sent_at, attempts,
              last_error, next_attempt_at, created_at, sent_via
         FROM mail_outbox ${clause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`
    ).bind(...args, size, skip).all()

    const total = await database
      .prepare(`SELECT COUNT(*) AS n FROM mail_outbox ${clause}`)
      .bind(...args).first()

    return { rows: results || [], total: (total && total.n) || 0, limit: size, offset: skip }
  } catch (error) {
    // mail_outbox predates this panel, but a deployment that has
    // never run the commerce migration has no such table - and
    // that is a missing feature here, not a broken panel.
    logWarning('System mail list unavailable', { error: error.message })
    return { rows: [], total: 0, unavailable: true }
  }
}


export async function getSystemMail(database, id) {
  if (!database || !id) return null
  try {
    return await database.prepare('SELECT * FROM mail_outbox WHERE id = ? LIMIT 1').bind(id).first()
  } catch {
    return null
  }
}
