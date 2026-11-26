<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PostCard from '../components/PostCard.vue'
import { getPosts, getSite, setTitle, useAsync } from '../lib/content.js'
import { icons } from '../lib/icons.js'

const props = defineProps({ tag: { type: String, default: null } })
const router = useRouter()
const posts = useAsync(getPosts)
const site = ref(null)

// Search stays on the page; tag filters are real paths (/tags/<tag>/) — no query strings.
const query = ref('')
const tag = computed({
  get: () => props.tag || null,
  set: (t) => router.push(t ? `/tags/${encodeURIComponent(t)}/` : '/'),
})

onMounted(async () => {
  posts.run()
  site.value = await getSite().catch(() => null)
  setTitle(props.tag ? `#${props.tag}` : '', site.value?.name)
})

const allTags = computed(() => {
  const counts = {}
  for (const p of posts.data || []) for (const t of p.tags) counts[t] = (counts[t] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t)
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (posts.data || []).filter(
    (p) =>
      (!tag.value || p.tags.includes(tag.value)) &&
      (!q || [p.title, p.description, ...p.tags].join(' ').toLowerCase().includes(q)),
  )
})
const isFiltering = computed(() => !!query.value.trim() || !!tag.value)
const featured = computed(() => (isFiltering.value ? null : filtered.value.find((p) => p.featured) || filtered.value[0]))
const rest = computed(() => filtered.value.filter((p) => p !== featured.value))

function reset() { query.value = ''; if (props.tag) tag.value = null }
</script>

<template>
  <div class="wrap home">
    <header class="hero">
      <span class="eyebrow">Telegram share testing</span>
      <h1 class="hero__title">{{ site?.tagline || 'Notes on sharing, previews and the open web' }}</h1>
      <p class="hero__lead">{{ site?.description || 'A small blog for testing how posts look when they’re shared.' }}</p>
    </header>

    <div class="toolbar">
      <SqTextField
        v-model="query"
        class="toolbar__search"
        placeholder="Search posts"
        prepend-inner-icon="search"
        clearable
        hide-details
        rounded="pill"
        aria-label="Search posts"
      />
      <SqChipGroup v-model="tag" class="toolbar__tags" aria-label="Filter by tag">
        <SqChip v-for="t in allTags" :key="t" :value="t" filter variant="outlined" rounded="pill">#{{ t }}</SqChip>
      </SqChipGroup>
    </div>

    <!-- loading -->
    <div v-if="posts.loading" class="grid">
      <SqSheet v-for="n in 3" :key="n" border rounded="xl" class="skeleton-card">
        <SqSkeleton type="image" height="180" :lines="1" />
        <SqSkeleton type="text" :lines="3" />
      </SqSheet>
    </div>

    <SqAlert v-else-if="posts.error" type="error" title="Couldn’t load posts" :text="posts.error.message">
      <template #append><SqBtn variant="text" @click="posts.run()">Retry</SqBtn></template>
    </SqAlert>

    <SqEmptyState
      v-else-if="!filtered.length"
      icon="search"
      title="No posts match"
      text="Try a different word or clear the tag filter."
    >
      <template #actions><SqBtn variant="tonal" @click="reset">Clear filters</SqBtn></template>
    </SqEmptyState>

    <template v-else>
      <PostCard v-if="featured" :post="featured" featured class="featured" />
      <p v-if="isFiltering" class="muted result-count">{{ filtered.length }} post{{ filtered.length === 1 ? '' : 's' }}</p>
      <TransitionGroup name="list" tag="div" class="grid">
        <PostCard v-for="p in rest" :key="p.slug" :post="p" />
      </TransitionGroup>
    </template>

    <SqSheet border rounded="xl" class="lab-cta">
      <div>
        <h2 class="section-title">Testing a share?</h2>
        <p class="muted">The Share lab shows the exact tags Telegram reads for each post, a live preview, and a checklist.</p>
      </div>
      <SqBtn to="/share/" :append-icon="icons.arrowRight" color="primary">Open Share lab</SqBtn>
    </SqSheet>
  </div>
</template>

<style scoped>
.hero { padding: 40px 0 28px; max-width: 760px; }
.hero__title { font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.05; letter-spacing: -0.035em; margin: 12px 0 14px; font-weight: 750; text-wrap: balance; }
.hero__lead { font-size: 1.125rem; line-height: 1.6; color: var(--sq-on-surface-variant); margin: 0; max-width: 620px; }

.toolbar { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: center; margin: 8px 0 28px; }
.toolbar__search { flex: 0 1 320px; min-width: 220px; }
.toolbar__tags { flex: 1; }

.featured { margin-bottom: 24px; }
.result-count { margin: -8px 0 16px; font-size: 0.9rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.skeleton-card { padding: 12px; display: flex; flex-direction: column; gap: 16px; }

.list-move, .list-enter-active, .list-leave-active { transition: all 0.3s var(--sq-ease, ease); }
.list-enter-from, .list-leave-to { opacity: 0; transform: scale(0.97); }
.list-leave-active { position: absolute; }

.lab-cta { margin-top: 56px; padding: 24px 28px; display: flex; flex-wrap: wrap; gap: 16px 32px; align-items: center; justify-content: space-between;
  background: linear-gradient(120deg, color-mix(in srgb, var(--tg) 10%, var(--sq-surface)), var(--sq-surface)); }
.lab-cta p { margin: 0; max-width: 560px; }
</style>
