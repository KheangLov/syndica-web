// Reads the *raw* HTML of a page — exactly what Telegram's bot receives — and checks its tags.
import { asset } from './content.js'

export async function fetchMeta(path) {
  const res = await fetch(asset(path), { headers: { Accept: 'text/html' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tags = [...doc.head.querySelectorAll('meta[property], meta[name]')]
    .map((m) => ({ key: m.getAttribute('property') || m.getAttribute('name'), value: m.getAttribute('content') || '' }))
    .filter((t) => /^(og:|twitter:|article:|description$|telegram:|robots$)/.test(t.key))
  const get = (k) => tags.find((t) => t.key === k)?.value || ''
  return {
    tags,
    rawTitle: doc.title,
    canonical: doc.querySelector('link[rel=canonical]')?.href || '',
    bytes: html.length,
    siteName: get('og:site_name'),
    title: get('og:title') || get('twitter:title') || doc.title,
    description: get('og:description') || get('twitter:description') || get('description'),
    image: get('og:image') || get('twitter:image'),
    imageWidth: get('og:image:width'),
    imageHeight: get('og:image:height'),
    url: get('og:url') || res.url,
    card: get('twitter:card'),
    type: get('og:type'),
  }
}

export function probeImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ error: true })
    img.src = src
  })
}

const len = (s) => [...(s || '')].length

/** @returns {{ id, label, status: 'pass'|'warn'|'fail', detail }[]} */
export function runChecks(m, probe) {
  const out = []
  const add = (id, label, status, detail) => out.push({ id, label, status, detail })
  const local = (u) => /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u || '')

  add('html', 'Tags are in the raw HTML', m.title ? 'pass' : 'fail',
    m.title ? 'Bots that don’t run JavaScript (like Telegram’s) can read them.' : 'No title found in the HTML response.')

  const tl = len(m.title)
  add('title', 'Title length', !tl ? 'fail' : tl <= 60 ? 'pass' : 'warn', `${tl} characters ${tl > 60 ? '— longer than ~60 may be cut off on X and Facebook' : ''}`)

  const dl = len(m.description)
  add('description', 'Description length', !dl ? 'fail' : dl >= 50 && dl <= 200 ? 'pass' : 'warn',
    dl ? `${dl} characters ${dl > 200 ? '— long; most apps show 2–4 lines' : dl < 50 ? '— short; add a bit more context' : ''}` : 'Missing og:description')

  if (!m.image) add('image', 'Preview image', 'fail', 'Missing og:image — Telegram will show a text-only card.')
  else {
    add('image-abs', 'Image URL is absolute', /^https?:\/\//.test(m.image) ? 'pass' : 'fail', m.image)
    if (probe?.error) add('image-load', 'Image loads', 'fail', 'The image URL returned an error.')
    else if (probe) {
      const ratio = probe.width / probe.height
      const ok = probe.width >= 1200 && Math.abs(ratio - 1.91) < 0.15
      add('image-size', 'Image size', ok ? 'pass' : probe.width >= 600 ? 'warn' : 'fail',
        `${probe.width}×${probe.height}${ok ? '' : ' — 1200×630 (1.91:1) gets the large layout everywhere'}`)
    }
    add('image-dims', 'Image dimensions declared', m.imageWidth && m.imageHeight ? 'pass' : 'warn',
      m.imageWidth ? `og:image:width/height = ${m.imageWidth}×${m.imageHeight}` : 'Helps apps lay out the card before the image downloads.')
  }

  add('site', 'Site name', m.siteName ? 'pass' : 'warn', m.siteName || 'og:site_name is the coloured line at the top of the Telegram card.')
  add('card', 'Large card for X', m.card === 'summary_large_image' ? 'pass' : 'warn', m.card || 'twitter:card missing')
  add('canonical', 'og:url matches canonical', m.canonical && m.canonical === m.url ? 'pass' : 'warn', m.url)
  add('public', 'Reachable by Telegram', local(m.url) || local(m.image) ? 'fail' : m.url.startsWith('https://') ? 'pass' : 'warn',
    local(m.url) || local(m.image) ? 'URLs point at localhost. Build with SITE_URL set to your public address.' : m.url.startsWith('https://') ? 'Public HTTPS URL.' : 'Use HTTPS for reliable previews.')
  return out
}
