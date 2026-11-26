import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import social from './build/social.js'

// BASE_PATH: sub-path the site is served from (e.g. "/syndica-web/" on GitHub Pages).
// SITE_URL:  public URL including that path — used for og:url / og:image.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [vue(), social()],
})
