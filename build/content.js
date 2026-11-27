import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readingTime } from '../src/lib/inline.js'

export function loadContent(publicDir) {
  const dir = path.join(publicDir, 'content')
  const siteRaw = fs.readFileSync(path.join(dir, 'site.json'), 'utf8')
  const site = JSON.parse(siteRaw)
  // Public origin of syndica-link (the SSR share front). Env wins so CI can set it without a commit.
  site.shareBaseUrl = (process.env.SHARE_BASE_URL || site.shareBaseUrl || '').replace(/\/+$/, '')
  const postsDir = path.join(dir, 'posts')
  const posts = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => {
      const file = path.join(postsDir, f)
      let post
      const raw = fs.readFileSync(file, 'utf8')
      try {
        post = JSON.parse(raw)
      } catch (e) {
        throw new Error(`[syndica] Invalid JSON in ${f}: ${e.message}`)
      }
      const slug = path.basename(f, '.json')
      if (post.slug && post.slug !== slug)
        console.warn(`[syndica] ${f}: "slug" (${post.slug}) differs from file name, using "${slug}"`)
      for (const k of ['title', 'description', 'date'])
        if (!post[k]) throw new Error(`[syndica] ${f} is missing "${k}"`)
      return {
        ...post,
        slug,
        tags: post.tags || [],
        blocks: post.blocks || [],
        accent: post.accent || site.accent,
        readingTime: readingTime(post.blocks),
        version: createHash('sha1').update(raw + siteRaw).digest('hex').slice(0, 10), // changes with the content
        image: post.cover || `/og/${slug}.jpg`,
        imageAlt: post.cover ? post.coverAlt || post.title : `${post.title} — ${site.name}`,
        generatedImage: !post.cover,
      }
    })
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
  return { site, posts }
}

export const summarize = ({ blocks, ...rest }) => rest

// Read width/height from PNG or JPEG headers (for og:image:width/height).
export function imageSize(file) {
  try {
    const b = fs.readFileSync(file)
    if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), type: 'image/png' }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2
      while (i < b.length) {
        const marker = b[i + 1]
        const len = b.readUInt16BE(i + 2)
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
          return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), type: 'image/jpeg' }
        i += 2 + len
      }
    }
  } catch {}
  return null
}
