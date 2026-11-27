#!/usr/bin/env node
// Refresh Telegram's cached link previews for posts that were added or changed.
//
// Telegram caches a preview per exact URL — including "no preview" for a URL that
// returned 404 before the post existed. Its only refresh mechanism is @WebpageBot,
// so this script (run by CI on every push) waits until the new content is live and
// then sends the post URLs to @WebpageBot from your own Telegram account.
//
// Usage:  node scripts/telegram-refresh.mjs <slug> [slug…]
// Env:    TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION (see scripts/telegram-login.mjs)
//         LINK_URL  (default https://syndica-link.vercel.app)
//         WEB_URL   (default https://syndica-web.vercel.app)
//         LINK_REVALIDATE_SECRET  optional — makes syndica-link reload content immediately
//         FB_APP_ID, FB_APP_SECRET  optional — also make Facebook/Messenger re-scrape the URLs
//         DRY_RUN=1 to print the URLs without contacting Telegram or Facebook

import fs from 'node:fs'

const LINK = (process.env.LINK_URL || 'https://syndica-link.vercel.app').replace(/\/+$/, '')
const WEB = (process.env.WEB_URL || 'https://syndica-web.vercel.app').replace(/\/+$/, '')
const slugs = [...new Set(process.argv.slice(2).filter(Boolean))]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('[telegram-refresh]', ...a)

if (!slugs.length) { log('No added or changed posts — nothing to refresh.'); process.exit(0) }

// Expected title per slug, so we only ping Telegram once the *new* content is being served.
const titles = Object.fromEntries(slugs.map((s) => {
  const f = `public/content/posts/${s}.json`
  return [s, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).title : null]
}))
const live = slugs.filter((s) => titles[s]) // deleted posts can't be refreshed into a preview
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function waitFor(url, title, timeoutMs = 4 * 60_000) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'TelegramBot (like TwitterBot)' }, redirect: 'follow' })
      const html = r.ok ? await r.text() : ''
      if (html.includes(`content="${esc(title)}"`)) return true
    } catch {}
    await sleep(10_000)
  }
  return false
}

// 1. Ask syndica-link to reload content now (if a secret is configured).
if (process.env.LINK_REVALIDATE_SECRET) {
  const r = await fetch(`${LINK}/api/revalidate`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.LINK_REVALIDATE_SECRET}` } }).catch((e) => ({ ok: false, status: e.message }))
  log('syndica-link revalidate:', r.status)
}

// 2. Wait until both sites serve the new content (syndica-web needs its Vercel deploy to finish).
const urls = []
for (const slug of live) {
  const title = titles[slug]
  const targets = [
    [`${LINK}/posts/${slug}`, [`${LINK}/posts/${slug}`, `${LINK}/posts/${slug}/`]],
    [`${WEB}/posts/${slug}/`, [`${WEB}/posts/${slug}/`, `${WEB}/posts/${slug}`]],
  ]
  for (const [probe, variants] of targets) {
    if (await waitFor(probe, title)) urls.push(...variants)
    else log(`timed out waiting for ${probe} — skipping it`)
  }
}
if (!urls.length) { log('Nothing is live yet; no URLs to refresh.'); process.exit(0) }
log(`URLs to refresh (${urls.length}):\n  ${urls.join('\n  ')}`)

// 3. Pre-fetch each share image the way Facebook/Messenger, WhatsApp and Telegram request it,
//    so Vercel's CDN serves them instantly (those apps drop images that load slowly).
const AGENTS = ['facebookexternalhit/1.1', 'WhatsApp/2.24.1.6 A', 'TelegramBot (like TwitterBot)']
for (const slug of live) {
  for (const ua of AGENTS) {
    try {
      const html = await (await fetch(`${LINK}/posts/${slug}`, { headers: { 'User-Agent': ua } })).text()
      const img = html.match(/property="og:image" content="([^"]+)"/)?.[1]
      if (img) { const r = await fetch(img, { headers: { 'User-Agent': ua } }); await r.arrayBuffer(); log(`warmed ${img.split('/og/')[1] || img} (${r.status})`) }
    } catch (e) { log(`warm failed for ${slug}: ${e.message}`) }
  }
}

if (process.env.DRY_RUN) process.exit(0)

// 4. Facebook + Messenger: ask the Graph API to re-scrape each URL (same as "Scrape Again"
//    in the Sharing Debugger). Needs a Facebook app: FB_APP_ID / FB_APP_SECRET.
if (process.env.FB_APP_ID && process.env.FB_APP_SECRET) {
  const token = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`
  for (const url of urls) {
    try {
      const r = await fetch('https://graph.facebook.com/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id: url, scrape: 'true', access_token: token }),
      })
      const j = await r.json()
      log(r.ok ? `Facebook re-scraped ${url} → "${j.title || ''}"${j.image?.[0]?.url ? ' (with image)' : ''}` : `Facebook re-scrape failed for ${url}: ${j.error?.message || r.status}`)
    } catch (e) { log(`Facebook re-scrape failed for ${url}: ${e.message}`) }
  }
} else log('FB_APP_ID / FB_APP_SECRET not set — skipping the Facebook re-scrape.')

const { TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION } = process.env
if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !TELEGRAM_SESSION) {
  log('TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_SESSION not set — skipping the @WebpageBot refresh.')
  process.exit(0)
}

// 5. Send them to @WebpageBot (max 10 links per message).
const { TelegramClient } = await import('telegram')
const { StringSession } = await import('telegram/sessions/index.js')
const client = new TelegramClient(new StringSession(TELEGRAM_SESSION), Number(TELEGRAM_API_ID), TELEGRAM_API_HASH, { connectionRetries: 3 })
client.setLogLevel('error')
await client.connect()
try {
  for (let i = 0; i < urls.length; i += 10) {
    const batch = urls.slice(i, i + 10)
    const sent = await client.sendMessage('WebpageBot', { message: batch.join('\n'), linkPreview: false })
    // @WebpageBot answers with one message per refreshed link (each carrying the new preview).
    let replies = []
    for (let t = 0; t < 8; t++) {
      await sleep(2000)
      replies = (await client.getMessages('WebpageBot', { limit: 20 })).filter((m) => m.id > sent.id && !m.out)
      if (replies.length >= batch.length) break
    }
    const withPreview = replies.filter((m) => m.media?.className === 'MessageMediaWebPage' && m.media.webpage?.className === 'WebPage')
    log(`@WebpageBot replied ${replies.length}× — ${withPreview.length}/${batch.length} with a preview`)
    for (const m of withPreview) log(`  ✓ ${m.media.webpage.url} — "${m.media.webpage.title || ''}"`)
    await sleep(1500)
  }
} finally {
  await client.disconnect()
}
process.exit(0)
