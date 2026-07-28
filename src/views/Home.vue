<template>
  <div class="home-page">
    <Hero />
    <Features />
    <HomeCollections />
    <Testimonials />
    <Announcements />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import Hero from '../components/Hero.vue'

// Lazy loaded components: These will only be loaded when they are actually needed / requested by the browser
const Features = defineAsyncComponent(() => import('../components/Features.vue'))
const HomeCollections = defineAsyncComponent(() => import('../components/HomeCollections.vue'))
const Announcements = defineAsyncComponent(() => import('../components/Announcements.vue'))
const Testimonials = defineAsyncComponent(() => import('../components/Testimonials.vue'))
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}
</style>
