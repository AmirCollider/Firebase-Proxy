// ==========================================
// Api/AssetApi.js
// GET /assets/<key> - immutable objects from the bound R2 bucket.
// ==========================================

import { createJsonResponse } from '../Core/Http.js'

const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon'
}

/**
 * Percent-decoding that cannot throw. An unescaped '%' anywhere in
 * an asset path used to raise a URIError before any validation ran,
 * which turned a malformed URL into a 500 rather than the 400 it
 * plainly is.
 */
function decodeKey(raw) {
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

/**
 * Whether a decoded key is one this route will fetch.
 *
 * This used to be `key.includes('/')` - one flat level, nothing
 * nested - and that single condition is why an attached photo
 * never appeared anywhere on this site. Both writers of image
 * objects store them under a dated prefix, which is the sane
 * layout for anything a sweep has to expire:
 *
 *   contact/2026-09-06/<uuid>.png   the public contact form
 *   mail/2026-09-06/<uuid>.png      inbound mail and the panel
 *
 * Every one of those has a slash in it, so every request for one
 * was answered 400 invalid_asset. The message in the mailbox said
 * "1 attachment" and showed a broken image, and the picture it was
 * pointing at was sitting in the bucket the whole time.
 *
 * What the check is actually FOR is path traversal, and that is
 * what it does now: no empty segments, no '.' or '..' segment, no
 * leading slash, no backslash (which some stores treat as a
 * separator), and a bounded depth. A slash between two ordinary
 * segments was never the danger - '..' was.
 */
function safeKey(key) {
  if (!key || key.length > 512) return false
  if (key.startsWith('/') || key.includes('\\')) return false

  const segments = key.split('/')
  if (segments.length > 8) return false

  return segments.every(segment =>
    segment.length > 0 && segment !== '.' && segment !== '..')
}


export async function handleAsset(url, request, gameId, requestId, GAMES, env) {
  const key = decodeKey(url.pathname.replace('/assets/', ''))
  if (!safeKey(key)) {
    return createJsonResponse({ error: 'invalid_asset', message: 'Invalid asset path', requestId }, 400)
  }

  const bucket = env.ASSETS
  if (!bucket) {
    return createJsonResponse({ error: 'r2_not_bound', message: 'R2 binding "ASSETS" not found', requestId }, 500)
  }

  const object = await bucket.get(key)
  if (!object) {
    return createJsonResponse({ error: 'asset_not_found', message: `Asset "${key}" not found`, requestId }, 404)
  }

  const extension = key.split('.').pop().toLowerCase()
  const contentType = object.httpMetadata?.contentType || CONTENT_TYPES[extension] || 'application/octet-stream'

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': object.httpEtag
    }
  })
}
