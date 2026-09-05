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
//
//   foldersReady / listFolders / createFolder / renameFolder
//   deleteFolder / moveToFolder
//   listBlocks / addBlock / removeBlock / isBlocked / noteBlockHit
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


// ==========================================
// foldersReady
//
// 0014 separately from 0013, because they were added separately
// and a deployment can genuinely have one and not the other. The
// panel greys the Folders card and keeps every other box working
// rather than failing whole - the same degradation rule the
// landing-page columns follow.
// ==========================================
export async function foldersReady(database) {
  if (!database) return false
  try {
    await database.prepare('SELECT id FROM mail_folders LIMIT 1').first()
    await database.prepare('SELECT folder_id FROM mail_messages LIMIT 1').first()
    return true
  } catch {
    return false
  }
}


export function newMessageId() {
  return 'msg_' + Date.now().toString(36) + '_' + crypto.randomUUID().slice(0, 8)
}


export function newFolderId() {
  return 'fld_' + Date.now().toString(36) + '_' + crypto.randomUUID().slice(0, 6)
}


export function newBlockId() {
  return 'blk_' + Date.now().toString(36) + '_' + crypto.randomUUID().slice(0, 6)
}


// ==========================================
// storeMessageExtended
// The same insert, with the 0014 columns.
//
// Returns the id on success and null when the columns are not
// there yet - which is the signal storeMessage() uses to fall back
// rather than a thrown error it would have to classify.
// ==========================================
async function storeMessageExtended(database, id, message) {
  try {
    await database.prepare(
      `INSERT INTO mail_messages
         (id, direction, from_addr, from_name, to_addr, reply_to, subject,
          html, text, message_id, in_reply_to, provider_ref, status, error,
          read_at, starred, archived, raw_excerpt, truncated, created_at,
          folder_id, source, sender_name, spam_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?)`
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
      message.direction === 'out' ? Date.now() : null,
      message.rawExcerpt || null,
      message.truncated ? 1 : 0,
      message.createdAt || Date.now(),
      message.folderId || null,
      message.source || (message.direction === 'out' ? 'panel' : 'email'),
      message.senderName || null,
      Number.isFinite(message.spamScore) ? message.spamScore : null
    ).run()

    return id
  } catch {
    return null
  }
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

  // The 0014 columns, tried first and dropped on failure. A
  // deployment that has run 0013 and not 0014 still receives mail;
  // it just does not record which folder or which source, which is
  // exactly what "errors degrade" means here. Writing the short
  // form FIRST and upgrading later would lose the source on every
  // message until somebody noticed.
  const extended = await storeMessageExtended(database, id, message)
  if (extended !== null) return extended

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
  } else if (box === 'contact') {
    // Everything the public form produced, whatever folder it is
    // filed in. A separate view rather than a folder, because a
    // folder is something the operator MOVES a message into and
    // this is a fact about where the message came from.
    where.push("archived = 0 AND source = 'contact'")
  } else if (String(box || '').startsWith('folder:')) {
    where.push('archived = 0 AND folder_id = ?')
    args.push(String(box).slice('folder:'.length))
  } else {
    // The inbox deliberately still shows a message that has been
    // filed: a folder is a label here, not a move out of sight.
    // Only archiving takes something out of the inbox.
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

  // Selected only when 0014 has run. Naming a column that does not
  // exist fails the whole query, and the answer to "this
  // deployment has not migrated yet" is a list without folder
  // chips, not an empty inbox.
  const extended = await foldersReady(database)
  const extraCols = extended ? 'folder_id, source, sender_name, spam_score,' : ''

  try {
    const { results } = await database.prepare(
      `SELECT id, direction, from_addr, from_name, to_addr, subject,
              message_id, provider_ref, status, error, read_at, starred, archived,
              truncated, created_at, ${extraCols}
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


// ==========================================
// Folders
//
// Everything here degrades to an empty list or a false rather than
// throwing, so a deployment that has not run 0014 shows a panel
// with no folder card and a working inbox.
// ==========================================
export async function listFolders(database) {
  if (!database) return []
  try {
    const { results } = await database.prepare(
      `SELECT f.id, f.name, f.color, f.position,
              (SELECT COUNT(*) FROM mail_messages m
                WHERE m.folder_id = f.id AND m.archived = 0) AS n
         FROM mail_folders f
        ORDER BY f.position ASC, f.created_at ASC`
    ).all()
    return results || []
  } catch {
    return []
  }
}


export async function createFolder(database, { name, color }) {
  if (!database) return null
  const id = newFolderId()
  try {
    // Appended, not inserted: a new folder goes last, and the
    // panel's reorder is what moves it.
    const row = await database.prepare('SELECT MAX(position) AS p FROM mail_folders').first()
    const next = ((row && row.p) || 0) + 1

    await database.prepare(
      'INSERT INTO mail_folders (id, name, color, position, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, String(name).slice(0, 60), color || null, next, Date.now()).run()

    return id
  } catch (error) {
    logWarning('Folder could not be created', { error: error.message })
    return null
  }
}


export async function renameFolder(database, id, { name, color }) {
  if (!database || !id) return false
  try {
    const result = await database
      .prepare('UPDATE mail_folders SET name = ?, color = ? WHERE id = ?')
      .bind(String(name).slice(0, 60), color || null, id).run()
    return Boolean(result.meta && result.meta.changes)
  } catch {
    return false
  }
}


// ==========================================
// deleteFolder
//
// Orphans its messages back to the inbox rather than deleting
// them. A folder is a label; removing the label must never be a
// way to lose somebody's email, and "delete folder" is a button
// somebody will press without reading it.
// ==========================================
export async function deleteFolder(database, id) {
  if (!database || !id) return false
  try {
    await database.prepare('UPDATE mail_messages SET folder_id = NULL WHERE folder_id = ?')
      .bind(id).run()
    const result = await database.prepare('DELETE FROM mail_folders WHERE id = ?').bind(id).run()
    return Boolean(result.meta && result.meta.changes)
  } catch {
    return false
  }
}


export async function moveToFolder(database, messageId, folderId) {
  if (!database || !messageId) return false
  try {
    const result = await database
      .prepare('UPDATE mail_messages SET folder_id = ? WHERE id = ?')
      .bind(folderId || null, messageId).run()
    return Boolean(result.meta && result.meta.changes)
  } catch {
    return false
  }
}


// ==========================================
// The blocklist
// ==========================================
export async function listBlocks(database) {
  if (!database) return []
  try {
    const { results } = await database.prepare(
      'SELECT id, kind, value, note, hits, last_hit_at, created_at FROM mail_blocks ORDER BY created_at DESC'
    ).all()
    return results || []
  } catch {
    return []
  }
}


// ==========================================
// splitAddress
// The local part and the host, lowercased.
//
// One place, because a block that matches on a differently-cased
// copy of the same address is not a block, and this is the
// function both the writer and the matcher use.
// ==========================================
export function splitAddress(value) {
  const clean = String(value || '').trim().toLowerCase()
  const at = clean.lastIndexOf('@')
  if (at <= 0) return { address: clean, domain: '' }
  return { address: clean, domain: clean.slice(at + 1) }
}


export async function addBlock(database, { kind, value, note }) {
  if (!database) return null

  const wanted = kind === 'domain' ? 'domain' : 'address'
  let clean = String(value || '').trim().toLowerCase()

  // A domain is stored bare. Somebody typing "@example.com" or
  // "foo@example.com" into the domain field means example.com, and
  // refusing that is a worse answer than understanding it.
  if (wanted === 'domain') {
    clean = clean.replace(/^@/, '')
    const at = clean.lastIndexOf('@')
    if (at >= 0) clean = clean.slice(at + 1)
  }

  if (!clean) return null

  try {
    const id = newBlockId()
    await database.prepare(
      'INSERT INTO mail_blocks (id, kind, value, note, hits, created_at) VALUES (?, ?, ?, ?, 0, ?)'
    ).bind(id, wanted, clean, note ? String(note).slice(0, 200) : null, Date.now()).run()
    return id
  } catch (error) {
    // The unique index makes a duplicate a no-op rather than an
    // error the operator has to interpret.
    logWarning('Block not added', { error: error.message })
    return null
  }
}


export async function removeBlock(database, id) {
  if (!database || !id) return false
  try {
    const result = await database.prepare('DELETE FROM mail_blocks WHERE id = ?').bind(id).run()
    return Boolean(result.meta && result.meta.changes)
  } catch {
    return false
  }
}


// ==========================================
// isBlocked
// Is mail from this address refused?
//
// Checked against the exact address AND its domain in one query.
// Returns the matching row so the caller can count the hit and log
// which rule fired - "blocked" with no rule named is impossible to
// undo when it turns out to be wrong.
//
// A database that has not run 0014 has no table here, and the
// catch returns null: no blocklist means nothing is blocked, which
// is the safe direction. The alternative - failing closed - would
// silently drop every message on a deployment that simply has not
// migrated yet.
// ==========================================
export async function isBlocked(database, address) {
  if (!database) return null

  const { address: exact, domain } = splitAddress(address)
  if (!exact) return null

  try {
    return await database.prepare(
      `SELECT id, kind, value, note FROM mail_blocks
        WHERE (kind = 'address' AND value = ?)
           OR (kind = 'domain'  AND value = ?)
        LIMIT 1`
    ).bind(exact, domain).first()
  } catch {
    return null
  }
}


export async function noteBlockHit(database, id) {
  if (!database || !id) return
  try {
    await database.prepare('UPDATE mail_blocks SET hits = hits + 1, last_hit_at = ? WHERE id = ?')
      .bind(Date.now(), id).run()
  } catch {
    // A counter that cannot be written is not a reason to let a
    // blocked message through.
  }
}
