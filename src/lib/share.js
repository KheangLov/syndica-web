const enc = encodeURIComponent

/** Share targets, Telegram first. `url` must be absolute. */
const FB_APP_ID = import.meta.env.VITE_FB_APP_ID || ''

export const shareTargets = (url, text = '', withText = text ? `${text} ${url}` : url) => [
  { id: 'telegram', label: 'Telegram', icon: 'telegram', color: '#229ED9', href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
  { id: 'x', label: 'X', icon: 'x', color: '#111111', href: `https://x.com/intent/post?url=${enc(url)}&text=${enc(text)}` },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0A66C2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  // Messenger: the app's deep link on phones; on computers the Send dialog, which needs a Facebook app ID.
  { id: 'messenger', label: 'Messenger', icon: 'messenger', color: '#0084FF', href: `fb-messenger://share/?link=${enc(url)}`, mobileOnly: true },
  ...(FB_APP_ID ? [{ id: 'messenger-web', label: 'Messenger', icon: 'messenger', color: '#0084FF', desktopOnly: true,
    href: `https://www.facebook.com/dialog/send?app_id=${FB_APP_ID}&link=${enc(url)}&redirect_uri=${enc(url)}` }] : []),
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', color: '#25D366', href: `https://wa.me/?text=${enc(withText)}` },
  // Behind "More apps"
  { id: 'line', label: 'LINE', more: true, href: `https://social-plugins.line.me/lineit/share?url=${enc(url)}` },
  { id: 'viber', label: 'Viber', more: true, mobileOnly: true, href: `viber://forward?text=${enc(withText)}` },
  { id: 'sms', label: 'Messages', more: true, mobileOnly: true, href: `sms:?&body=${enc(withText)}` },
  { id: 'threads', label: 'Threads', more: true, href: `https://www.threads.net/intent/post?text=${enc(withText)}` },
  { id: 'bluesky', label: 'Bluesky', more: true, href: `https://bsky.app/intent/compose?text=${enc(withText)}` },
  { id: 'reddit', label: 'Reddit', more: true, href: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text)}` },
  { id: 'email', label: 'Email', more: true, href: `mailto:?subject=${enc(text)}&body=${enc(withText)}` },
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
