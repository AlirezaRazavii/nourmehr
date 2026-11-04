<template>
  <div class="home-page">
    <Hero />
    <Features />
    <HomeCategories/>
    <HomeCollections />
    <BrandStory />
    <Testimonials />
    <MediaShowcase />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import Hero from '../components/Hero.vue'

const Features = defineAsyncComponent(() => import('../components/Features.vue'))
const BrandStory = defineAsyncComponent(() => import('../components/BrandStory.vue'))
const HomeCollections = defineAsyncComponent(() => import('../components/HomeCollections.vue'))
const HomeCategories = defineAsyncComponent(() => import('../components/HomeCategories.vue'))
const MediaShowcase = defineAsyncComponent(() => import('../components/MediaShowcase.vue'))
const Testimonials = defineAsyncComponent(() => import('../components/Testimonials.vue'))
</script>

<style scoped>
.home-page { min-height: 100vh; }
</style>
