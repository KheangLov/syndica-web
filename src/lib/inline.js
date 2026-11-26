// Tiny, safe inline formatter shared by the app and the build-time prerender.
// Supports **bold**, *italic*, `code` and [text](https://link).

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => ESC[c])

const safeHref = (url) => (/^(https?:|mailto:|tg:|\/|#)/i.test(url) ? url : '#')

export function inline(text = '') {
  const codes = []
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c)
    return `\u0000${codes.length - 1}\u0000`
  })
  out = out
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const href = safeHref(url.replace(/&amp;/g, '&'))
      const ext = /^https?:/i.test(href)
      return `<a href="${escapeHtml(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`)
}

export const plain = (text = '') =>
  String(text)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')

export function readingTime(blocks = []) {
  const text = blocks
    .map((b) => [b.text, b.code, b.caption, b.title, ...(b.items || [])].filter(Boolean).join(' '))
    .join(' ')
  const latinWords = (text.match(/[A-Za-z0-9]+/g) || []).length
  const otherChars = text.replace(/[\x00-\x7F\s]/g, '').length // scripts without spaces, e.g. Khmer
  return Math.max(1, Math.round((latinWords + otherChars / 5) / 220))
}
