// Copied from syndica-link/server/utils/og-photo.ts — keep the two in step.
// Turn ANY image (a post cover or a Share-studio custom image) into a share image every app accepts:
// a JPEG of exactly the target size, under ~300 KB (WhatsApp drops images over ~600 KB).
//
//   • close to the target shape        → fills the frame (centre crop)
//   • portrait, square, panorama, tiny → shown whole, on a darkened, enlarged copy of itself
//                                        (photos) or on the post's accent colour (logos, PNG, SVG)
//   • phone photos with EXIF rotation  → turned upright first
//   • transparent PNG / SVG            → accent background instead of black
import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import jpeg from 'jpeg-js'


const MAX_BYTES = 20 * 1024 * 1024

/** `src`: an http(s) URL, or a site path like /images/cover.png read from `publicDir`. */
export async function loadPhoto(src, publicDir) {
  let data
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src, { headers: { 'User-Agent': 'syndica-web build' }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`image ${res.status}`)
    data = Buffer.from(await res.arrayBuffer())
  } else {
    data = fs.readFileSync(path.join(publicDir, src.replace(/^\//, '')))
  }
  if (data.length > MAX_BYTES) throw new Error('image over 20 MB')

  const head = data.subarray(0, 512).toString('utf8').trimStart()
  if (/^(<\?xml|<svg|<!--)/i.test(head) || /<svg[\s>]/i.test(head)) {
    const svg = data.toString('utf8')
    const vb = svg.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
    const w = Number(svg.match(/<svg[^>]*\swidth="([\d.]+)(px)?"/i)?.[1] || vb?.[1] || 1200)
    const h = Number(svg.match(/<svg[^>]*\sheight="([\d.]+)(px)?"/i)?.[1] || vb?.[2] || 630)
    return { data, type: 'image/svg+xml', width: w, height: h }
  }
  const info = imageInfo(data)
  if (!info.type || !info.width || !info.height) throw new Error('not a PNG, JPEG, GIF or SVG image')
  // The renderer can't decode WebP (it would come out blank), so use the drawn card instead.
  if (info.type === 'image/webp') throw new Error('WebP images are not supported; use JPG or PNG')
  let { width, height } = info
  if (info.type === 'image/jpeg') {
    const o = exifOrientation(data)
    if (o === 3 || o === 6 || o === 8) {
      const raw = jpeg.decode(data, { useTArray: true, maxMemoryUsageInMB: 768, maxResolutionInMP: 120 })
      const r = rotate(raw.data, raw.width, raw.height, o)
      data = jpeg.encode({ data: r.data, width: r.width, height: r.height }, 92).data
      width = r.width; height = r.height
    }
  }
  return { data, type: info.type, width, height }
}

/** SVG that places `p` in a W×H frame (see the rules at the top of this file). */
export function photoSvg(p, W, H, accent) {
  const tile = W === H
  const href = `data:${p.type};base64,${p.data.toString('base64')}`
  const r = p.width / p.height
  const R = W / H
  const isPhoto = p.type === 'image/jpeg'
  const tiny = p.width * 3 < W || p.height * 3 < H
  // Fill when the shape is close and the image isn't tiny (≤2× upscaling). Square tiles are small
  // thumbnails, so photos up to 2:1 either way are cropped to fill them.
  const close = Math.abs(Math.log(r / R)) < (tile && isPhoto ? Math.log(2) : 0.25)
  const fill = close && p.width * 2 >= W && p.height * 2 >= H
  const img = (x, y, w, h, par, extra = '') =>
    `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${par}"${extra}/>`
  let body
  if (fill) {
    body = img(0, 0, W, H, 'xMidYMid slice')
  } else {
    const s = Math.min(W / p.width, H / p.height, 2) // never blow small images up more than 2×
    const w = Math.round(p.width * s), h = Math.round(p.height * s)
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2)
    const round = Math.min(24, w / 12, h / 12)
    const bg = isPhoto && !tiny // a blown-up tiny image would be a blurry mess behind it
      ? `${img(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2, 'xMidYMid slice')}<rect width="${W}" height="${H}" fill="#000" opacity="0.55"/>`
      : `<rect width="${W}" height="${H}" fill="url(#g)"/>`
    body = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity="0.75"/></linearGradient>`
      + `<clipPath id="c"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${round}"/></clipPath></defs>`
      + bg + `<g clip-path="url(#c)">${img(x, y, w, h, 'xMidYMid meet')}</g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${accent}"/>${body}</svg>`
}

/** Render an SVG to a JPEG of `outW` px wide, lowering quality until it fits `maxBytes`. */
export function svgToJpeg(svg, outW, background, maxBytes = 300_000) {
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: outW }, background }).render()
  let out = Buffer.alloc(0)
  for (const q of [86, 78, 70, 60, 50, 40]) {
    out = jpeg.encode({ data: img.pixels, width: img.width, height: img.height }, q).data
    if (out.length <= maxBytes) break
  }
  return out
}

export async function renderPhotoCard(src, publicDir, W, H, accent, outW = W) {
  return svgToJpeg(photoSvg(await loadPhoto(src, publicDir), W, H, accent), outW, accent)
}

function exifOrientation(b) {
  for (let i = 2; i + 4 < b.length;) {
    if (b[i] !== 0xff) return 1
    const m = b[i + 1], len = b.readUInt16BE(i + 2)
    if (m === 0xe1 && b.toString('ascii', i + 4, i + 8) === 'Exif') {
      const t = i + 10, le = b.toString('ascii', t, t + 2) === 'II'
      const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o))
      const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o))
      const ifd = t + u32(t + 4)
      for (let n = u16(ifd), e = ifd + 2; n-- > 0 && e + 12 <= b.length; e += 12) if (u16(e) === 0x0112) return u16(e + 8)
      return 1
    }
    if (m === 0xda) return 1
    i += 2 + len
  }
  return 1
}

function rotate(src, w, h, o) {
  const W = o === 3 ? w : h, H = o === 3 ? h : w
  const out = new Uint8Array(W * H * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [nx, ny] = o === 3 ? [w - 1 - x, h - 1 - y] : o === 6 ? [h - 1 - y, x] : [y, w - 1 - x]
    out.set(src.subarray((y * w + x) * 4, (y * w + x) * 4 + 4), (ny * W + nx) * 4)
  }
  return { data: out, width: W, height: H }
}

/** Width/height/type from the first bytes of a PNG, JPEG, GIF or WebP. */
function imageInfo(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), type: 'image/png' }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      const m = b[i + 1], len = b.readUInt16BE(i + 2)
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), type: 'image/jpeg' }
      i += 2 + len
    }
    return { type: 'image/jpeg' }
  }
  if (b.toString('ascii', 0, 3) === 'GIF') return { width: b.readUInt16LE(6), height: b.readUInt16LE(8), type: 'image/gif' }
  if (b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16)
    if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3), type: 'image/webp' }
    if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, type: 'image/webp' }
    if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1, type: 'image/webp' } }
  }
  return {}
}

