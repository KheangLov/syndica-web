// Vite plugin: makes a JSON-driven SPA shareable.
//
// Social bots (Telegram, X, Facebook, LinkedIn…) don't run JavaScript, so for every
// route we write a static HTML file whose <head> already carries the right
// Open Graph / Twitter tags, and we draw a 1200×630 preview image for posts
// without a cover. The app itself still loads post content from JSON at runtime.

import fs from 'node:fs'
import path from 'node:path'
import { loadContent, summarize, imageSize } from './content.js'
import { renderOgImage } from './og-image.js'
import { escapeHtml as esc, inline } from '../src/lib/inline.js'

const HEAD = '<!--social:head-->'
const BODY = '<!--social:body-->'

const fmtDate = (d) =>
  new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export default function social() {
  let cfg, base, siteUrl, publicDir, outDir, isDev
  const imageCache = new Map()

  const abs = (p = '') => (/^https?:\/\//.test(p) ? p : siteUrl + '/' + String(p).replace(/^\//, ''))
  const content = () => loadContent(publicDir)

  // ---------- <head> tags ----------
  function headFor(route, { site, posts }) {
    const post = route.post
    const title = post ? `${post.title} · ${site.name}` : route.title ? `${route.title} · ${site.name}` : `${site.name} — ${site.tagline}`
    const ogTitle = post ? post.title : route.title || site.name
    const description = post ? post.description : route.description || site.description
    // With syndica-link configured, it is the canonical home of each post (one URL for SEO and shares).
    const url = post && site.shareBaseUrl ? `${site.shareBaseUrl}/posts/${post.slug}` : abs(route.path)
    const image = post ? post.image : site.defaultImage
    const imageAlt = post ? post.imageAlt : `${site.name} — ${site.tagline}`
    const size = post && !post.generatedImage ? imageSize(path.join(publicDir, post.image)) : { width: 1200, height: 630, type: 'image/png' }

    const m = (attr, key, val) => (val ? `<meta ${attr}="${key}" content="${esc(val)}">` : '')
    const tags = [
      `<title>${esc(title)}</title>`,
      m('name', 'description', description),
      `<link rel="canonical" href="${esc(url)}">`,
      route.noindex ? m('name', 'robots', 'noindex') : '',
      m('property', 'og:site_name', site.name),
      m('property', 'og:type', post ? 'article' : 'website'),
      m('property', 'og:locale', post?.lang === 'km' ? 'km_KH' : site.locale),
      m('property', 'og:title', ogTitle),
      m('property', 'og:description', description),
      m('property', 'og:url', url),
      m('property', 'og:image', abs(image)),
      m('property', 'og:image:secure_url', abs(image).replace(/^http:/, 'https:')),
      size && m('property', 'og:image:type', size.type),
      size && m('property', 'og:image:width', String(size.width)),
      size && m('property', 'og:image:height', String(size.height)),
      m('property', 'og:image:alt', imageAlt),
      post && m('property', 'article:published_time', post.date),
      post && m('property', 'article:modified_time', post.updated || post.date),
      post && m('property', 'article:author', post.author || site.author?.name),
      ...(post?.tags || []).map((t) => m('property', 'article:tag', t)),
      m('name', 'twitter:card', 'summary_large_image'),
      m('name', 'twitter:site', site.twitter),
      m('name', 'twitter:title', ogTitle),
      m('name', 'twitter:description', description),
      m('name', 'twitter:image', abs(image)),
      m('name', 'twitter:image:alt', imageAlt),
      m('name', 'telegram:channel', site.telegramChannel),
      `<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="${esc(abs('feed.xml'))}">`,
      post &&
        `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.description,
          image: abs(image),
          datePublished: post.date,
          dateModified: post.updated || post.date,
          author: { '@type': 'Person', name: post.author || site.author?.name },
          mainEntityOfPage: url,
          inLanguage: post.lang || 'en',
        }).replace(/</g, '\\u003c')}</script>`,
    ]
    return tags.filter(Boolean).join('\n    ')
  }

  // Readable fallback for no-JS clients and crawlers.
  function bodyFor(route, { site, posts }) {
    const post = route.post
    if (post) {
      const blocks = post.blocks
        .map((b) => {
          switch (b.type) {
            case 'h2': case 'h3': return `<${b.type}>${inline(b.text)}</${b.type}>`
            case 'list': { const t = b.ordered ? 'ol' : 'ul'; return `<${t}>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${t}>` }
            case 'quote': return `<blockquote>${inline(b.text)}</blockquote>`
            case 'code': return `<pre><code>${esc(b.code)}</code></pre>`
            case 'callout': return `<p><strong>${esc(b.title || '')}</strong> ${inline(b.text)}</p>`
            case 'image': return `<img src="${esc(base + b.src.replace(/^\//, ''))}" alt="${esc(b.alt || '')}">`
            case 'divider': return '<hr>'
            default: return `<p>${inline(b.text)}</p>`
          }
        })
        .join('')
      return `<noscript><article><h1>${esc(post.title)}</h1><p>${esc(post.description)}</p>${blocks}</article></noscript>`
    }
    const list = posts.map((p) => `<li><a href="${esc(base)}posts/${p.slug}/">${esc(p.title)}</a> — ${esc(p.description)}</li>`).join('')
    return `<noscript><h1>${esc(site.name)}</h1><p>${esc(site.description)}</p><ul>${list}</ul></noscript>`
  }

  function render(html, route, data) {
    const lang = route.post?.lang || 'en'
    return html
      .replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
      .replace(HEAD, headFor(route, data))
      .replace(BODY, bodyFor(route, data))
  }

  function routeFor(url, data) {
    const p = decodeURI(url.split(/[?#]/)[0]).replace(base, '/').replace(/\/+$/, '') || '/'
    const m = p.match(/^\/posts\/([^/]+)$/)
    if (m) {
      const post = data.posts.find((x) => x.slug === m[1])
      if (post) return { path: `posts/${post.slug}/`, post }
      return { path: '404.html', title: 'Not found', noindex: true }
    }
    if (p === '/share') return { path: 'share/', title: 'Share lab', description: 'See exactly what Telegram and other apps read when this blog is shared.' }
    return { path: '', home: true }
  }

  async function ogImage(name, data) {
    const { site, posts } = data
    const domain = new URL(siteUrl).host
    if (name === 'default') return renderOgImage({ title: site.tagline, site: site.name, domain, accent: site.accent, tags: [] })
    const post = posts.find((p) => p.slug === name)
    if (!post) return null
    return renderOgImage({ title: post.title, eyebrow: fmtDate(post.date), tags: post.tags, accent: post.accent, site: site.name, domain })
  }

  function feed({ site, posts }) {
    const items = posts
      .map((p) => `<item><title>${esc(p.title)}</title><link>${esc(abs(`posts/${p.slug}/`))}</link><guid>${esc(abs(`posts/${p.slug}/`))}</guid><pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description>${p.tags.map((t) => `<category>${esc(t)}</category>`).join('')}<enclosure url="${esc(abs(p.image))}" type="image/png" length="0"/></item>`)
      .join('')
    return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.name)}</title><link>${esc(abs(''))}</link><description>${esc(site.description)}</description>${items}</channel></rss>`
  }

  const sitemap = ({ posts }) =>
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(abs(''))}</loc></url>${posts.map((p) => `<url><loc>${esc(abs(`posts/${p.slug}/`))}</loc><lastmod>${p.updated || p.date}</lastmod></url>`).join('')}</urlset>`

  const indexJson = ({ site, posts }) => JSON.stringify({ generatedAt: new Date().toISOString(), shareBaseUrl: site.shareBaseUrl || '', posts: posts.map(summarize) })

  return {
    name: 'syndica-social',

    configResolved(c) {
      cfg = c
      base = c.base
      isDev = c.command === 'serve'
      publicDir = c.publicDir
      outDir = path.resolve(c.root, c.build.outDir)
      const fallback = isDev ? `http://localhost:${c.server.port || 5173}${base}` : `http://localhost:4173${base}`
      siteUrl = (process.env.SITE_URL || fallback).replace(/\/+$/, '')
      if (!isDev && !process.env.SITE_URL)
        c.logger.warn('[syndica] SITE_URL is not set — og:url and og:image will point at localhost. Set SITE_URL for real share tests.')
    },

    configureServer(server) {
      server.watcher.add(path.join(publicDir, 'content'))
      server.watcher.on('change', (f) => {
        if (f.includes(`${path.sep}content${path.sep}`)) {
          imageCache.clear()
          server.ws.send({ type: 'full-reload' })
        }
      })
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0]
        if (!url.startsWith(base)) return next()
        const rel = url.slice(base.length)
        try {
          if (rel === 'content/posts.json') {
            res.setHeader('Content-Type', 'application/json')
            return res.end(indexJson(content()))
          }
          if (rel === 'feed.xml') { res.setHeader('Content-Type', 'application/rss+xml'); return res.end(feed(content())) }
          if (rel === 'sitemap.xml') { res.setHeader('Content-Type', 'application/xml'); return res.end(sitemap(content())) }
          const og = rel.match(/^og\/([^/]+)\.png$/)
          if (og) {
            const png = imageCache.get(og[1]) ?? (await ogImage(og[1], content()))
            if (!png) return next()
            imageCache.set(og[1], png)
            res.setHeader('Content-Type', 'image/png')
            return res.end(png)
          }
        } catch (e) {
          server.config.logger.error(e.message)
          res.statusCode = 500
          return res.end(e.message)
        }
        next()
      })
    },

    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!isDev) return html // build: per-route files are written in closeBundle
        return render(html, routeFor(ctx.originalUrl || '/', content()), content())
      },
    },

    async closeBundle() {
      if (isDev) return
      const data = content()
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')
      const write = (rel, body) => {
        const file = path.join(outDir, rel)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, body)
      }

      write('index.html', render(template, { path: '', home: true }, data))
      write('share/index.html', render(template, routeFor(base + 'share', data), data))
      write('404.html', render(template, { path: '404.html', title: 'Not found', noindex: true }, data))
      for (const post of data.posts) write(`posts/${post.slug}/index.html`, render(template, { path: `posts/${post.slug}/`, post }, data))

      write('content/posts.json', indexJson(data))
      write('feed.xml', feed(data))
      write('sitemap.xml', sitemap(data))
      write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${abs('sitemap.xml')}\n`)
      write('og/default.png', await ogImage('default', data))
      for (const post of data.posts) write(`og/${post.slug}.png`, await ogImage(post.slug, data))

      cfg.logger.info(`\n[syndica] prerendered ${data.posts.length} posts + share images for ${siteUrl}`)
    },
  }
}
