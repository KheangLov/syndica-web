# Syndica

A small Vue 3 blog for testing how links look when they're shared on **Telegram**, X, Facebook, LinkedIn and WhatsApp. It's built with [squirkle-ui](https://www.npmjs.com/package/squirkle-ui).

- **Posts are JSON files.** The app loads them in the browser at runtime. There's no CMS and no database.
- **Previews work without JavaScript.** Telegram's preview bot doesn't run JS, so the build writes a static `index.html` for every post with its Open Graph and Twitter tags already in place.
- **Preview images are generated.** Any post without a `cover` gets a 1200×630 PNG drawn from its title, tags and accent colour. Khmer and other non-Latin scripts are supported.
- **Share lab** (`/share/<slug>/`) fetches a page's raw HTML, which is exactly what Telegram receives. It shows a mock of the Telegram chat preview, runs a checklist (title and description length, image size, absolute URLs, localhost leaks…) and links to `@WebpageBot` so you can refresh Telegram's cache.
- The build also writes an RSS feed (`feed.xml`), `sitemap.xml`, `robots.txt` and JSON-LD.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 — meta tags and OG images are served live
npm run build      # outputs to dist/
npm run preview
```

## Write a post

Add `public/content/posts/<slug>.json`:

```json
{
  "title": "My first post",
  "description": "One or two sentences for the preview (50–200 chars).",
  "date": "2026-11-26",
  "tags": ["telegram"],
  "cover": "/images/covers/my-cover.png",
  "coverAlt": "What the image shows",
  "accent": "#2AABEE",
  "lang": "en",
  "featured": false,
  "draft": false,
  "blocks": [
    { "type": "p", "text": "Supports **bold**, *italic*, `code` and [links](https://t.me)." },
    { "type": "h2", "text": "A heading" },
    { "type": "list", "ordered": false, "items": ["One", "Two"] },
    { "type": "quote", "text": "A pull quote", "cite": "Someone" },
    { "type": "code", "lang": "js", "code": "console.log('hi')" },
    { "type": "image", "src": "/images/photo.png", "alt": "…", "caption": "…" },
    { "type": "callout", "tone": "info", "title": "Note", "text": "info | success | warning" },
    { "type": "divider" }
  ]
}
```

The file name is the slug. `cover`, `accent`, `lang`, `featured` and `draft` are optional. The post index (`content/posts.json`) is generated for you. Site-wide settings (name, tagline, author, `telegramChannel`) live in `public/content/site.json`.

## Deploy

The site is deployed on **Vercel**: every push to `main` deploys. The build reads Vercel's `VERCEL_PROJECT_PRODUCTION_URL` automatically, so `og:url` and `og:image` are absolute without any setup. `vercel.json` keeps the URLs with trailing slashes.

For a custom domain or another host, set `SITE_URL` (and `BASE_PATH` if the site is served from a sub-path). A GitHub Pages workflow is included for manual runs.

Share buttons point to [syndica-link](https://github.com/KheangLov/syndica-link) through `shareBaseUrl` in `public/content/site.json`, which defaults to `https://syndica-link.vercel.app`. The `SHARE_BASE_URL` environment variable overrides it.

## Testing on Telegram

1. Open a post and tap **Share on Telegram**, or paste its URL into any chat.
2. With `SHARE_BASE_URL` set (see syndica-link), share buttons hand out `/posts/<slug>/<version>` links. The version changes whenever a post changes, so Telegram always fetches a fresh preview. Without it, send the URL to [@WebpageBot](https://t.me/WebpageBot) to refresh Telegram's cache.

## Automatic Telegram refresh

Telegram caches a preview for each exact URL, and that includes caching *no preview* for a link shared before its post existed (a 404). Telegram has no API for refreshing that cache; its only tool is [@WebpageBot](https://t.me/WebpageBot).

`.github/workflows/telegram-refresh.yml` automates it. On every push that adds or edits posts, it:
1. waits until syndica-link and syndica-web both serve the new content,
2. sends those post URLs to @WebpageBot from your Telegram account.

A link that showed no preview earlier gets its card shortly after you publish.

One-time setup:
1. Get an **API ID** and **API hash** at [my.telegram.org](https://my.telegram.org) → *API development tools*.
2. On your own computer, run `TELEGRAM_API_ID=… TELEGRAM_API_HASH=… node scripts/telegram-login.mjs` and log in. It prints a session string. The session gives full access to that account, so a secondary account is a good idea.
3. In **Settings → Secrets and variables → Actions**, add the secrets `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` and `TELEGRAM_SESSION`.
4. Optional: add `LINK_REVALIDATE_SECRET`, the same value as syndica-link's `NUXT_REVALIDATE_SECRET`, so syndica-link reloads immediately instead of within 60 seconds.

Without the secrets, the workflow still runs and just skips the Telegram step. You can also run it by hand from the Actions tab for any slugs. @WebpageBot is a best-effort service: it usually works, but Telegram's bug tracker has reports of it saying "updated" without refetching.
