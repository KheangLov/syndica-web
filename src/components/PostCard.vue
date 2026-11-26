<script setup>
import { asset, formatDate } from '../lib/content.js'
import { icons } from '../lib/icons.js'

defineProps({
  post: { type: Object, required: true },
  featured: Boolean,
})
</script>

<template>
  <SqCard :to="`/posts/${post.slug}/`" hover variant="outlined" rounded="xl" class="post-card" :class="{ 'post-card--featured': featured }">
    <div class="post-card__media" :style="{ '--accent': post.accent }">
      <SqImg :src="asset(post.image)" :alt="post.imageAlt" aspect-ratio="1.905" rounded="lg" :eager="featured" />
    </div>
    <div class="post-card__body" :lang="post.lang || 'en'">
      <div class="post-card__tags">
        <SqChip v-for="t in post.tags.slice(0, 3)" :key="t" size="small" variant="tonal" rounded="pill">#{{ t }}</SqChip>
      </div>
      <h3 class="post-card__title">{{ post.title }}</h3>
      <p class="post-card__desc">{{ post.description }}</p>
      <div class="meta-row">
        <span>{{ formatDate(post.date) }}</span>
        <span class="dot"><SqIcon :icon="icons.clock" size="x-small" /> {{ post.readingTime }} min read</span>
      </div>
    </div>
  </SqCard>
</template>

<style scoped>
.post-card { display: flex; flex-direction: column; height: 100%; text-decoration: none; padding: 10px; transition: transform 0.25s var(--sq-ease-spring, ease); }
.post-card:hover { transform: translateY(-3px); }
.post-card__media { overflow: hidden; border-radius: var(--sq-radius-lg); }
.post-card__media :deep(img) { transition: transform 0.5s var(--sq-ease, ease); }
.post-card:hover .post-card__media :deep(img) { transform: scale(1.03); }
.post-card__body { padding: 14px 8px 8px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.post-card__tags { display: flex; gap: 6px; flex-wrap: wrap; }
.post-card__title { margin: 2px 0 0; font-size: 1.15rem; line-height: 1.3; letter-spacing: -0.02em; font-weight: 650; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.post-card__desc { margin: 0 0 6px; color: var(--sq-on-surface-variant); font-size: 0.925rem; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }

.post-card--featured { display: grid; grid-template-columns: 1.25fr 1fr; gap: 8px; align-items: center; }
.post-card--featured .post-card__body { padding: 12px 20px; }
.post-card--featured .post-card__title { font-size: clamp(1.5rem, 2.6vw, 2.1rem); line-height: 1.15; }
.post-card--featured .post-card__desc { font-size: 1rem; -webkit-line-clamp: 3; flex: 0; }
@media (max-width: 800px) {
  .post-card--featured { display: flex; }
  .post-card--featured .post-card__body { padding: 14px 8px 8px; }
}
</style>
