<script setup>
import { computed, provide, ref } from 'vue'
import { useTheme } from 'squirkle-ui'
import { icons } from './lib/icons.js'
import { asset } from './lib/content.js'

const theme = useTheme()
const isDark = computed(() => theme.isDark)
function toggleTheme() {
  theme.toggle()
  try { localStorage.setItem('syndica-theme', theme.name) } catch {}
}

// App-wide toast
const toast = ref({ show: false, text: '', icon: 'success' })
provide('toast', (text, icon = 'success') => { toast.value = { show: true, text, icon } })

const year = new Date().getFullYear()
</script>

<template>
  <SqApp>
    <SqAppBar floating class="topbar">
      <template #prepend>
        <RouterLink to="/" class="brand" aria-label="Syndica home">
          <span class="brand__mark"><SqIcon :icon="icons.telegram" size="small" /></span>
          <span class="brand__name">Syndica</span>
        </RouterLink>
      </template>
      <template #append>
        <nav class="nav">
          <SqBtn variant="text" to="/" size="small" class="nav__btn">Posts</SqBtn>
          <SqBtn variant="tonal" to="/share" size="small" :prepend-icon="icons.flask">Share lab</SqBtn>
          <SqTooltip :text="isDark ? 'Light mode' : 'Dark mode'" location="bottom">
            <SqBtn variant="text" size="small" :icon="isDark ? 'sun' : 'moon'" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme" />
          </SqTooltip>
        </nav>
      </template>
    </SqAppBar>

    <SqMain>
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </SqMain>

    <footer class="footer">
      <SqContainer max-width="1120">
        <div class="footer__inner">
          <span>© {{ year }} Syndica · Content from JSON, previews prerendered for Telegram.</span>
          <span class="footer__links">
            <a :href="asset('feed.xml')"><SqIcon :icon="icons.rss" size="x-small" /> RSS</a>
            <a href="https://github.com/KheangLov/syndica-web" target="_blank" rel="noopener">Source</a>
          </span>
        </div>
      </SqContainer>
    </footer>

    <SqSnackbar v-model="toast.show" :text="toast.text" :icon="toast.icon" :timeout="2400" />
  </SqApp>
</template>
