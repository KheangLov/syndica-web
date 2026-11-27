const enc = encodeURIComponent

/** Share targets, Telegram first. `url` must be absolute. */
export const shareTargets = (url, text = '') => [
  { id: 'telegram', label: 'Telegram', icon: 'telegram', color: '#229ED9', href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
  { id: 'x', label: 'X', icon: 'x', color: '#111111', href: `https://x.com/intent/post?url=${enc(url)}&text=${enc(text)}` },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0A66C2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  // Messenger has no web share URL without a Facebook app ID; this deep link opens the Messenger app on phones.
  { id: 'messenger', label: 'Messenger', icon: 'messenger', color: '#0084FF', href: `fb-messenger://share/?link=${enc(url)}`, mobileOnly: true },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', color: '#25D366', href: `https://wa.me/?text=${enc(text ? `${text} ${url}` : url)}` },
]

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text })
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.append(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export const canNativeShare = () => typeof navigator !== 'undefined' && !!navigator.share
