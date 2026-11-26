<script setup>
import { onMounted } from 'vue'
import { setTitle } from '../lib/content.js'
import { icons } from '../lib/icons.js'
onMounted(() => setTitle('Not found'))
</script>

<template>
  <div class="wrap nf">
    <SqEmptyState icon="search" title="Page not found" text="The link may be broken, or the post was moved.">
      <template #actions><SqBtn to="/" :prepend-icon="icons.arrowLeft">Back to posts</SqBtn></template>
    </SqEmptyState>
  </div>
</template>

<style scoped>
.nf { padding-top: 80px; }
</style>
