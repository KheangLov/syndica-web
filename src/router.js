import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/posts/:slug', name: 'post', component: () => import('./views/PostView.vue'), props: true },
    { path: '/share', name: 'share', component: () => import('./views/ShareLab.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFound.vue') },
  ],
  scrollBehavior: (to, from, saved) => saved || (to.hash ? { el: to.hash, top: 88 } : { top: 0 }),
})
