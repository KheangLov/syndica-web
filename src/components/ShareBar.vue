<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { icons } from '../lib/icons.js'
import { canNativeShare, copyText, shareTargets } from '../lib/share.js'

const props = defineProps({
  url: { type: String, required: true },
  title: { type: String, default: '' },
  compact: Boolean,
})
const toast = inject('toast', () => {})
const targets = computed(() => shareTargets(props.url, props.title))
const telegram = computed(() => targets.value[0])
const isTouch = ref(false)
onMounted(() => { isTouch.value = matchMedia('(pointer: coarse)').matches })
const others = computed(() => targets.value.slice(1).filter((t) => !t.mobileOnly || isTouch.value))
const nativeShare = canNativeShare()

async function copy() {
  if (await copyText(props.url)) toast('Link copied')
}
async function share() {
  try { await navigator.share({ title: props.title, url: props.url }) } catch {}
}
</script>

<template>
  <div class="share" :class="{ 'share--compact': compact }">
    <SqBtn
      :href="telegram.href"
      target="_blank"
      rel="noopener"
      class="share__tg"
      :prepend-icon="icons.telegram"
      color="#229ED9"
      rounded="pill"
    >
      Share on Telegram
    </SqBtn>
    <div class="share__others">
      <SqTooltip v-for="t in others" :key="t.id" :text="t.label">
        <SqBtn :href="t.href" target="_blank" rel="noopener" variant="tonal" :icon="icons[t.icon]" :aria-label="`Share on ${t.label}`" />
      </SqTooltip>
      <SqTooltip text="Copy link">
        <SqBtn variant="tonal" :icon="icons.link" aria-label="Copy link" @click="copy" />
      </SqTooltip>
      <SqTooltip v-if="nativeShare" text="More…">
        <SqBtn variant="tonal" :icon="icons.share" aria-label="Share via device" @click="share" />
      </SqTooltip>
    </div>
  </div>
</template>

<style scoped>
.share { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.share__tg { font-weight: 600; }
.share__others { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
