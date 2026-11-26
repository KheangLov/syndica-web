<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import TelegramPreview from '../components/TelegramPreview.vue'
import ShareBar from '../components/ShareBar.vue'
import { getPosts, pageUrl, setTitle, shareUrlFor } from '../lib/content.js'
import { fetchMeta, probeImage, runChecks } from '../lib/meta.js'
import { copyText } from '../lib/share.js'
import { icons } from '../lib/icons.js'

const props = defineProps({ slug: { type: String, default: '' } })
const router = useRouter()
const toast = inject('toast', () => {})

const posts = ref([])
const target = ref(props.slug || '')
const meta = ref(null)
const checks = ref([])
const loading = ref(false)
const error = ref(null)
const chatTheme = ref('light')
const message = ref('Check this out 👇')

const options = computed(() => [
  { title: 'Home page', value: '' },
  ...posts.value.map((p) => ({ title: p.title, value: p.slug })),
])
const path = computed(() => (target.value ? `posts/${target.value}/` : ''))
const liveUrl = computed(() => pageUrl(path.value))
const shareLink = ref('')
watch([target, posts], async () => {
  const p = posts.value.find((x) => x.slug === target.value)
  shareLink.value = p ? await shareUrlFor(p).catch(() => '') : ''
}, { immediate: true })
const viaLink = computed(() => shareLink.value && !shareLink.value.startsWith(location.origin))
const score = computed(() => {
  const c = checks.value
  return { pass: c.filter((x) => x.status === 'pass').length, warn: c.filter((x) => x.status === 'warn').length, fail: c.filter((x) => x.status === 'fail').length }
})
const statusIcon = { pass: 'success', warn: 'warning', fail: 'error' }

async function inspect() {
  loading.value = true
  error.value = null
  try {
    const m = await fetchMeta(path.value)
    meta.value = m
    checks.value = runChecks(m, await probeImage(m.image))
  } catch (e) {
    error.value = e.message
    meta.value = null
    checks.value = []
  } finally {
    loading.value = false
  }
}

watch(target, (slug) => {
  router.replace(slug ? `/share/${slug}/` : '/share/')
  inspect()
})

onMounted(async () => {
  setTitle('Share lab')
  posts.value = await getPosts().catch(() => [])
  if (!target.value && posts.value[0]) target.value = posts.value[0].slug
  else inspect()
})

async function copyShare() {
  if (await copyText(viaLink.value ? shareLink.value : liveUrl.value)) toast('Share link copied — paste it in Telegram')
}
</script>

<template>
  <div class="wrap lab">
    <header class="lab__head">
      <span class="eyebrow">Share lab</span>
      <h1>What Telegram will see</h1>
      <p class="muted">This page fetches the raw HTML of a page on this site — the same response Telegram’s bot gets, without running any JavaScript — and checks its preview tags.</p>
    </header>

    <div class="lab__grid">
      <!-- left: controls + checks -->
      <section class="lab__col">
        <SqSheet border rounded="xl" class="panel">
          <SqSelect v-model="target" :items="options" label="Page to test" hide-details searchable />
          <div class="panel__url">
            <SqIcon :icon="icons.link" size="small" class="muted" />
            <a :href="liveUrl" target="_blank" rel="noopener">{{ liveUrl }}</a>
          </div>
          <SqAlert v-if="viaLink" type="info" variant="tonal" class="via">
            Share buttons use the always-fresh syndica-link URL:
            <a :href="shareLink" target="_blank" rel="noopener">{{ shareLink }}</a>
          </SqAlert>
          <ShareBar :url="viaLink ? shareLink : liveUrl" :title="meta?.title || ''" compact />
          <SqDivider />
          <div class="panel__tools">
            <SqBtn variant="tonal" size="small" :prepend-icon="icons.bot" href="https://t.me/WebpageBot" target="_blank" rel="noopener">Refresh via @WebpageBot</SqBtn>
            <SqBtn variant="tonal" size="small" prepend-icon="copy" @click="copyShare">Copy share link</SqBtn>
            <SqBtn variant="text" size="small" prepend-icon="refresh" :loading="loading" @click="inspect">Re-check</SqBtn>
          </div>
        </SqSheet>

        <SqSheet border rounded="xl" class="panel">
          <div class="panel__title">
            <h2 class="section-title">Checklist</h2>
            <div v-if="checks.length" class="score">
              <SqChip size="small" color="success" variant="tonal">{{ score.pass }} pass</SqChip>
              <SqChip v-if="score.warn" size="small" color="warning" variant="tonal">{{ score.warn }} warn</SqChip>
              <SqChip v-if="score.fail" size="small" color="error" variant="tonal">{{ score.fail }} fail</SqChip>
            </div>
          </div>
          <SqProgressLinear v-if="loading" indeterminate />
          <SqAlert v-else-if="error" type="error" :text="error" />
          <ul v-else class="checks">
            <li v-for="c in checks" :key="c.id" class="check" :class="`check--${c.status}`">
              <SqIcon :icon="statusIcon[c.status]" :color="c.status === 'pass' ? 'success' : c.status === 'warn' ? 'warning' : 'error'" size="small" />
              <div>
                <div class="check__label">{{ c.label }}</div>
                <div class="check__detail">{{ c.detail }}</div>
              </div>
            </li>
          </ul>
        </SqSheet>
      </section>

      <!-- right: previews + raw tags -->
      <section class="lab__col">
        <SqSheet border rounded="xl" class="panel">
          <div class="panel__title">
            <h2 class="section-title">Telegram preview</h2>
            <SqTabs v-model="chatTheme" :items="[{ title: 'Light', value: 'light' }, { title: 'Dark', value: 'dark' }]" />
          </div>
          <SqTextField v-model="message" label="Message text" hide-details density="compact" />
          <SqSkeleton v-if="loading && !meta" type="card" />
          <TelegramPreview v-else-if="meta" :meta="meta" :dark="chatTheme === 'dark'" :message="message" />
          <p class="muted note">An approximation — Telegram’s real card can differ slightly between apps and versions.</p>
        </SqSheet>

        <SqSheet v-if="meta" border rounded="xl" class="panel">
          <h2 class="section-title">Tags in the HTML <span class="muted">({{ meta.tags.length }})</span></h2>
          <dl class="tags">
            <template v-for="(t, i) in meta.tags" :key="i">
              <dt>{{ t.key }}</dt>
              <dd>{{ t.value }}</dd>
            </template>
          </dl>
        </SqSheet>
      </section>
    </div>
  </div>
</template>

<style scoped>
.lab__head { padding: 32px 0 24px; max-width: 720px; }
.lab__head h1 { font-size: clamp(1.9rem, 4vw, 2.6rem); letter-spacing: -0.03em; margin: 10px 0 10px; line-height: 1.1; }
.lab__head p { margin: 0; line-height: 1.6; }
.lab__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 24px; align-items: start; }
@media (max-width: 900px) { .lab__grid { grid-template-columns: 1fr; } }
.lab__col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
.panel { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.panel__title { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.panel__title .section-title { margin: 0; }
.panel__url { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; min-width: 0; }
.panel__url a { color: var(--sq-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.via { font-size: 0.85rem; word-break: break-all; }
.via a { color: var(--sq-primary); }
.panel__tools { display: flex; flex-wrap: wrap; gap: 8px; }
.score { display: flex; gap: 6px; }
.checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.check { display: grid; grid-template-columns: 24px 1fr; gap: 10px; padding: 10px 6px; border-radius: var(--sq-radius-md); }
.check + .check { border-top: 1px solid var(--sq-border); }
.check__label { font-weight: 600; font-size: 0.925rem; }
.check__detail { font-size: 0.85rem; color: var(--sq-on-surface-variant); word-break: break-word; margin-top: 2px; }
.note { font-size: 0.8rem; margin: 0; }
.tags { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; font-size: 0.8rem; font-family: var(--sq-font-mono, ui-monospace, monospace); }
.tags dt { color: var(--sq-primary); }
.tags dd { margin: 0; word-break: break-word; color: var(--sq-on-surface-variant); }
@media (max-width: 560px) { .tags { grid-template-columns: 1fr; } .tags dd { margin-bottom: 8px; } }
</style>
