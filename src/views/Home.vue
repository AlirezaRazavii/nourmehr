<template>
  <div class="home-page">
    <Hero />
    <Features />

    <HomeCollections />
    <BrandStory />
    <Testimonials />
    <Announcements />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import Hero from '../components/Hero.vue'

const Features = defineAsyncComponent(() => import('../components/Features.vue'))
const BrandStory = defineAsyncComponent(() => import('../components/BrandStory.vue'))
const HomeCollections = defineAsyncComponent(() => import('../components/HomeCollections.vue'))
const Announcements = defineAsyncComponent(() => import('../components/Announcements.vue'))
const Testimonials = defineAsyncComponent(() => import('../components/Testimonials.vue'))
</script>

<style scoped>
.home-page { min-height: 100vh; }
</style>
