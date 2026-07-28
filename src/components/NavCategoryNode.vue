<template>
  <div class="nav-node" @mouseenter="isHover = true" @mouseleave="isHover = false">
    <router-link 
      :to="{ name: 'Products', params: { lang: locale }, query: { category: node.slug } }" 
      class="dropdown-item"
      :class="{ 'has-children': children.length > 0 }"
      @click="$emit('close')"
    >
      <span class="item-icon">{{ node.icon || '◆' }}</span>
      <div class="item-content">
        <span class="item-title">{{ getLocalizedText(node.name) }}</span>
      </div>
      <svg v-if="children.length > 0" class="child-arrow" viewBox="0 0 24 24" width="14" height="14">
        <!-- Arrow pointing appropriate direction based on locale -->
        <path v-if="locale === 'fa'" d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2"/>
        <path v-else d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    </router-link>

    <!-- زیردسته‌ها (بازگشتی) -->
    <div v-if="children.length > 0 && isHover" class="child-menu dropdown-menu">
      <NavCategoryNode 
        v-for="child in children" 
        :key="child._id" 
        :node="child"
        :all-categories="allCategories"
        :locale="locale"
        @close="$emit('close')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  node: Object,
  allCategories: Array,
  locale: String
})

defineEmits(['close'])

const isHover = ref(false)

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[props.locale] || value.fa || ''
  return ''
}

// پیدا کردن مستقیم فرزندان این Node (بدون لوپ بی‌نهایت، با چک کردن parents)
const children = computed(() => {
  return props.allCategories.filter(c => c.parents && c.parents.includes(props.node._id))
})
</script>

<style scoped>
.nav-node {
  position: relative;
}
.child-arrow {
  opacity: 0.5;
}

/* Base styles for item matching Navbar.vue */
.dropdown-item { 
  display: flex; align-items: center; gap: 12px; padding: 10px 18px; 
  text-decoration: none; color: #fff; transition: background-color 0.2s ease; 
}
.dropdown-item:hover { background: rgba(255,255,255,0.06); }
.item-icon { color: #c5a059; font-size: 1.1rem; flex-shrink: 0; }
.item-content { flex: 1; min-width: 0; }
.item-title { display: block; font-weight: 600; font-size: 0.85rem; }

.dropdown-menu {
  position: absolute;
  top: 0;
  width: 220px;
  background: rgba(8, 10, 18, 0.98);
  border: 1px solid rgba(197,160,89,0.3);
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.7);
  overflow: hidden;
  z-index: 100;
}

/* LTR Default */
.child-menu {
  left: 100%;
  margin-left: 2px;
}

/* RTL (Persian) Support */
:global([dir="rtl"]) .child-menu {
  left: auto;
  right: 100%;
  margin-left: 0;
  margin-right: 2px;
}
</style>
