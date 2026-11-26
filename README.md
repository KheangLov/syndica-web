# Syndica

A small Vue 3 blog for testing how links look when they're shared on **Telegram**, X, Facebook, LinkedIn and WhatsApp. It's built with [squirkle-ui](https://www.npmjs.com/package/squirkle-ui).

- **Posts are JSON files.** The app loads them in the browser at runtime. There's no CMS and no database.
- **Previews work without JavaScript.** Telegram's preview bot doesn't run JS, so the build writes a static `index.html` for every post with its Open Graph and Twitter tags already in place.
- **Preview images are generated.** Any post without a `cover` gets a 1200×630 PNG drawn from its title, tags and accent colour. Khmer and other non-Latin scripts are supported.
- **Share lab** (`/share`) fetches a page's raw HTML, which is exactly what Telegram receives. It shows a mock of the Telegram chat preview, runs a checklist (title and description length, image size, absolute URLs, localhost leaks…) and links to `@WebpageBot` so you can refresh Telegram's cache.
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

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`. Before the first deploy, go to **Settings → Pages → Source** and choose **GitHub Actions**. The workflow sets `SITE_URL` and `BASE_PATH` itself, so it keeps working if you add a custom domain.

For any other host, build with the public URL:

```bash
SITE_URL=https://blog.example.com BASE_PATH=/ npm run build
```

Without `SITE_URL`, the tags point at localhost and Telegram can't fetch them. The Share lab flags this.

## Testing on Telegram

1. Open a post and tap **Share on Telegram**, or paste its URL into any chat.
2. If you've changed something, send the URL to [@WebpageBot](https://t.me/WebpageBot) to refresh Telegram's cache. You can also use **Copy cache-busted URL** in the Share lab, which adds `?v=…`.
