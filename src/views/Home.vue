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
import Hero from '../components/Hero.vue'
import Features from '../components/Features.vue'
import HomeCollections from '../components/HomeCollections.vue'
import Announcements from '../components/Announcements.vue'
import Testimonials from '../components/Testimonials.vue'
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}
</style>
