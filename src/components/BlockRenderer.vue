<script setup>
import { inline } from '../lib/inline.js'
import { asset } from '../lib/content.js'
import { copyText } from '../lib/share.js'
import { inject } from 'vue'

defineProps({ blocks: { type: Array, default: () => [] } })
const toast = inject('toast', () => {})
const tones = { info: 'info', success: 'success', warning: 'warning', error: 'error' }

async function copyCode(code) {
  if (await copyText(code)) toast('Code copied')
}
</script>

<template>
  <div class="prose">
    <template v-for="(b, i) in blocks" :key="i">
      <h2 v-if="b.type === 'h2'" v-html="inline(b.text)" />
      <h3 v-else-if="b.type === 'h3'" v-html="inline(b.text)" />
      <ol v-else-if="b.type === 'list' && b.ordered"><li v-for="(it, j) in b.items" :key="j" v-html="inline(it)" /></ol>
      <ul v-else-if="b.type === 'list'"><li v-for="(it, j) in b.items" :key="j" v-html="inline(it)" /></ul>
      <figure v-else-if="b.type === 'quote'" class="quote">
        <blockquote v-html="inline(b.text)" />
        <figcaption v-if="b.cite">— {{ b.cite }}</figcaption>
      </figure>
      <SqSheet v-else-if="b.type === 'code'" rounded="lg" border class="code">
        <div class="code__bar">
          <span>{{ b.lang || 'code' }}</span>
          <SqBtn size="x-small" variant="text" icon="copy" aria-label="Copy code" @click="copyCode(b.code)" />
        </div>
        <pre><code>{{ b.code }}</code></pre>
      </SqSheet>
      <figure v-else-if="b.type === 'image'" class="figure">
        <SqImg :src="asset(b.src)" :alt="b.alt || ''" rounded="lg" />
        <figcaption v-if="b.caption" v-html="inline(b.caption)" />
      </figure>
      <SqAlert v-else-if="b.type === 'callout'" :type="tones[b.tone] || 'info'" :title="b.title" class="callout">
        <span v-html="inline(b.text)" />
      </SqAlert>
      <SqDivider v-else-if="b.type === 'divider'" class="divider" />
      <p v-else v-html="inline(b.text)" />
    </template>
  </div>
</template>

<style scoped>
.prose { font-size: 1.0625rem; line-height: 1.75; color: var(--sq-on-background); }
.prose > :first-child { margin-top: 0; }
.prose :is(p, ul, ol) { margin: 0 0 1.15em; }
.prose h2 { font-size: 1.5rem; letter-spacing: -0.02em; line-height: 1.25; margin: 2em 0 0.6em; }
.prose h3 { font-size: 1.2rem; letter-spacing: -0.01em; margin: 1.6em 0 0.5em; }
.prose :is(ul, ol) { padding-left: 1.3em; }
.prose li { margin: 0.35em 0; padding-left: 0.2em; }
.prose li::marker { color: var(--sq-primary); }
.prose :deep(a) { color: var(--sq-primary); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.prose :deep(code) { font-family: var(--sq-font-mono, ui-monospace, monospace); font-size: 0.86em; padding: 0.15em 0.4em; border-radius: 6px; background: var(--sq-surface-variant); }
.prose :deep(strong) { font-weight: 650; }

.quote { margin: 1.8em 0; padding: 4px 0 4px 22px; border-left: 3px solid var(--sq-primary); }
.quote blockquote { margin: 0; font-size: 1.3rem; line-height: 1.45; letter-spacing: -0.01em; font-weight: 550; }
.quote figcaption { margin-top: 8px; font-size: 0.9rem; color: var(--sq-on-surface-variant); }

.code { margin: 1.4em 0; overflow: hidden; background: var(--sq-surface-variant); }
.code__bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px 0 16px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sq-on-surface-variant); }
.code pre { margin: 0; padding: 8px 16px 16px; overflow-x: auto; font-size: 0.85rem; line-height: 1.6; }
.code pre code { background: none; padding: 0; font-size: inherit; }

.figure { margin: 1.8em 0; }
.figure figcaption { text-align: center; font-size: 0.875rem; color: var(--sq-on-surface-variant); margin-top: 8px; }
.callout { margin: 1.5em 0; line-height: 1.6; font-size: 0.975rem; }
.divider { margin: 2em 0; }
</style>
