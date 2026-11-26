<script setup>
// A faithful-ish mock of how Telegram renders a link preview in a chat bubble.
import { computed } from 'vue'

const props = defineProps({
  meta: { type: Object, required: true }, // { siteName, title, description, image, imageWidth, imageHeight, url }
  dark: Boolean,
  message: { type: String, default: '' },
})

// Telegram shows a big photo for wide images and a small thumbnail otherwise.
const large = computed(() => {
  const w = Number(props.meta.imageWidth) || 0
  const h = Number(props.meta.imageHeight) || 0
  return !!props.meta.image && (!w || (w >= 600 && w / (h || 1) >= 1.2))
})
const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="tg" :class="{ 'tg--dark': dark }">
    <div class="tg__bubble">
      <div class="tg__text">
        <span v-if="message">{{ message }} </span>
        <a :href="meta.url" target="_blank" rel="noopener">{{ meta.url }}</a>
      </div>
      <div class="tg__preview">
        <div class="tg__preview-body">
          <div class="tg__site">{{ meta.siteName || new URL(meta.url).host }}</div>
          <div v-if="meta.title" class="tg__title">{{ meta.title }}</div>
          <div v-if="meta.description" class="tg__desc">{{ meta.description }}</div>
          <img v-if="meta.image && large" :src="meta.image" alt="" class="tg__image" loading="lazy">
        </div>
        <img v-if="meta.image && !large" :src="meta.image" alt="" class="tg__thumb" loading="lazy">
      </div>
      <div class="tg__time">{{ time }} <span class="tg__ticks">✓✓</span></div>
    </div>
  </div>
</template>

<style scoped>
.tg {
  --bg: #c7d9b8; --bubble: #effdde; --text: #000; --link: #168acd; --accent: #4fae4e; --muted: #5fa656;
  padding: 18px 14px; border-radius: var(--sq-radius-lg); corner-shape: squircle;
  background: var(--bg) radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 40%), var(--bg);
  display: flex; justify-content: flex-end; font-family: -apple-system, 'Segoe UI', Roboto, 'Noto Sans Khmer', sans-serif;
}
.tg--dark { --bg: #0e1621; --bubble: #2b5278; --text: #fff; --link: #6ab3f3; --accent: #6ab3f3; --muted: #7da8d3; }
.tg__bubble { position: relative; max-width: 380px; width: 100%; background: var(--bubble); color: var(--text); border-radius: 16px 16px 4px 16px; padding: 7px 10px 6px; box-shadow: 0 1px 1px rgba(0,0,0,.12); font-size: 14.5px; line-height: 1.35; }
.tg__text { word-break: break-word; margin-bottom: 6px; }
.tg__text a { color: var(--link); text-decoration: none; }
.tg__preview { display: flex; gap: 8px; border-left: 3px solid var(--accent); padding: 2px 0 2px 8px; border-radius: 2px; background: color-mix(in srgb, var(--accent) 8%, transparent); border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
.tg__preview-body { flex: 1; min-width: 0; padding: 2px 4px 4px 0; }
.tg__site { color: var(--accent); font-weight: 600; font-size: 13.5px; }
.tg__title { font-weight: 600; margin-top: 1px; }
.tg__desc { margin-top: 1px; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.tg__image { display: block; width: 100%; margin-top: 6px; border-radius: 6px; aspect-ratio: 1.905; object-fit: cover; }
.tg__thumb { width: 64px; height: 64px; object-fit: cover; border-radius: 6px; margin: 4px 4px 4px 0; flex: none; }
.tg__time { text-align: right; font-size: 11.5px; color: var(--muted); margin-top: 3px; }
.tg__ticks { letter-spacing: -3px; margin-left: 2px; }
</style>
