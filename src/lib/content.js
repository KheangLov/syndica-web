// Runtime content loader — everything comes from JSON files under /content.
import { reactive } from 'vue'

const BASE = import.meta.env.BASE_URL
const cache = new Map()

/** Resolve a site-relative path ("/images/x.png") against the deploy base. */
export const asset = (p = '') => (/^(https?:|data:)/.test(p) ? p : BASE + String(p).replace(/^\//, ''))

/** Public URL of a page; uses the real origin so shared links work anywhere. */
export const pageUrl = (p = '') => new URL(asset(p), location.origin).href

async function getJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(asset(path)).then((r) => {
        if (!r.ok) throw Object.assign(new Error(`${r.status} ${path}`), { status: r.status })
        return r.json()
      }).catch((e) => { cache.delete(path); throw e }),
    )
  }
  return cache.get(path)
}

export const getSite = () => getJson('content/site.json')
export const getPosts = () => getJson('content/posts.json').then((d) => d.posts)

/**
 * The link to share for a post. When syndica-link is configured, share its server-rendered
 * page with a content version (?v=) — an edited post gets a new URL, so Telegram always
 * fetches a fresh preview instead of showing its cached one.
 */
export async function shareUrlFor(post) {
  const { shareBaseUrl } = await getJson('content/posts.json')
  return shareBaseUrl ? `${shareBaseUrl}/posts/${post.slug}?v=${post.version}` : pageUrl(`posts/${post.slug}/`)
}

/** Full post (with blocks), merged with the computed fields from the index. */
export async function getPost(slug) {
  const [posts, post] = await Promise.all([getPosts(), getJson(`content/posts/${slug}.json`)])
  const summary = posts.find((p) => p.slug === slug)
  if (!summary) throw Object.assign(new Error('Not found'), { status: 404 })
  return { ...post, ...summary, blocks: post.blocks || [] }
}

export const formatDate = (d, lang = 'en') =>
  new Date(d + 'T00:00:00Z').toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })

/** Small composable-ish state holder for async loads. */
export function useAsync(fn) {
  const state = reactive({ data: null, error: null, loading: true })
  state.run = async (...args) => {
    state.loading = true
    state.error = null
    try { state.data = await fn(...args) } catch (e) { state.error = e; state.data = null } finally { state.loading = false }
  }
  return state
}

/** Keep the tab title in sync while navigating (bots read the prerendered HTML instead). */
export function setTitle(title, siteName = 'Syndica') {
  document.title = title ? `${title} · ${siteName}` : siteName
}
