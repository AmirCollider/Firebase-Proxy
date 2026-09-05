# The mailbox — `/mail`

A third operator panel, beside `/thegod` and `/testsite`, holding one
mailbox: **amircollider@amircollider.com**. It sends HTML email as that
address, receives mail delivered to it, and shows what the checkout has
been sending.

Three things have to be true before it works, and only the first is code.

---

## 1. Run the migration

Belongs to **`LICENSE_DB`** (`amircollider-licenses`). Running it against a
game's own database succeeds and does nothing useful — see CLAUDE.md §12
for how often that has happened.

```bash
npx wrangler d1 execute amircollider-licenses --remote \
  --file=./migrations/0013_mail_panel.sql
```

It creates one table, `mail_messages`, and four indexes. Until it exists the
panel opens, says exactly this command, and refuses every other action —
`/mail/api {"action":"status"}` reports `tableReady: false`.

`mail_outbox` is **not** touched. The panel reads it (that is the
"System mail" box) and never writes there: the cron owns those rows, and a
panel that could edit a queue the cron is walking could re-send somebody's
licence key.

---

## 2. Set the password

```bash
npx wrangler secret put MailPassword
```

It does **not** fall back to `TestSitePassword` or `TheGodPassword`, unlike
`/thegod`, which falls back so a half-configured deployment cannot lock its
operator out of the tool that fixes it. `/mail` is not that tool, and what
is behind it is correspondence plus the ability to send mail as the domain.
With no `MailPassword` set, the login form is disabled and says so.

The session cookie is `amir_mail_auth`, `Path=/mail`, HttpOnly, Secure,
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
refresh `/mail`. If nothing arrives, the Worker's logs
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
| `Pages/MailPanel.js` | `/mail`, its login, the UI, the compose editor |
| `Api/MailApi.js` | `POST /mail/api` — one endpoint, an `action` field |
| `Mail/Store.js` | every `LICENSE_DB` query the panel makes |
| `Mail/Inbound.js` | the MIME parser and the `email()` handler's body |
| `migrations/0013_mail_panel.sql` | `mail_messages` |
| `CONFIG.MAIL` in `Config.js` | the address, the session length, the limits |

### Actions on `POST /mail/api`

`status`, `list`, `get`, `send`, `read`, `readAll`, `star`, `archive`,
`delete`, `system`, `systemGet`. An unknown action is refused **with the
list of real ones**.

---

## Things worth knowing before changing it

- **A received message is rendered inside a sandboxed iframe**, never into
  the panel's own document. It is HTML a stranger sent to this address;
  in the document it could read the session cookie, rewrite the buttons or
  call `/mail/api` as the operator. The sandbox deliberately omits
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

- **`CONFIG.SUPPORT_EMAIL` is this address now.** It was
  `amircollider@yahoo.com`, which is what a reader noticed first: a site
  selling a product from its own domain, asking to be written to at a free
  webmail account. If step 3 above is ever undone, set it back — the policy
  pages, the footer and every licence email's Reply-To point at it.
