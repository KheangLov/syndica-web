import { createApp } from 'vue'
import { createSquirkle, useTheme } from 'squirkle-ui'
import '@fontsource-variable/geist'
import '@fontsource/noto-sans-khmer/400.css'
import '@fontsource/noto-sans-khmer/700.css'
import 'squirkle-ui/styles.css'
import './styles.css'
import App from './App.vue'
import router from './router.js'

const stored = (() => {
  try { return localStorage.getItem('syndica-theme') } catch { return null }
})()
const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches

const app = createApp(App)
app.use(router)
app.use(
  createSquirkle({
    theme: { defaultTheme: stored || (prefersDark ? 'dark' : 'light') },
    appearance: { font: "'Geist Variable', system-ui, sans-serif", radiusScale: 1.1, smoothing: 0.7 },
    icons: { api: false }, // all icons are inline SVG paths — no network
  }),
)

// Telegram blue as the brand colour (squirkle derives accessible light/dark shades).
useTheme().setBrand('#229ED9')

app.mount('#app')
