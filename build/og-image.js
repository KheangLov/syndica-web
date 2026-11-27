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

function titleSize(title) {
  const n = [...title].length
  return n > 90 ? 50 : n > 60 ? 58 : n > 36 ? 68 : 80
}

/**
 * Draws a 1200×630 preview card.
 * @param {{ title: string, eyebrow?: string, tags?: string[], accent?: string, site: string, domain: string, footer?: string }} o
 */
export async function renderOgImage(o) {
  const accent = o.accent || '#2AABEE'
  const tree = h(
    'div',
    {
      width: 1200 - 144, height: 630 - 128, flexDirection: 'column', justifyContent: 'space-between',
      padding: '64px 72px', // satori adds padding to width/height
      background: '#0B1220', color: '#F8FAFC',
      fontFamily: 'Inter, Noto Sans Khmer', position: 'relative', overflow: 'hidden',
    },
    // glow blobs
    h('div', { position: 'absolute', top: -260, right: -180, width: 760, height: 760, borderRadius: 9999, background: accent, opacity: 0.38, filter: 'blur(110px)' }),
    h('div', { position: 'absolute', bottom: -320, left: -200, width: 640, height: 640, borderRadius: 9999, background: '#7C5CFF', opacity: 0.22, filter: 'blur(120px)' }),
    // header
    h('div', { alignItems: 'center', gap: 18 },
      h('div', { width: 56, height: 56, borderRadius: 18, background: accent, alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff' }, o.site.slice(0, 1)),
      h('div', { fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }, o.site),
      o.eyebrow ? h('div', { marginLeft: 8, fontSize: 24, color: '#94A3B8' }, `·  ${o.eyebrow}`) : null,
    ),
    // title
    h('div', {
      fontSize: titleSize(o.title), fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5,
      maxWidth: 1040, lineClamp: 4, display: 'block', overflow: 'hidden', flexShrink: 0,
    }, o.title),
    // footer
    h('div', { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { gap: 12 },
        ...(o.tags || []).slice(0, 3).map((t) =>
          h('div', { padding: '10px 22px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', fontSize: 24, color: '#E2E8F0' }, `#${t}`),
        ),
      ),
      h('div', { fontSize: 24, color: '#94A3B8' }, o.footer || o.domain),
    ),
  )

  const svg = await satori(tree, { width: 1200, height: 630, fonts: loadFonts() })
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, background: '#0B1220' }).render()
  // JPEG keeps the card small — WhatsApp silently drops large preview images.
  return jpeg.encode({ data: img.pixels, width: img.width, height: img.height }, 86).data
}
