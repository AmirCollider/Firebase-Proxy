# The mailbox — `/domail2`

A third operator panel, beside `/thegod` and `/testsite`, holding one
mailbox: **amircollider@amircollider.com**. It sends HTML email as that
address, receives mail delivered to it, shows what the checkout has been
sending, and receives everything the public contact form produces.

**The path is `CONFIG.MAIL.PATH` and is deliberately not `/mail`.** That
word, along with `/webmail` and `/admin`, is the first thing any automated
scanner tries. The password is what protects the panel; an address nobody
guesses simply keeps the login form out of every drive-by sweep. Moving it
again is one line in `Config.js` plus four places that cannot import it —
each of those carries a comment saying so.

Three things have to be true before it works, and only the first is code.

---

## 1. Run the migration

Belongs to **`LICENSE_DB`** (`amircollider-licenses`). Running it against a
game's own database succeeds and does nothing useful — see CLAUDE.md §12
for how often that has happened.

```bash
npx wrangler d1 execute amircollider-licenses --remote \
  --file=./migrations/0013_mail_panel.sql

npx wrangler d1 execute amircollider-licenses --remote \
  --file=./migrations/0014_mail_folders.sql
```

**0013** creates `mail_messages` and four indexes. Until it exists the panel
opens, says exactly this command, and refuses every other action —
`{"action":"status"}` reports `tableReady: false`.

**0014** adds folders, the blocklist, and the four columns the contact form
writes (`folder_id`, `source`, `sender_name`, `spam_score`). It is a
*separate* probe: a deployment can have 0013 and not 0014, and the panel
then works fully minus the folder strip and the manage screen, and says so.
`status` reports `foldersReady` for exactly that.

SQLite has no `ADD COLUMN IF NOT EXISTS`, so re-running 0014 errors on those
four lines and changes nothing else. That is the intended behaviour of a
numbered migration.

`mail_outbox` is **not** touched. The panel reads it (that is the
"System mail" box) and never writes there: the cron owns those rows, and a
panel that could edit a queue the cron is walking could re-send somebody's
licence key.

---

## 2. Set the password

```bash
npx wrangler secret put TheEmailPassword
```

`MailPassword` is still accepted as a second name, for one reason only: a
deployment that set the old name should not be locked out by a rename.
Neither name falls back to another panel's password, unlike `/thegod`,
which falls back so a half-configured deployment cannot lock its operator
out of the tool that fixes it. The mailbox is not that tool, and what is
behind it is correspondence plus the ability to send mail as the domain.
With neither secret set, the login form is disabled and says so.

The session cookie is `amir_mail_auth`, `Path=/domail2`, HttpOnly, Secure,
SameSite=Strict, and lasts **12 hours** — shorter than the other panels'
week, for the same reason.

---

## 3. Point Email Routing at this Worker

This is the only step that cannot be done from code, and the only reason
the panel cannot report "receiving: ready" — no API call from inside a
Worker can see whether a routing rule exists.

In the Cloudflare dashboard:

1. **`amircollider.com`** → **Email** → **Email Routing**.
2. If Email Routing has never been enabled, enable it. Cloudflare adds the
   MX and TXT records itself; accept them.
3. **Routing rules** → **Create address**.
4. Custom address: `amircollider@amircollider.com`.
5. Action: **Send to a Worker**.
6. Destination: **`amircollider`**.
7. Save.

Mail to that address now arrives at `Worker.js`'s exported `email()`
handler, which calls `handleInboundEmail()` in `Mail/Inbound.js`.

To check it end to end, send a message to the address from any account and
refresh `/domail2`. If nothing arrives, the Worker's logs
(`npx wrangler tail`) will show either `Inbound mail stored` or the reason
it was dropped.

### Sending needs a provider key

Already set on this deployment, and shared with the checkout:

- `RESEND_API_KEY` — tried first
- `BREVO_API_KEY` — the fallback

The panel's From line is `CONFIG.MAIL.ADDRESS` and **not**
`DOCSNAP_MAIL_FROM`; the two are allowed to differ. Whichever provider
carries it, **the sending domain has to be verified with that provider**
(SPF/DKIM), or the message is accepted by the API and lands in spam.

---

## What is where

| File | Holds |
|---|---|
| `Pages/MailPanel.js` | the panel, its login, the UI, the compose editor, the manage screen |
| `Api/MailApi.js` | `POST {PATH}/api` — one endpoint, an `action` field |
| `Mail/Store.js` | every `LICENSE_DB` query the panel makes |
| `Mail/Inbound.js` | the MIME parser and the `email()` handler's body |
| `Mail/Spam.js` | the contact form's filter |
| `Pages/Contact.js` | `/contact` and `POST /contact/send` |
| `migrations/0013_mail_panel.sql` | `mail_messages` |
| `migrations/0014_mail_folders.sql` | `mail_folders`, `mail_blocks`, four columns |
| `CONFIG.MAIL` in `Config.js` | the address, the **path**, the session length, the limits |
| `CONFIG.CONTACT` in `Config.js` | the form's limits and attachment rules |

### Actions on `POST /domail2/api`

`status`, `list`, `get`, `send`, `read`, `readAll`, `star`, `archive`,
`delete`, `system`, `systemGet`, `folders`, `folderSave`, `folderDrop`,
`move`, `blocks`, `blockAdd`, `blockDrop`. An unknown action is refused
**with the list of real ones**.

---

## The public contact form

`/contact` is a public page; `POST /contact/send` is its endpoint. A
submission becomes a message in this mailbox with `source = 'contact'`, and
the panel shows a chip on it — because the address on a contact-form message
is one a stranger **typed**, not one an SMTP envelope proved, and that is
worth knowing before pressing reply.

Anti-spam, in `Mail/Spam.js`, is five scored signals rather than a CAPTCHA:

| Signal | Weight | Catches |
|---|---|---|
| honeypot filled | 60 | any bot that completes every input it finds |
| submitted in under 3s | 55 | scripted POSTs; no person reads and types that fast |
| a link in the *name* field | 55 | nobody types a URL where their name goes |
| 5+ links in the body | 35 | link farms |
| bulk-mail phrases | up to 45 | the obvious ones only — "SEO" and "backlink" are **not** on the list, because somebody might genuinely ask about them |

Anything at 50 or above is refused. A real message scores 0.

Behind that: a per-address rate limit (`CONFIG.CONTACT.RATE_LIMIT`), size
ceilings on text and files, and attachments validated against **both** their
declared type and their first bytes — a file claiming to be a PNG and
failing to be one is not stored. Stored filenames are ours, never the
sender's.

**The blocklist is enforced here too.** Without that, the contact form would
be the documented way around a block.

---

## Things worth knowing before changing it

- **A received message is rendered inside a sandboxed iframe**, never into
  the panel's own document. It is HTML a stranger sent to this address;
  in the document it could read the session cookie, rewrite the buttons or
  call the panel's API as the operator. The sandbox deliberately omits
  `allow-same-origin` and `allow-scripts`, so the frame has an opaque
  origin and can reach nothing. Do not add either to make a message
  "render properly".

- **The MIME parser is deliberately small** and is honest about its limits
  (`Mail/Inbound.js`, top of file). Attachments are *noted, never stored* —
  the table would otherwise grow with whatever anybody sends. If a real
  message ever parses badly, `raw_excerpt` on the row holds the first 8 KB
  of what actually arrived.

- **Bodies are capped at 256 KB on receive and 200 KB on send.** A
  truncated inbound message sets `truncated = 1` and the panel prints a
  banner; an oversized outbound one is *refused with a message* rather than
  silently cut.

- **`email()` must never throw.** A rejection from that handler is a
  delivery failure to Cloudflare, which bounces the message back to the
  person who sent it. A parsing bug on this side must not become a bounce
  on theirs — hence the try/catch in `Worker.js` and another inside
  `handleInboundEmail`.

- **Deleting a folder never deletes mail.** Its messages have their
  `folder_id` cleared and go back to the inbox. "Delete folder" is a button
  somebody will press without reading it.

- **A block is a silent drop, not a bounce.** Rejecting would tell a
  spammer the address is real and tell a wrongly-blocked person their mail
  failed. Every rule carries a hit counter, which is what makes the silence
  auditable.

- **`CONFIG.SUPPORT_EMAIL` is this address now.** It was
  `amircollider@yahoo.com`, which is what a reader noticed first: a site
  selling a product from its own domain, asking to be written to at a free
  webmail account. If step 3 above is ever undone, set it back — the policy
  pages, the footer and every licence email's Reply-To point at it.
