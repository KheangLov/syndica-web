import fs from 'node:fs'
import { createRequire } from 'node:module'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import jpeg from 'jpeg-js'

const require = createRequire(import.meta.url)
const font = (pkg, file) => fs.readFileSync(require.resolve(`${pkg}/files/${file}`))

let fonts
function loadFonts() {
  fonts ??= [
    { name: 'Inter', data: font('@fontsource/inter', 'inter-latin-400-normal.woff'), weight: 400 },
    { name: 'Inter', data: font('@fontsource/inter', 'inter-latin-700-normal.woff'), weight: 700 },
    { name: 'Inter', data: font('@fontsource/inter', 'inter-latin-800-normal.woff'), weight: 800 },
    { name: 'Noto Sans Khmer', data: font('@fontsource/noto-sans-khmer', 'noto-sans-khmer-khmer-400-normal.woff'), weight: 400 },
    { name: 'Noto Sans Khmer', data: font('@fontsource/noto-sans-khmer', 'noto-sans-khmer-khmer-700-normal.woff'), weight: 700 },
  ]
  return fonts
}

const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter((c) => c != null && c !== false) } })

// Scripts like Khmer have no spaces between words, so the renderer can't wrap them.
// Insert zero-width spaces at word boundaries (ICU dictionary segmentation).
const segmenter = new Intl.Segmenter('km', { granularity: 'word' })
const wrappable = (t) => {
  if (!/[\u1780-\u17FF]/.test(t)) return t
  // Join words with zero-width spaces, but keep punctuation (៖ ។ etc.) on the word before it.
  return [...segmenter.segment(t)].map((x) => x.segment).reduce((out, seg) => out + (/^[\u17D4-\u17DA\s]/.test(seg) || !out ? '' : '\u200B') + seg, '')
}

/** Bump when the card design changes: it's part of every post version, so share links and image URLs change and caches refresh. */
export const OG_DESIGN = 2

// Sized for the 540 px-wide safe column below.
const titleSize = (t) => { const n = [...t].length * (/[\u1780-\u17FF]/.test(t) ? 0.75 : 1); return n > 85 ? 34 : n > 55 ? 40 : n > 32 ? 46 : n > 18 ? 56 : 66 }

/**
 * 1200×630 preview card with a centred "safe zone": everything important sits in the
 * middle ~600 px, so it reads the same when shown wide (Telegram, LinkedIn, X) and when
 * Facebook, Messenger or WhatsApp crop it to a square on phones. The sides are decoration.
 */
export async function renderOgImage(o) {
  const accent = o.accent || '#2AABEE'
  const tree = h('div', {
      width: 1200, height: 630, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#F8FAFC', fontFamily: 'Inter, Noto Sans Khmer', position: 'relative',
      // decoration: soft glows in the corners (fine to be cropped away)
      backgroundColor: '#0B1220',
      backgroundImage: `radial-gradient(circle at 0% 0%, ${accent}88 0%, ${accent}00 45%), radial-gradient(circle at 100% 100%, #7C5CFF66 0%, #7C5CFF00 45%)`,
    },
    h('div', { position: 'absolute', top: 0, left: 300, width: 600, height: 630, background: 'rgba(255,255,255,0.025)', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }),
    // safe zone: 540 px column, centred
    h('div', { width: 540, flexDirection: 'column', alignItems: 'center', gap: 30 },
      h('div', { alignItems: 'center', gap: 14 },
        h('div', { width: 46, height: 46, borderRadius: 15, background: accent, alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff' }, o.site.slice(0, 1)),
        h('div', { fontSize: 26, fontWeight: 700, letterSpacing: -0.4 }, o.site),
        o.eyebrow ? h('div', { fontSize: 22, color: '#94A3B8' }, `· ${o.eyebrow}`) : null,
      ),
      h('div', { fontSize: titleSize(o.title), fontWeight: 800, lineHeight: 1.18, letterSpacing: -1, textAlign: 'center', justifyContent: 'center', width: 540, lineClamp: 4, display: 'block', overflow: 'hidden' }, wrappable(o.title)),
      (o.tags || []).length
        ? h('div', { gap: 10, justifyContent: 'center' }, ...(o.tags || []).slice(0, 2).map((t) =>
            h('div', { padding: '8px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 21, color: '#E2E8F0' }, `#${t}`)))
        : null,
    ),
    h('div', { position: 'absolute', bottom: 30, left: 300, width: 600, justifyContent: 'center', fontSize: 19, color: '#7C8BA1' }, o.domain),
  )
  const svg = await satori(tree, { width: 1200, height: 630, fonts: loadFonts() })
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, background: '#0B1220' }).render()
  // JPEG keeps the card small — WhatsApp silently drops large preview images.
  return jpeg.encode({ data: img.pixels, width: img.width, height: img.height }, 86).data
}
