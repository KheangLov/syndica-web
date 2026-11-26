<script setup>
import { computed, ref, watch } from 'vue'
import BlockRenderer from '../components/BlockRenderer.vue'
import ShareBar from '../components/ShareBar.vue'
import PostCard from '../components/PostCard.vue'
import { asset, formatDate, getPost, getPosts, getSite, pageUrl, setTitle, useAsync } from '../lib/content.js'
import { icons } from '../lib/icons.js'

const props = defineProps({ slug: { type: String, required: true } })

const post = useAsync(getPost)
const all = ref([])
const site = ref(null)

watch(
  () => props.slug,
  async (slug) => {
    await post.run(slug)
    ;[all.value, site.value] = await Promise.all([getPosts().catch(() => []), getSite().catch(() => null)])
    setTitle(post.data?.title || 'Not found', site.value?.name)
  },
  { immediate: true },
)

const url = computed(() => pageUrl(`posts/${props.slug}/`))
const related = computed(() => {
  const p = post.data
  if (!p) return []
  const score = (x) => x.tags.filter((t) => p.tags.includes(t)).length
  return all.value.filter((x) => x.slug !== p.slug).sort((a, b) => score(b) - score(a)).slice(0, 2)
})
</script>

<template>
  <div class="wrap">
    <!-- loading -->
    <div v-if="post.loading" class="article">
      <SqSkeleton type="text" :lines="2" />
      <SqSkeleton type="image" height="360" :lines="1" class="mt" />
      <SqSkeleton type="text" :lines="6" class="mt" />
    </div>

    <SqEmptyState
      v-else-if="post.error"
      class="mt-lg"
      :icon="post.error.status === 404 ? 'search' : 'error'"
      :title="post.error.status === 404 ? 'Post not found' : 'Couldn’t load this post'"
      :text="post.error.status === 404 ? 'It may have been renamed or unpublished.' : post.error.message"
    >
      <template #actions><SqBtn to="/" variant="tonal" :prepend-icon="icons.arrowLeft">All posts</SqBtn></template>
    </SqEmptyState>

    <article v-else-if="post.data" class="article" :lang="post.data.lang || 'en'">
      <SqBtn to="/" variant="text" size="small" :prepend-icon="icons.arrowLeft" class="back">All posts</SqBtn>

      <header class="article__head">
        <div class="article__tags">
          <SqChip v-for="t in post.data.tags" :key="t" :to="{ path: '/', query: { tag: t } }" size="small" rounded="pill" link>#{{ t }}</SqChip>
        </div>
        <h1 class="article__title">{{ post.data.title }}</h1>
        <p class="article__lead">{{ post.data.description }}</p>
        <div class="article__byline">
          <SqAvatar :name="post.data.author || site?.author?.name || 'Syndica'" :image="site?.author?.avatar || undefined" size="small" />
          <div class="meta-row">
            <span class="author">{{ post.data.author || site?.author?.name }}</span>
            <span class="dot">{{ formatDate(post.data.date) }}</span>
            <span class="dot"><SqIcon :icon="icons.clock" size="x-small" /> {{ post.data.readingTime }} min read</span>
          </div>
        </div>
      </header>

      <SqImg :src="asset(post.data.image)" :alt="post.data.imageAlt" aspect-ratio="1.905" rounded="xl" eager class="article__cover" />

      <div class="article__share-top">
        <ShareBar :url="url" :title="post.data.title" />
      </div>

      <BlockRenderer :blocks="post.data.blocks" class="article__body" />

      <SqSheet border rounded="xl" class="share-box">
        <div class="share-box__text">
          <h2 class="section-title">Share this post</h2>
          <p class="muted">Send it to a chat or channel and see how the preview looks.</p>
        </div>
        <ShareBar :url="url" :title="post.data.title" />
        <SqBtn :to="{ path: '/share', query: { post: post.data.slug } }" variant="text" size="small" :prepend-icon="icons.flask" class="share-box__lab">
          Inspect this post’s preview in the Share lab
        </SqBtn>
      </SqSheet>
    </article>

    <section v-if="related.length" class="related">
      <h2 class="section-title">Keep reading</h2>
      <div class="related__grid">
        <PostCard v-for="p in related" :key="p.slug" :post="p" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.mt { margin-top: 24px; }
.mt-lg { margin-top: 64px; }
.article { max-width: var(--prose-max); margin: 0 auto; padding-top: 12px; }
.back { margin-left: -10px; margin-bottom: 20px; }
.article__tags { display: flex; gap: 6px; flex-wrap: wrap; }
.article__title { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.08; letter-spacing: -0.035em; margin: 16px 0 14px; font-weight: 750; text-wrap: balance; }
.article__title:lang(km) { line-height: 1.45; letter-spacing: 0; }
.article__lead { font-size: 1.2rem; line-height: 1.55; color: var(--sq-on-surface-variant); margin: 0 0 22px; }
.article__byline { display: flex; align-items: center; gap: 12px; }
.author { font-weight: 600; color: var(--sq-on-background); }
.article__cover { margin: 32px -40px 0; box-shadow: var(--sq-elevation-2); }
@media (max-width: 800px) { .article__cover { margin: 28px 0 0; } }
.article__share-top { margin: 24px 0 36px; }
.share-box { margin-top: 48px; padding: 24px; display: flex; flex-direction: column; gap: 16px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--tg) 9%, var(--sq-surface)), var(--sq-surface) 60%); }
.share-box__text p { margin: 0; }
.share-box__text .section-title { margin-bottom: 4px; }
.share-box__lab { align-self: flex-start; margin-left: -8px; }
.related { max-width: 960px; margin: 72px auto 0; }
.related__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
</style>
