-- ==========================================
-- 0013_mail_panel.sql
--
-- The /mail operator panel: a mailbox for
-- amircollider@amircollider.com that lives inside this Worker.
--
-- BELONGS TO: LICENSE_DB (amircollider-licenses).
-- Running it against a game's own database succeeds and does
-- nothing useful - see CLAUDE.md section 12 for how often that
-- has happened.
--
--   npx wrangler d1 execute amircollider-licenses --remote \
--     --file=./migrations/0013_mail_panel.sql
--
-- Why a new table rather than more columns on mail_outbox:
--
-- mail_outbox is a QUEUE. Its shape is "a message the system owes
-- somebody, with a retry schedule", every row is machine-written,
-- and the cron deletes nothing but sweeps it constantly. A mailbox
-- is a different thing: it holds mail that ARRIVED, mail a person
-- typed, and it is read far more often than written. Putting both
-- in one table would mean the cron's retry scan walks a person's
-- correspondence, and that every inbound message needs the columns
-- an outbound retry needs and vice versa.
--
-- The panel still SHOWS mail_outbox - a licence delivery is
-- exactly the thing an operator opens this panel to check - it
-- just reads it rather than writing there.
-- ==========================================

CREATE TABLE IF NOT EXISTS mail_messages (
  id            TEXT PRIMARY KEY,

  -- 'in'  the message arrived through Cloudflare Email Routing
  -- 'out' the operator composed and sent it from the panel
  --
  -- One table with a direction rather than two tables, because
  -- every query the panel runs - list, search, open, delete - is
  -- the same query for both, and a thread that mixes the two
  -- reads in one order.
  direction     TEXT NOT NULL CHECK (direction IN ('in', 'out')),

  -- Envelope. from_addr/to_addr are the bare addresses used for
  -- matching and reply; from_name is the display name when the
  -- sender supplied one.
  from_addr     TEXT NOT NULL,
  from_name     TEXT,
  to_addr       TEXT NOT NULL,
  reply_to      TEXT,
  subject       TEXT,

  -- Both bodies, as received or as composed. Stored rendered for
  -- the same reason mail_outbox stores rendered: what is shown
  -- here must be what was actually sent, not what a template
  -- would produce today.
  --
  -- Capped by the writer, not by the schema - D1 has no TEXT
  -- length limit but a row that will not fit is a write that
  -- fails at the worst moment. Mail/Inbound.js truncates and
  -- records that it did.
  html          TEXT,
  text          TEXT,

  -- Message-ID and threading headers, kept so a reply can quote
  -- In-Reply-To and land in the right conversation in the other
  -- person's client rather than starting a new one.
  message_id    TEXT,
  in_reply_to   TEXT,

  -- The provider's id for an outbound message (resend:... or
  -- brevo:...), which is the only handle that answers "did it
  -- bounce". Null for inbound.
  provider_ref  TEXT,

  -- 'received' | 'sent' | 'failed'. A failed outbound row stays
  -- so the operator can see what was attempted and retry it.
  status        TEXT NOT NULL DEFAULT 'received',
  error         TEXT,

  -- Read/starred/archived are per-mailbox state, not per-message
  -- facts, but there is exactly one mailbox here.
  read_at       INTEGER,
  starred       INTEGER NOT NULL DEFAULT 0,
  archived      INTEGER NOT NULL DEFAULT 0,

  -- Bytes as they arrived, for anything the parser did not
  -- understand. Truncated hard: this is a debugging aid, not an
  -- archive, and an unbounded copy of every message would double
  -- the size of this table for a column nobody opens.
  raw_excerpt   TEXT,

  -- How much of the original was kept, so a truncated body can
  -- say so rather than appearing to be the whole message.
  truncated     INTEGER NOT NULL DEFAULT 0,

  created_at    INTEGER NOT NULL
);

-- The panel's list view: newest first, filtered by direction and
-- by archived. Every list query this panel runs is covered here.
CREATE INDEX IF NOT EXISTS idx_mail_box
  ON mail_messages (archived, direction, created_at DESC);

-- Opening a conversation, and the reply lookup.
CREATE INDEX IF NOT EXISTS idx_mail_from    ON mail_messages (from_addr, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_msgid   ON mail_messages (message_id);

-- Unread count, which the panel prints on every render.
CREATE INDEX IF NOT EXISTS idx_mail_unread  ON mail_messages (read_at, archived);
