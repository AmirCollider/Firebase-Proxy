-- ==========================================
-- 0014_mail_folders.sql
--
-- Folders, a blocklist, and the columns the public contact form
-- needs on a message row.
--
-- BELONGS TO: LICENSE_DB (amircollider-licenses). Same warning as
-- 0013 and every other numbered file: running it against a game's
-- own database succeeds and does nothing useful.
--
--   npx wrangler d1 execute amircollider-licenses --remote \
--     --file=./migrations/0014_mail_folders.sql
--
-- 0013 must have been run first. This file only adds to what that
-- one created.
-- ==========================================


-- ==========================================
-- mail_folders
-- Operator-defined folders.
--
-- Inbox, Sent, Starred and Archived are NOT rows here: they are
-- views over direction/starred/archived, which every mail client
-- treats as built in and none of which a person should be able to
-- delete by accident. A folder here is the other kind - "Orders",
-- "Bugs", "Later" - and a message belongs to at most one.
--
-- At most one, not many, and that is a deliberate simplification:
-- a message in three folders needs a join table, a way to render
-- "which of these am I looking at", and a rule for what deleting a
-- folder does to a message that is only in that one. A mailbox for
-- one person does not earn that.
-- ==========================================
CREATE TABLE IF NOT EXISTS mail_folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,

  -- A colour the panel paints the folder's chip with. Validated
  -- against a short list in the API - free-form here so a later
  -- palette change is not a migration.
  color       TEXT,

  -- Display order. The panel renumbers on reorder rather than
  -- leaving gaps, so this is dense.
  position    INTEGER NOT NULL DEFAULT 0,

  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mail_folders_pos ON mail_folders (position);


-- ==========================================
-- mail_blocks
-- Addresses and domains whose mail is refused.
--
-- Enforced in TWO places and it has to be both:
--
--   1. Mail/Inbound.js, before a row is written - so a blocked
--      sender never reaches the mailbox at all.
--   2. Pages/Contact.js, before the contact form sends - because
--      the form writes into the same mailbox and would otherwise
--      be the way around the block.
--
-- `kind` is 'address' for one exact address and 'domain' for
-- everything at a host. A domain block stores the bare host with
-- no leading dot or at-sign; the matcher adds those.
-- ==========================================
CREATE TABLE IF NOT EXISTS mail_blocks (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('address', 'domain')),

  -- Lowercased by the writer. A block on Foo@Example.com that
  -- misses foo@example.com is not a block.
  value       TEXT NOT NULL,

  -- Why, so a block six months old is still explicable.
  note        TEXT,

  -- How many messages this rule has refused. Cheap to keep and it
  -- is the only way to tell a rule that is working from one that
  -- was aimed at the wrong address.
  hits        INTEGER NOT NULL DEFAULT 0,
  last_hit_at INTEGER,

  created_at  INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_blocks_value ON mail_blocks (kind, value);


-- ==========================================
-- New columns on mail_messages.
--
-- SQLite has no ADD COLUMN IF NOT EXISTS, so re-running this file
-- errors on these four lines and does nothing else. That is the
-- intended behaviour of a numbered migration and the panel's
-- Folders card names the columns it cannot find rather than
-- failing; every read path probes instead of assuming.
-- ==========================================

-- Which folder, or NULL for none. No foreign key: deleting a
-- folder should orphan its messages back to the inbox, not delete
-- them, and ON DELETE SET NULL needs the FK support D1 does not
-- enable by default. Mail/Store.js clears the column instead.
ALTER TABLE mail_messages ADD COLUMN folder_id TEXT;

-- Where the message came from: 'email' for anything Email Routing
-- delivered, 'contact' for the public form, 'panel' for something
-- the operator typed. The panel shows a chip for the second, and
-- it matters: a contact-form message carries an address a stranger
-- TYPED, and replying to it is not the same act as replying to a
-- verified SMTP envelope.
ALTER TABLE mail_messages ADD COLUMN source TEXT;

-- The contact form's own fields. The name the sender typed, and
-- the spam score the filter gave the submission - kept so a
-- message that only just passed can be recognised later, and so
-- the thresholds can be tuned against real traffic rather than
-- guesses.
ALTER TABLE mail_messages ADD COLUMN sender_name TEXT;
ALTER TABLE mail_messages ADD COLUMN spam_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_mail_folder ON mail_messages (folder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_source ON mail_messages (source, created_at DESC);
