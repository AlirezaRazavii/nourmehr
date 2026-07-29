<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import logoImg from '../assests/logo/Nourmehr-gold.webp'
import promoImg from '../assests/backgrounds/IMG_3306.jpg'

import { useCart } from '../stores/cart'
import { useWishlist } from '../stores/wishlist'
import { useAuth } from '../stores/auth'
import { fetchCategoriesCached } from '../services/categoryCache'
import { searchProducts, isSearchCanceled, MIN_QUERY_LENGTH } from '../services/searchApi'
import { getImageUrl } from '../utils/imageUrl'
import { applyDirection } from '../i18n'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

const cart = useCart()
const wishlist = useWishlist()
const auth = useAuth()

/* ───────── helpers ───────── */
const tx = (v) => {
  if (!v) return ''
  if (typeof v === 'string') return v
  return v[locale.value] || v.fa || v.en || ''
}

const isLoggedIn = computed(() => auth.isAuthenticated)
const userName = computed(() => auth.userName || auth.user?.phone || t('default_user'))
const userInitial = computed(() => (userName.value || '?').trim().charAt(0).toUpperCase())

/* ───────── categories tree ───────── */
const categories = ref([])
const catsLoading = ref(true)
const catsError = ref(false)

const loadCategories = async (force = false) => {
  catsLoading.value = true
  catsError.value = false
  try {
    const res = await fetchCategoriesCached(force)
    categories.value = Array.isArray(res) ? res : []
  } catch {
    catsError.value = true
    categories.value = []
  } finally {
    catsLoading.value = false
  }
}

const bySort = (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)

/* parents ممکن است رشتهٔ id یا آبجکت populate‌شده باشد */
const pid = (p) => (typeof p === 'string' ? p : p?._id || p?.id || '')

const roots = computed(() =>
  categories.value.filter((c) => !c.parents || c.parents.length === 0).slice().sort(bySort)
)

/* نقشهٔ فرزندان */
const childMap = computed(() => {
  const m = new Map()
  for (const c of categories.value) {
    for (const p of c.parents || []) {
      const k = pid(p)
      if (!k) continue
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(c)
    }
  }
  for (const arr of m.values()) arr.sort(bySort)
  return m
})

const childrenOf = (id) => childMap.value.get(id) || []
const hasChildren = (id) => childrenOf(id).length > 0

const catImage = (c) => (c?.image ? getImageUrl(c.image) : '')

/* ───────── mega menu ───────── */
const megaOpen = ref(false)
const activeRootId = ref(null)
let megaTimer = null

const activeRoot = computed(() =>
  roots.value.find((c) => c._id === activeRootId.value) || roots.value[0] || null
)

const megaColumns = computed(() => {
  if (!activeRoot.value) return []
  return childrenOf(activeRoot.value._id).map((child) => ({
    ...child,
    items: childrenOf(child._id),
  }))
})

const promoBg = computed(() => catImage(activeRoot.value) || promoImg)

const openMega = () => {
  clearTimeout(megaTimer)
  if (!activeRootId.value && roots.value.length) activeRootId.value = roots.value[0]._id
  megaOpen.value = true
}

const closeMega = (delay = 220) => {
  clearTimeout(megaTimer)
  if (delay <= 0) { megaOpen.value = false; return }
  megaTimer = setTimeout(() => { megaOpen.value = false }, delay)
}

const toggleMega = () => {
  clearTimeout(megaTimer)
  if (megaOpen.value) megaOpen.value = false
  else openMega()
}

/* ───────── navigation helpers ───────── */
const safePush = (target, fallbackPath) => {
  try {
    const p = router.push(target)
    if (p && typeof p.catch === 'function') {
      p.catch(() => { if (fallbackPath) router.push(fallbackPath).catch(() => {}) })
    }
  } catch {
    if (fallbackPath) router.push(fallbackPath).catch(() => {})
  }
}

const goCategory = (slug) => {
  if (!slug) return
  closeMega(0)
  closeDrawer()
  safePush(
    { name: 'Products', params: { lang: locale.value }, query: { category: slug } },
    `/${locale.value}/products?category=${encodeURIComponent(slug)}`
  )
}

/* ───────── live search ───────── */
const searchTerm = ref('')
const searchFocused = ref(false)
const drawerSearchEl = ref(null)
const desktopSearchEl = ref(null)

const suggestOpen = ref(false)        // دراپ‌دان دسکتاپ
const drawerSuggestOpen = ref(false)  // دراپ‌دان دراور موبایل
const searchLoading = ref(false)
const searchError = ref(false)
const searchResults = ref([])
const searchTotal = ref(0)
const activeIndex = ref(-1)

let searchTimer = null
let searchController = null

const canSearch = computed(() => searchTerm.value.trim().length >= MIN_QUERY_LENGTH)

const resetSuggest = () => {
  searchResults.value = []
  searchTotal.value = 0
  searchError.value = false
  activeIndex.value = -1
}

const runSuggest = async () => {
  const q = searchTerm.value.trim()
  if (q.length < MIN_QUERY_LENGTH) {
    searchController?.abort()
    searchLoading.value = false
    resetSuggest()
    return
  }

  searchController?.abort()
  searchController = new AbortController()
  searchLoading.value = true
  searchError.value = false

  try {
    const { items, total } = await searchProducts(q, { limit: 6, signal: searchController.signal })
    searchResults.value = items
    searchTotal.value = total
    activeIndex.value = -1
  } catch (err) {
    if (isSearchCanceled(err)) return
    searchError.value = true
    searchResults.value = []
    searchTotal.value = 0
  } finally {
    searchLoading.value = false
  }
}

watch(searchTerm, () => {
  clearTimeout(searchTimer)
  if (!searchTerm.value.trim()) {
    searchController?.abort()
    searchLoading.value = false
    resetSuggest()
    return
  }
  searchTimer = setTimeout(runSuggest, 350)
})

const closeSuggest = () => {
  suggestOpen.value = false
  drawerSuggestOpen.value = false
  activeIndex.value = -1
}

const clearSearch = async (focusTarget = 'desktop') => {
  searchTerm.value = ''
  resetSuggest()
  await nextTick()
  if (focusTarget === 'desktop') desktopSearchEl.value?.focus()
  else drawerSearchEl.value?.focus()
}

/** رفتن به صفحهٔ محصولات با عبارت جستجو */
const runSearch = () => {
  const q = searchTerm.value.trim()
  if (!q) return false
  closeSuggest()
  safePush(
    { name: 'Products', params: { lang: locale.value }, query: { search: q } },
    `/${locale.value}/products?search=${encodeURIComponent(q)}`
  )
  return true
}

const submitSearch = () => {
  if (activeIndex.value >= 0 && searchResults.value[activeIndex.value]) {
    goProduct(searchResults.value[activeIndex.value])
    return
  }
  runSearch()
}

const submitDrawerSearch = () => {
  if (activeIndex.value >= 0 && searchResults.value[activeIndex.value]) {
    goProduct(searchResults.value[activeIndex.value])
    return
  }
  if (runSearch()) closeDrawer()
}

const goProduct = (p) => {
  const id = p?._id || p?.id || p?.slug
  if (!id) return
  closeSuggest()
  closeDrawer()
  searchTerm.value = ''
  resetSuggest()
  safePush(
    { name: 'ProductDetails', params: { lang: locale.value, id } },
    `/${locale.value}/product/${encodeURIComponent(id)}`
  )
}

const moveActive = (dir) => {
  const len = searchResults.value.length
  if (!len) return
  activeIndex.value = (activeIndex.value + dir + len + 1) % (len + 1) - 1
  if (activeIndex.value < -1) activeIndex.value = len - 1
}

const onSearchFocus = (variant = 'desktop') => {
  searchFocused.value = true
  if (variant === 'desktop') suggestOpen.value = true
  else drawerSuggestOpen.value = true
  if (canSearch.value && !searchResults.value.length && !searchLoading.value) runSuggest()
}

const productPrice = (p) =>
  p.finalPriceFormatted || p.priceFormatted || Number(p.finalPrice || p.price || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

/* دکمهٔ ذره‌بین موبایل */
const openSearchDrawer = async () => {
  if (!drawer.value) { drawer.value = true; lockScroll(true) }
  await nextTick()
  drawerSearchEl.value?.focus()
}

/* ───────── user menu ───────── */
const userMenu = ref(false)

const logout = async () => {
  try { await auth.logout() } catch {}
  userMenu.value = false
  closeDrawer()
  safePush({ name: 'Login', params: { lang: locale.value } }, `/${locale.value}/login`)
}

/* ───────── language ───────── */
const switchLang = () => {
  const nextLang = locale.value === 'fa' ? 'en' : 'fa'
  locale.value = nextLang
  try { localStorage.setItem('app_lang', nextLang) } catch {}
  applyDirection(nextLang)

  const cur = router.currentRoute.value
  if (cur.params.lang === nextLang) return
  if (cur.name) {
    safePush({ name: cur.name, params: { ...cur.params, lang: nextLang }, query: cur.query })
  } else {
    router.replace(cur.fullPath.replace(/^\/(fa|en)(?=\/|$)/, `/${nextLang}`)).catch(() => {})
  }
}

/* ───────── mobile drawer ───────── */
const drawer = ref(false)
const openAccordion = ref(null)

const lockScroll = (on) => {
  const b = document.body
  if (on) {
    b.style.overflow = 'hidden'
    b.style.touchAction = 'none'
  } else {
    b.style.overflow = ''
    b.style.touchAction = ''
  }
}

const toggleDrawer = () => {
  drawer.value = !drawer.value
  lockScroll(drawer.value)
  if (!drawer.value) { openAccordion.value = null; closeSuggest() }
}

const closeDrawer = () => {
  if (!drawer.value) return
  drawer.value = false
  openAccordion.value = null
  drawerSuggestOpen.value = false
  lockScroll(false)
}

const toggleAccordion = (id) => { openAccordion.value = openAccordion.value === id ? null : id }

/* ───────── scroll & global events ───────── */
const scrolled = ref(false)
let ticking = false

const onScroll = () => {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    scrolled.value = window.scrollY > 24
    ticking = false
  })
}

const onKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (suggestOpen.value || drawerSuggestOpen.value) { closeSuggest(); return }
  closeMega(0)
  userMenu.value = false
  closeDrawer()
}

const onDocClick = (e) => {
  const el = e.target
  if (!el?.closest?.('.js-user')) userMenu.value = false
  if (!el?.closest?.('.js-mega')) closeMega(0)
  if (!el?.closest?.('.js-search')) closeSuggest()
}

const onResize = () => { if (window.innerWidth > 1024) closeDrawer() }

watch(() => route.fullPath, () => {
  closeMega(0)
  userMenu.value = false
  closeSuggest()
  closeDrawer()
})

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocClick)
  loadCategories()
})

onUnmounted(() => {
  clearTimeout(megaTimer)
  clearTimeout(searchTimer)
  searchController?.abort()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocClick)
  lockScroll(false)
})

/* ───────── static links ───────── */
const links = computed(() => [
  { name: 'Home', label: t('nav_home') },
  { name: 'Products', label: t('nav_products') },
  { name: 'Discounts', label: t('nav_discounts'), hot: true },
  { name: 'News', label: t('nav_news') },
  { name: 'About', label: t('nav_about') },
  { name: 'Contact', label: t('nav_contact') },
])
</script>


<template>
  <header class="nav-root" :class="{ shrunk: scrolled }">
    <!-- ═════ ردیف ۱ ═════ -->
    <div class="nav-top">
      <router-link :to="{ name: 'Home', params: { lang: locale } }" class="brand">
        <img :src="logoImg" alt="Nourmehr" width="42" height="42" />
        <span class="brand-txt">
          <b>{{ $t('brand_name') }}</b>
          <i>{{ $t('brand_tagline') }}</i>
        </span>
      </router-link>

      <!-- جستجوی دسکتاپ -->
      <div class="js-search search-wrap">
        <form class="search" :class="{ on: searchFocused }" role="search" @submit.prevent="submitSearch">
          <button type="submit" class="search-go" :aria-label="$t('nav_search_submit')">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </button>

          <input
            ref="desktopSearchEl"
            v-model="searchTerm"
            type="search"
            name="search"
            autocomplete="off"
            inputmode="search"
            enterkeyhint="search"
            :placeholder="$t('nav_search_placeholder')"
            @focus="onSearchFocus('desktop')"
            @blur="searchFocused = false"
            @keydown.down.prevent="moveActive(1)"
            @keydown.up.prevent="moveActive(-1)"
          />

          <button
            v-if="searchTerm.trim()"
            type="button"
            class="search-clear"
            :aria-label="$t('nav_search_clear')"
            @click="clearSearch('desktop')"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </form>

        <!-- دراپ‌دان پیشنهادها -->
        <Transition name="pop">
          <div v-if="suggestOpen && (searchLoading || searchError || searchResults.length || canSearch)" class="suggest">
            <div class="suggest-head">
              <span>
                <template v-if="searchLoading">{{ $t('nav_search_loading') }}</template>
                <template v-else-if="searchError">{{ $t('error_loading') }}</template>
                <template v-else-if="searchResults.length">{{ $t('nav_search_suggestions') }}</template>
                <template v-else>{{ $t('nav_search_no_result') }}</template>
              </span>
              <button type="button" :aria-label="$t('nav_close')" @click="closeSuggest">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="suggest-body">
              <div v-if="searchLoading" class="suggest-skel">
                <span v-for="n in 3" :key="n"></span>
              </div>

              <div v-else-if="searchError" class="suggest-msg err">
                <span>{{ $t('nav_search_error') }}</span>
                <button type="button" @click="runSuggest">{{ $t('retry') }}</button>
              </div>

              <p v-else-if="!searchResults.length && canSearch" class="suggest-msg">
                {{ $t('nav_search_empty_for', { q: searchTerm.trim() }) }}
              </p>

              <button
                v-for="(p, i) in searchResults"
                :key="p._id"
                type="button"
                class="suggest-item"
                :class="{ on: i === activeIndex }"
                @mouseenter="activeIndex = i"
                @click="goProduct(p)"
              >
                <span class="si-img">
                  <img :src="getImageUrl(p.mainImage)" :alt="tx(p.name)" loading="lazy" />
                </span>
                <span class="si-info">
                  <b>{{ tx(p.name) }}</b>
                  <small v-if="p.category">{{ tx(p.category?.name || p.category) }}</small>
                </span>
                <span class="si-price">
                  <em v-if="p.discountPercent">{{ p.discountPercent }}%</em>
                  {{ productPrice(p) }} {{ $t('products_currency') }}
                </span>
              </button>
            </div>

            <button v-if="canSearch" type="button" class="suggest-all" @click="runSearch">
              {{ $t('nav_search_show_all', { q: searchTerm.trim() }) }}
              <b v-if="searchTotal">({{ searchTotal }})</b>
            </button>
          </div>
        </Transition>
      </div>

      <div class="actions">
        <button class="msearch" :aria-label="$t('nav_search_submit')" @click.stop="openSearchDrawer">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </button>

        <button class="lang" @click="switchLang">{{ locale === 'fa' ? 'EN' : 'FA' }}</button>

        <router-link
          v-if="isLoggedIn"
          :to="{ name: 'UserWishlist', params: { lang: locale } }"
          class="ico"
          :aria-label="$t('nav_wishlist')"
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9">
            <path d="M12 21l-1.45-1.32C5.4 15 2 12 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.5-3.4 6.5-8.55 11.18L12 21z" />
          </svg>
          <span v-if="wishlist.totalItems" class="badge red">{{ wishlist.totalItems }}</span>
        </router-link>

        <router-link :to="{ name: 'Cart', params: { lang: locale } }" class="cart-pill" :aria-label="$t('nav_cart')">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9">
            <circle cx="9" cy="21" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="19" cy="21" r="1.4" fill="currentColor" stroke="none" />
            <path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L22 7H6" />
          </svg>
          <span class="cart-label">{{ $t('nav_cart') }}</span>
          <span v-if="cart.totalItems" class="badge gold">{{ cart.totalItems }}</span>
        </router-link>

        <div v-if="isLoggedIn" class="js-user user-wrap">
          <button class="user-btn" :class="{ on: userMenu }" @click.stop="userMenu = !userMenu">
            <span class="avatar">{{ userInitial }}</span>
            <span class="uname">{{ userName }}</span>
          </button>
          <Transition name="pop">
            <div v-if="userMenu" class="user-pop">
              <router-link :to="{ name: 'UserDashboard', params: { lang: locale } }" @click="userMenu = false">{{ $t('user_dashboard') }}</router-link>
              <router-link :to="{ name: 'UserOrders', params: { lang: locale } }" @click="userMenu = false">{{ $t('user_orders') }}</router-link>
              <router-link :to="{ name: 'UserProfile', params: { lang: locale } }" @click="userMenu = false">{{ $t('user_profile') }}</router-link>
              <button class="danger" @click="logout">{{ $t('logout') }}</button>
            </div>
          </Transition>
        </div>

        <router-link v-else :to="{ name: 'Login', params: { lang: locale } }" class="login">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span>{{ $t('login_register') }}</span>
        </router-link>

        <button
          class="burger"
          :aria-label="$t('mobile_menu_title')"
          :aria-expanded="drawer"
          @click.stop="toggleDrawer"
        >
          <span :class="{ x: drawer }"><i></i><i></i><i></i></span>
        </button>
      </div>
    </div>

    <!-- ═════ ردیف ۲ ═════ -->
    <nav class="nav-bar">
      <div class="nav-bar-in">
        <div
          class="js-mega mega-trigger"
          @mouseenter="openMega"
          @mouseleave="closeMega()"
        >
          <button class="mega-btn" :class="{ on: megaOpen }" :aria-expanded="megaOpen" @click.stop="toggleMega">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
            <span>{{ $t('nav_categories') }}</span>
            <svg class="caret" :class="{ up: megaOpen }" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <!-- پنل مگامنو: v-show + پل نامرئی، بدون فاصله و بدون unmount -->
          <div class="mega" :class="{ show: megaOpen }" v-show="megaOpen" :aria-hidden="!megaOpen">
            <aside class="mega-rail">
              <p class="rail-hint">{{ $t('nav_mega_hint') }}</p>

              <div v-if="catsLoading" class="rail-skel">
                <span v-for="n in 7" :key="n"></span>
              </div>

              <div v-else-if="catsError" class="rail-err">
                <span>{{ $t('error_loading') }}</span>
                <button @click="loadCategories(true)">{{ $t('retry') }}</button>
              </div>

              <ul v-else class="rail-list">
                <li v-for="c in roots" :key="c._id">
                  <button
                    :class="{ on: activeRoot?._id === c._id }"
                    @mouseenter="activeRootId = c._id"
                    @focus="activeRootId = c._id"
                    @click="goCategory(c.slug)"
                  >
                    <span class="rail-thumb">
                      <img v-if="catImage(c)" :src="catImage(c)" :alt="tx(c.name)" loading="lazy" />
                      <i v-else class="ri">{{ c.icon || '◆' }}</i>
                    </span>
                    <span class="rail-name">{{ tx(c.name) }}</span>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                </li>
                <li v-if="!roots.length" class="rail-empty">{{ $t('no_categories') }}</li>
              </ul>
            </aside>

            <section class="mega-body">
              <header class="mega-head">
                <div class="mega-head-main">
                  <span v-if="catImage(activeRoot)" class="head-thumb">
                    <img :src="catImage(activeRoot)" :alt="tx(activeRoot?.name)" loading="lazy" />
                  </span>
                  <h3>{{ tx(activeRoot?.name) }}</h3>
                </div>
                <button class="mega-all" @click="goCategory(activeRoot?.slug)">
                  {{ $t('nav_mega_all') }}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
              </header>

              <div v-if="megaColumns.length" class="mega-cols">
                <div v-for="col in megaColumns" :key="col._id" class="col">
                  <button class="col-head" @click="goCategory(col.slug)">
                    <span class="col-thumb">
                      <img v-if="catImage(col)" :src="catImage(col)" :alt="tx(col.name)" loading="lazy" />
                      <i v-else></i>
                    </span>
                    {{ tx(col.name) }}
                  </button>
                  <ul v-if="col.items.length">
                    <li v-for="it in col.items" :key="it._id">
                      <button @click="goCategory(it.slug)">{{ tx(it.name) }}</button>
                    </li>
                  </ul>
                </div>
              </div>

              <p v-else class="mega-none">{{ $t('no_categories') }}</p>
            </section>

            <aside class="mega-promo">
              <div class="promo-card" :style="{ backgroundImage: `url(${promoBg})` }">
                <span class="promo-tag">{{ tx(activeRoot?.name) }}</span>
                <h4>{{ $t('nav_promo_title') }}</h4>
                <button @click="goCategory(activeRoot?.slug)">{{ $t('nav_promo_action') }} ←</button>
              </div>

              <router-link :to="{ name: 'Discounts', params: { lang: locale } }" class="promo-mini" @click="closeMega(0)">
                <b>%</b>
                <span>
                  <strong>{{ $t('nav_discounts') }}</strong>
                  <small>{{ $t('discounts_page_subtitle') }}</small>
                </span>
              </router-link>
            </aside>
          </div>
        </div>

        <ul class="nav-links">
          <li v-for="l in links" :key="l.name">
            <router-link :to="{ name: l.name, params: { lang: locale } }">
              {{ l.label }}
              <em v-if="l.hot" class="hot">%</em>
            </router-link>
          </li>
        </ul>

        <span class="guarantee">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" />
          </svg>
          {{ $t('nav_guarantee') }}
        </span>
      </div>
    </nav>

    <!-- ═════ MOBILE DRAWER ═════ -->
    <div class="drawer" :class="{ open: drawer }">
      <div class="drawer-bd" @click="closeDrawer"></div>

      <aside class="drawer-panel" role="dialog" aria-modal="true" @click.stop>
        <div class="dp-head">
          <span class="dp-brand">
            <img :src="logoImg" alt="" width="30" height="30" />
            <b>{{ $t('brand_name') }}</b>
          </span>
          <button class="dp-close" :aria-label="$t('nav_close')" @click="closeDrawer">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div class="js-search dp-search-wrap">
          <form class="dp-search" role="search" @submit.prevent="submitDrawerSearch">
            <input
              ref="drawerSearchEl"
              v-model="searchTerm"
              type="search"
              name="search"
              autocomplete="off"
              inputmode="search"
              enterkeyhint="search"
              :placeholder="$t('nav_search_placeholder')"
              @focus="onSearchFocus('drawer')"
              @keydown.down.prevent="moveActive(1)"
              @keydown.up.prevent="moveActive(-1)"
            />
            <button
              v-if="searchTerm.trim()"
              type="button"
              class="dp-clear"
              :aria-label="$t('nav_search_clear')"
              @click="clearSearch('drawer')"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <button type="submit" :aria-label="$t('nav_search_submit')">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
          </form>

          <div v-if="drawerSuggestOpen && (searchLoading || searchResults.length || (canSearch && !searchLoading))" class="dp-suggest">
            <div v-if="searchLoading" class="suggest-skel">
              <span v-for="n in 3" :key="n"></span>
            </div>

            <p v-else-if="!searchResults.length" class="suggest-msg">
              {{ $t('nav_search_empty_for', { q: searchTerm.trim() }) }}
            </p>

            <button
              v-for="p in searchResults"
              :key="'dp-' + p._id"
              type="button"
              class="suggest-item"
              @click="goProduct(p)"
            >
              <span class="si-img">
                <img :src="getImageUrl(p.mainImage)" :alt="tx(p.name)" loading="lazy" />
              </span>
              <span class="si-info">
                <b>{{ tx(p.name) }}</b>
                <small>{{ productPrice(p) }} {{ $t('products_currency') }}</small>
              </span>
            </button>

            <button v-if="canSearch" type="button" class="suggest-all" @click="submitDrawerSearch">
              {{ $t('nav_search_show_all', { q: searchTerm.trim() }) }}
            </button>
          </div>
        </div>

        <div class="dp-scroll">
          <nav class="dp-links">
            <router-link
              v-for="l in links"
              :key="l.name"
              :to="{ name: l.name, params: { lang: locale } }"
              @click="closeDrawer"
            >
              <span>{{ l.label }}</span>
              <em v-if="l.hot" class="hot">%</em>
            </router-link>
          </nav>

          <div class="dp-cats">
            <p class="dp-title">{{ $t('nav_categories_title') }}</p>

            <div v-if="catsLoading" class="dp-skel"><span v-for="n in 5" :key="n"></span></div>

            <div v-else-if="catsError" class="dp-err">
              <span>{{ $t('error_loading') }}</span>
              <button @click="loadCategories(true)">{{ $t('retry') }}</button>
            </div>

            <template v-else>
              <div v-for="c in roots" :key="c._id" class="acc" :class="{ open: openAccordion === c._id }">
                <button
                  class="acc-head"
                  @click="hasChildren(c._id) ? toggleAccordion(c._id) : goCategory(c.slug)"
                >
                  <span class="acc-thumb">
                    <img v-if="catImage(c)" :src="catImage(c)" :alt="tx(c.name)" loading="lazy" />
                    <i v-else class="acc-ico">{{ c.icon || '◆' }}</i>
                  </span>
                  <span class="acc-name">{{ tx(c.name) }}</span>
                  <svg
                    v-if="hasChildren(c._id)"
                    class="acc-caret"
                    viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"
                  ><path d="M6 9l6 6 6-6" /></svg>
                </button>

                <div v-show="openAccordion === c._id" class="acc-body">
                  <button class="acc-all" @click="goCategory(c.slug)">{{ $t('nav_mega_all') }}</button>
                  <template v-for="ch in childrenOf(c._id)" :key="ch._id">
                    <button class="acc-l1" @click="goCategory(ch.slug)">{{ tx(ch.name) }}</button>
                    <button
                      v-for="gc in childrenOf(ch._id)"
                      :key="gc._id"
                      class="acc-l2"
                      @click="goCategory(gc.slug)"
                    >{{ tx(gc.name) }}</button>
                  </template>
                </div>
              </div>

              <p v-if="!roots.length" class="dp-empty">{{ $t('no_categories') }}</p>
            </template>
          </div>

          <div class="dp-extra">
            <button class="dp-lang" @click="switchLang">
              {{ locale === 'fa' ? 'English' : 'فارسی' }}
            </button>
            <router-link
              v-if="isLoggedIn"
              :to="{ name: 'UserWishlist', params: { lang: locale } }"
              class="dp-lang"
              @click="closeDrawer"
            >{{ $t('nav_wishlist') }}</router-link>
          </div>
        </div>

        <div class="dp-foot">
          <template v-if="isLoggedIn">
            <router-link :to="{ name: 'UserDashboard', params: { lang: locale } }" class="dp-btn" @click="closeDrawer">
              {{ $t('user_dashboard') }}
            </router-link>
            <button class="dp-btn danger" @click="logout">{{ $t('logout') }}</button>
          </template>
          <router-link v-else :to="{ name: 'Login', params: { lang: locale } }" class="dp-btn gold" @click="closeDrawer">
            {{ $t('login_register') }}
          </router-link>
        </div>
      </aside>
    </div>
  </header>
</template>

<style scoped>
.nav-root, .nav-root * { box-sizing: border-box; font-family: 'Vazirmatn', system-ui, sans-serif; }

.nav-root {
  --gold: #c5a059;
  --gold-l: #f5d78e;
  --bg: rgba(6, 9, 20, .96);
  --line: rgba(255, 255, 255, .08);
  --ink: #eceef2;
  --dim: rgba(236, 238, 242, .58);

  position: fixed; inset: 0 0 auto 0; z-index: 1000;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 6px 28px rgba(0, 0, 0, .45);
  color: var(--ink);
  transition: box-shadow .3s ease;
}
.nav-root.shrunk { box-shadow: 0 8px 34px rgba(0, 0, 0, .6); }

/* ── ردیف ۱ ── */
.nav-top {
  height: var(--nav-top-h, 64px);
  max-width: 1440px; margin: 0 auto;
  padding: 0 clamp(14px, 2.4vw, 32px);
  display: flex; align-items: center; gap: clamp(12px, 2vw, 28px);
}

.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; flex-shrink: 0; }
.brand img { width: 42px; height: 42px; object-fit: contain; }
.brand-txt { display: flex; flex-direction: column; line-height: 1.25; }
.brand-txt b { font-size: 1rem; color: var(--gold); }
.brand-txt i { font-size: .68rem; font-style: normal; color: var(--dim); }

/* ── جستجو ── */
.search-wrap { position: relative; flex: 1; max-width: 520px; }

.search {
  display: flex; align-items: center; gap: 8px;
  height: 42px; padding: 0 6px 0 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, .045);
  border: 1px solid var(--line);
  transition: border-color .25s ease, background-color .25s ease;
}
.search.on { border-color: rgba(197, 160, 89, .5); background: rgba(255, 255, 255, .07); }
.search input {
  flex: 1; min-width: 0; height: 100%;
  background: none; border: none; outline: none;
  color: var(--ink); font-size: .88rem; font-family: inherit;
}
.search input::placeholder { color: rgba(255, 255, 255, .32); }
.search input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
.search-go {
  width: 34px; height: 34px; flex-shrink: 0;
  padding: 0 !important; border: none !important; border-radius: 9px !important;
  background: rgba(197, 160, 89, .16) !important; color: var(--gold) !important;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: background-color .25s ease, color .25s ease;
}
.search-clear {
  width: 26px; height: 26px; flex-shrink: 0;
  padding: 0 !important; border: none !important; border-radius: 50% !important;
  background: rgba(255, 255, 255, .07) !important; color: var(--dim) !important;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: background-color .2s ease, color .2s ease;
}

/* ── دراپ‌دان پیشنهاد جستجو ── */
.suggest {
  position: absolute; top: calc(100% + 8px); inset-inline: 0; z-index: 40;
  border-radius: 14px; overflow: hidden;
  background: #0a0d18;
  border: 1px solid rgba(197, 160, 89, .22);
  box-shadow: 0 20px 48px rgba(0, 0, 0, .72);
}
.suggest-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 9px 14px; border-bottom: 1px solid var(--line);
  font-size: .74rem; color: var(--dim);
}
.suggest-head button {
  padding: 0 !important; background: none !important; border: none !important;
  color: var(--dim) !important; cursor: pointer; display: flex;
}
.suggest-body { max-height: 340px; overflow-y: auto; }

.suggest-item {
  width: 100%; display: flex; align-items: center; gap: 11px;
  padding: 10px 14px !important;
  background: transparent !important; border: none !important;
  color: var(--ink) !important; text-align: start; cursor: pointer;
  transition: background-color .18s ease;
}
.suggest-item.on, .suggest-item:hover { background: rgba(255, 255, 255, .06) !important; }

.si-img {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: 10px;
  overflow: hidden; background: rgba(255, 255, 255, .04);
  display: flex; align-items: center; justify-content: center;
}
.si-img img { width: 100%; height: 100%; object-fit: cover; }

.si-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.si-info b { font-size: .85rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.si-info small { font-size: .7rem; color: var(--dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.si-price {
  flex-shrink: 0; display: flex; align-items: center; gap: 6px;
  font-size: .78rem; font-weight: 700; color: var(--gold-l); white-space: nowrap;
}
.si-price em {
  font-style: normal; font-size: .64rem; font-weight: 800;
  padding: 2px 6px; border-radius: 6px; background: #ef4444; color: #fff;
}

.suggest-msg { margin: 0; padding: 16px 14px; font-size: .8rem; color: var(--dim); }
.suggest-msg.err { display: flex; align-items: center; gap: 10px; color: #f87171; }
.suggest-msg.err button {
  padding: 5px 12px !important; border-radius: 8px !important;
  background: transparent !important; border: 1px solid var(--gold) !important;
  color: var(--gold) !important; font-size: .74rem; cursor: pointer;
}

.suggest-skel { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; }
.suggest-skel span {
  height: 44px; border-radius: 10px;
  background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.08), rgba(255,255,255,.03));
  background-size: 200% 100%; animation: shim 1.3s infinite linear;
}

.suggest-all {
  width: 100%; padding: 11px !important; border: none !important;
  border-top: 1px solid var(--line) !important;
  border-radius: 0 !important;
  background: rgba(197, 160, 89, .12) !important; color: var(--gold-l) !important;
  font-size: .78rem; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: background-color .22s ease, color .22s ease;
}
.suggest-all b { font-weight: 700; opacity: .7; }

/* ── اکشن‌ها ── */
.actions { display: flex; align-items: center; gap: 8px; margin-inline-start: auto; }

.msearch {
  display: none;
  width: 38px; height: 38px; padding: 0 !important;
  border-radius: 10px !important;
  border: 1px solid var(--line) !important;
  background: transparent !important; color: var(--ink) !important;
  align-items: center; justify-content: center; cursor: pointer;
}

.lang {
  width: 38px; height: 38px; padding: 0 !important;
  border-radius: 10px !important;
  border: 1px solid var(--line) !important;
  background: transparent !important; color: var(--gold) !important;
  font-size: .74rem; font-weight: 700; cursor: pointer;
  transition: background-color .25s ease, color .25s ease;
}

.ico, .cart-pill, .login {
  position: relative; display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 12px;
  border-radius: 10px; border: 1px solid var(--line);
  color: var(--ink); text-decoration: none; font-size: .84rem;
  transition: background-color .25s ease, border-color .25s ease, color .25s ease;
}
.ico { width: 38px; padding: 0; justify-content: center; }
.cart-pill { background: rgba(197, 160, 89, .1); border-color: rgba(197, 160, 89, .28); color: var(--gold-l); }
.login { background: rgba(197, 160, 89, .12); border-color: rgba(197, 160, 89, .35); color: var(--gold-l); font-weight: 600; }

.badge {
  position: absolute; top: -6px; inset-inline-end: -6px;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; font-size: .66rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.badge.gold { background: var(--gold); color: #0a0a0a; }
.badge.red { background: #ef4444; color: #fff; }

.user-wrap { position: relative; }
.user-btn {
  display: flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 12px 0 5px !important;
  border-radius: 10px !important;
  border: 1px solid var(--line) !important;
  background: transparent !important; color: var(--ink) !important;
  cursor: pointer; transition: border-color .25s ease;
}
.user-btn.on { border-color: rgba(197, 160, 89, .5) !important; }
.avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, var(--gold), #8f7032);
  color: #0a0a0a; font-weight: 800; font-size: .82rem;
  display: flex; align-items: center; justify-content: center;
}
.uname { font-size: .82rem; max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.user-pop {
  position: absolute; top: calc(100% + 10px); inset-inline-end: 0;
  min-width: 190px; padding: 6px;
  border-radius: 14px; border: 1px solid rgba(197, 160, 89, .22);
  background: #0a0d18; box-shadow: 0 18px 44px rgba(0, 0, 0, .7);
  display: flex; flex-direction: column; z-index: 20;
}
.user-pop a, .user-pop button {
  padding: 10px 14px; border-radius: 9px;
  background: none !important; border: none !important;
  color: var(--ink) !important; font-size: .85rem; font-family: inherit;
  text-align: start; text-decoration: none; cursor: pointer;
  transition: background-color .2s ease, color .2s ease;
}
.user-pop .danger { color: #f87171 !important; }

.burger {
  display: none; width: 38px; height: 38px;
  padding: 0 !important; border-radius: 10px !important;
  background: none !important; border: 1px solid var(--line) !important;
  cursor: pointer;
  align-items: center; justify-content: center;
}
.burger span { width: 20px; height: 14px; display: flex; flex-direction: column; justify-content: space-between; }
.burger i { display: block; height: 2px; border-radius: 2px; background: var(--gold); transition: transform .3s ease, opacity .3s ease; }
.burger .x i:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.burger .x i:nth-child(2) { opacity: 0; }
.burger .x i:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

/* ── ردیف ۲ ── */
.nav-bar { height: var(--nav-bar-h, 48px); border-top: 1px solid var(--line); background: rgba(255, 255, 255, .015); }
.nav-bar-in {
  height: 100%; max-width: 1440px; margin: 0 auto;
  padding: 0 clamp(14px, 2.4vw, 32px);
  display: flex; align-items: center; gap: 22px;
}

.mega-trigger { position: relative; height: 100%; display: flex; align-items: center; }
.mega-btn {
  display: inline-flex; align-items: center; gap: 8px;
  height: 34px; padding: 0 16px !important;
  border-radius: 9px !important;
  border: 1px solid rgba(197, 160, 89, .3) !important;
  background: rgba(197, 160, 89, .12) !important;
  color: var(--gold-l) !important;
  font-size: .85rem; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: background-color .25s ease, color .25s ease;
}
.caret { transition: transform .3s ease; }
.caret.up { transform: rotate(180deg); }

.nav-links { display: flex; align-items: center; gap: 4px; list-style: none; margin: 0; padding: 0; }
.nav-links a {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 8px;
  color: var(--dim); font-size: .86rem; text-decoration: none;
  transition: color .25s ease, background-color .25s ease;
}
.nav-links a.router-link-active { color: var(--gold-l); }
.hot {
  font-style: normal; font-size: .62rem; font-weight: 800;
  padding: 2px 5px; border-radius: 5px;
  background: #ef4444; color: #fff;
}

.guarantee {
  margin-inline-start: auto; display: inline-flex; align-items: center; gap: 7px;
  font-size: .76rem; color: var(--dim); white-space: nowrap;
}
.guarantee svg { color: var(--gold); }

/* ══ MEGA PANEL ══ */
.mega {
  position: absolute; top: 100%; inset-inline-start: 0;
  width: min(1180px, calc(100vw - 40px));
  display: grid;
  grid-template-columns: 244px minmax(0, 1fr) 250px;
  border: 1px solid rgba(197, 160, 89, .18);
  border-radius: 0 0 18px 18px;
  background: #080b16;
  box-shadow: 0 26px 60px rgba(0, 0, 0, .75);
  overflow: hidden;

  /* بدون unmount → بدون فلیکر */
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
  transition: opacity .2s ease, transform .26s cubic-bezier(.16, 1, .3, 1);
}
.mega.show { opacity: 1; transform: translateY(0); pointer-events: auto; }

/* پل نامرئی: فاصلهٔ بین دکمه و پنل را پر می‌کند تا hover قطع نشود */
.mega::before {
  content: ''; position: absolute; top: -14px; inset-inline: 0; height: 14px;
}

.mega-rail { padding: 14px 10px; background: rgba(255, 255, 255, .02); border-inline-end: 1px solid var(--line); }
.rail-hint { margin: 0 6px 10px; font-size: .7rem; color: rgba(255, 255, 255, .35); }
.rail-list { list-style: none; margin: 0; padding: 0; max-height: 396px; overflow-y: auto; }
.rail-list button {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 8px 10px !important; border-radius: 10px !important;
  background: transparent !important; border: none !important;
  color: var(--dim) !important; font-size: .86rem; font-family: inherit;
  text-align: start; cursor: pointer;
  transition: background-color .2s ease, color .2s ease;
}
.rail-list button.on { background: rgba(197, 160, 89, .14) !important; color: var(--gold-l) !important; }
.rail-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rail-list button svg { opacity: 0; flex-shrink: 0; transition: opacity .2s ease; }
.rail-list button.on svg { opacity: .7; }
[dir="ltr"] .rail-list button svg { transform: rotate(180deg); }

.rail-thumb {
  width: 36px; height: 36px; flex-shrink: 0; border-radius: 9px;
  overflow: hidden; background: rgba(197, 160, 89, .08);
  border: 1px solid rgba(255, 255, 255, .06);
  display: flex; align-items: center; justify-content: center;
}
.rail-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ri { font-size: 1rem; color: var(--gold); font-style: normal; }

.rail-empty { padding: 14px; font-size: .82rem; color: rgba(255, 255, 255, .35); }

.rail-skel { display: flex; flex-direction: column; gap: 8px; padding: 4px 6px; }
.rail-skel span {
  height: 40px; border-radius: 10px;
  background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.08), rgba(255,255,255,.03));
  background-size: 200% 100%; animation: shim 1.3s infinite linear;
}
@keyframes shim { from { background-position: 200% 0; } to { background-position: -200% 0; } }

.rail-err { padding: 14px; display: flex; flex-direction: column; gap: 8px; font-size: .8rem; color: #f87171; }
.rail-err button {
  padding: 6px 12px !important; border-radius: 8px !important;
  background: transparent !important; border: 1px solid var(--gold) !important;
  color: var(--gold) !important; font-size: .78rem; cursor: pointer;
}

.mega-body { padding: 18px 22px; min-width: 0; }
.mega-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
.mega-head-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
.head-thumb {
  width: 34px; height: 34px; flex-shrink: 0; border-radius: 9px;
  overflow: hidden; border: 1px solid rgba(197, 160, 89, .25);
}
.head-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mega-head h3 { margin: 0; font-size: 1rem; color: var(--gold-l); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mega-all {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  padding: 7px 14px !important; border-radius: 999px !important;
  background: rgba(197, 160, 89, .1) !important;
  border: 1px solid rgba(197, 160, 89, .28) !important;
  color: var(--gold-l) !important; font-size: .76rem; font-family: inherit; cursor: pointer;
  transition: background-color .25s ease, color .25s ease;
}
[dir="ltr"] .mega-all svg { transform: rotate(180deg); }

.mega-cols {
  margin-top: 16px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 18px 22px; max-height: 356px; overflow-y: auto;
}
.col-head {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0 !important; margin-bottom: 9px;
  background: none !important; border: none !important;
  color: var(--ink) !important; font-size: .87rem; font-weight: 700;
  font-family: inherit; cursor: pointer; text-align: start;
  transition: color .2s ease;
}
.col-thumb {
  width: 26px; height: 26px; flex-shrink: 0; border-radius: 7px;
  overflow: hidden; background: rgba(197, 160, 89, .1);
  display: flex; align-items: center; justify-content: center;
}
.col-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.col-thumb i { width: 5px; height: 5px; border-radius: 50%; background: var(--gold); }

.col ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.col li button {
  padding: 5px 0 !important;
  background: none !important; border: none !important;
  color: var(--dim) !important; font-size: .81rem; font-family: inherit;
  text-align: start; cursor: pointer;
  transition: color .2s ease, padding .2s ease;
}
.mega-none { padding: 28px 0; font-size: .85rem; color: rgba(255, 255, 255, .35); }

.mega-promo { padding: 16px; display: flex; flex-direction: column; gap: 12px; background: rgba(255, 255, 255, .02); border-inline-start: 1px solid var(--line); }
.promo-card {
  position: relative; flex: 1; min-height: 210px;
  padding: 18px; border-radius: 14px; overflow: hidden;
  background-size: cover; background-position: center;
  display: flex; flex-direction: column; justify-content: flex-end; gap: 10px;
}
.promo-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(4, 6, 14, .94), rgba(4, 6, 14, .3));
}
.promo-tag, .promo-card h4, .promo-card button { position: relative; z-index: 1; }
.promo-tag { font-size: .68rem; color: var(--gold); letter-spacing: .05em; }
.promo-card h4 { margin: 0; font-size: .95rem; line-height: 1.7; }
.promo-card button {
  align-self: flex-start;
  padding: 8px 16px !important; border-radius: 999px !important;
  background: var(--gold) !important; border: none !important;
  color: #0a0a0a !important; font-size: .77rem; font-weight: 700;
  font-family: inherit; cursor: pointer;
}

.promo-mini {
  display: flex; align-items: center; gap: 11px;
  padding: 11px 13px; border-radius: 12px;
  background: rgba(197, 160, 89, .08);
  border: 1px solid rgba(197, 160, 89, .2);
  text-decoration: none; color: var(--ink);
  transition: background-color .25s ease;
}
.promo-mini b {
  width: 34px; height: 34px; flex-shrink: 0; border-radius: 9px;
  background: rgba(197, 160, 89, .2); color: var(--gold);
  display: flex; align-items: center; justify-content: center; font-size: 1rem;
}
.promo-mini span { display: flex; flex-direction: column; min-width: 0; }
.promo-mini strong { font-size: .84rem; }
.promo-mini small { font-size: .7rem; color: var(--dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── transitions ── */
.pop-enter-active { transition: opacity .18s ease, transform .22s cubic-bezier(.16,1,.3,1); }
.pop-leave-active { transition: opacity .14s ease, transform .14s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-8px); }

/* ══════════ MOBILE DRAWER ══════════ */
.drawer {
  position: fixed; inset: 0; height: 100dvh; z-index: 1100;
  pointer-events: none; visibility: hidden;
  transition: visibility 0s linear .38s;
}
.drawer.open { pointer-events: auto; visibility: visible; transition-delay: 0s; }

.drawer-bd {
  position: absolute; inset: 0;
  background: rgba(0, 0, 0, .7);
  opacity: 0; transition: opacity .3s ease;
}
.drawer.open .drawer-bd { opacity: 1; }

.drawer-panel {
  position: absolute; top: 0; bottom: 0; inset-inline-end: 0;
  width: min(86vw, 320px);
  display: flex; flex-direction: column;
  background: #070a14;
  border-inline-start: 1px solid rgba(197, 160, 89, .16);
  box-shadow: -18px 0 50px rgba(0, 0, 0, .6);
  transform: translateX(-100%);
  transition: transform .38s cubic-bezier(.16, 1, .3, 1);
  overflow: hidden;
}
[dir="ltr"] .drawer-panel { transform: translateX(100%); box-shadow: 18px 0 50px rgba(0, 0, 0, .6); }
.drawer.open .drawer-panel { transform: translateX(0); }

.dp-head {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}
.dp-brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
.dp-brand img { width: 30px; height: 30px; object-fit: contain; }
.dp-brand b { font-size: .92rem; color: var(--gold); }
.dp-close {
  width: 34px; height: 34px; flex-shrink: 0;
  padding: 0 !important; border-radius: 9px !important;
  background: rgba(255, 255, 255, .05) !important;
  border: 1px solid var(--line) !important;
  color: var(--ink) !important;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}

/* جستجوی دراور */
.dp-search-wrap { flex: 0 0 auto; padding: 14px 16px 0; }
.dp-search {
  display: flex; align-items: center; gap: 6px;
  height: 44px; padding-inline: 12px 5px;
  border-radius: 12px;
  background: rgba(255, 255, 255, .05);
  border: 1px solid var(--line);
}
.dp-search:focus-within { border-color: rgba(197, 160, 89, .5); }
.dp-search input {
  flex: 1; min-width: 0; height: 100%;
  background: none; border: none; outline: none;
  color: var(--ink); font-size: 16px; font-family: inherit;
}
.dp-search input::placeholder { color: rgba(255, 255, 255, .32); font-size: .86rem; }
.dp-search input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
.dp-search button[type="submit"] {
  width: 34px; height: 34px; flex-shrink: 0;
  padding: 0 !important; border-radius: 9px !important;
  background: rgba(197, 160, 89, .18) !important;
  border: none !important; color: var(--gold) !important;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.dp-clear {
  width: 26px; height: 26px; flex-shrink: 0;
  padding: 0 !important; border-radius: 50% !important;
  background: rgba(255, 255, 255, .07) !important; border: none !important;
  color: var(--dim) !important;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}

.dp-suggest {
  margin-top: 8px; border-radius: 12px; overflow: hidden;
  background: rgba(255, 255, 255, .03);
  border: 1px solid rgba(197, 160, 89, .18);
  max-height: 46vh; overflow-y: auto;
}

/* ناحیهٔ اسکرول */
.dp-scroll {
  flex: 1 1 auto; min-height: 0;
  padding: 14px 16px 10px;
  overflow-y: auto; overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.dp-links { display: flex; flex-direction: column; }
.dp-links a {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, .05);
  color: var(--ink); text-decoration: none; font-size: .92rem;
}
.dp-links a.router-link-active { color: var(--gold-l); }
.dp-links a span { flex: 1; }

.dp-title { margin: 16px 0 6px; font-size: .72rem; letter-spacing: .04em; color: rgba(255, 255, 255, .35); }
.dp-empty { padding: 12px 4px; font-size: .84rem; color: var(--dim); }

.dp-skel { display: flex; flex-direction: column; gap: 8px; }
.dp-skel span {
  height: 44px; border-radius: 10px;
  background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.08), rgba(255,255,255,.03));
  background-size: 200% 100%; animation: shim 1.3s infinite linear;
}
.dp-err { display: flex; flex-direction: column; gap: 8px; padding: 10px 4px; font-size: .82rem; color: #f87171; }
.dp-err button {
  align-self: flex-start;
  padding: 6px 14px !important; border-radius: 8px !important;
  background: transparent !important; border: 1px solid var(--gold) !important;
  color: var(--gold) !important; font-size: .78rem; cursor: pointer;
}

/* آکاردئون دسته‌ها */
.acc { border-bottom: 1px solid rgba(255, 255, 255, .05); }
.acc-head {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 10px 4px !important;
  background: none !important; border: none !important;
  color: var(--ink) !important; font-size: .9rem; font-family: inherit;
  text-align: start; cursor: pointer;
}
.acc.open .acc-head { color: var(--gold-l) !important; }
.acc-thumb {
  width: 34px; height: 34px; flex-shrink: 0; border-radius: 9px;
  overflow: hidden; background: rgba(197, 160, 89, .1);
  border: 1px solid rgba(255, 255, 255, .06);
  display: flex; align-items: center; justify-content: center;
}
.acc-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.acc-ico { font-style: normal; color: var(--gold); font-size: .95rem; }
.acc-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-caret { flex-shrink: 0; opacity: .6; transition: transform .3s ease; }
.acc.open .acc-caret { transform: rotate(180deg); opacity: 1; }

.acc-body {
  display: flex; flex-direction: column;
  padding: 2px 0 10px;
  border-inline-start: 1px solid rgba(197, 160, 89, .18);
  margin-inline-start: 17px;
}
.acc-body button {
  padding: 9px 14px !important;
  background: none !important; border: none !important;
  color: var(--dim) !important; font-size: .85rem; font-family: inherit;
  text-align: start; cursor: pointer;
}
.acc-all { color: var(--gold-l) !important; font-weight: 600 !important; font-size: .82rem !important; }
.acc-l1 { color: var(--ink) !important; }
.acc-l2 { padding-inline-start: 28px !important; font-size: .8rem !important; opacity: .75; }
.acc-l2::before { content: '— '; }

.dp-extra { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.dp-lang {
  padding: 9px 16px !important; border-radius: 999px !important;
  background: rgba(255, 255, 255, .05) !important;
  border: 1px solid var(--line) !important;
  color: var(--ink) !important; font-size: .8rem; font-family: inherit;
  text-decoration: none; cursor: pointer;
}

/* فوتر دراور */
.dp-foot {
  flex: 0 0 auto;
  display: flex; flex-direction: column; gap: 9px;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line);
  background: rgba(255, 255, 255, .02);
}
.dp-btn {
  padding: 12px !important; border-radius: 11px !important; text-align: center;
  background: rgba(255, 255, 255, .07) !important; border: none !important;
  color: var(--ink) !important; text-decoration: none; font-size: .88rem;
  font-weight: 600 !important; font-family: inherit; cursor: pointer;
}
.dp-btn.gold { background: linear-gradient(135deg, var(--gold), #8f7032) !important; color: #0a0a0a !important; font-weight: 700 !important; }
.dp-btn.danger { background: rgba(239, 68, 68, .12) !important; color: #f87171 !important; }

/* ── hover فقط دسکتاپ ── */
@media (hover: hover) and (pointer: fine) {
  .search-go:hover { background: var(--gold) !important; color: #0a0a0a !important; }
  .search-clear:hover { background: rgba(255, 255, 255, .14) !important; color: var(--ink) !important; }
  .lang:hover { background: var(--gold) !important; color: #0a0a0a !important; }
  .ico:hover, .cart-pill:hover, .login:hover { background: rgba(197, 160, 89, .22); border-color: rgba(197, 160, 89, .5); color: var(--gold-l); }
  .user-pop a:hover, .user-pop button:hover { background: rgba(255, 255, 255, .06) !important; }
  .mega-btn:hover { background: var(--gold) !important; color: #0a0a0a !important; }
  .nav-links a:hover { color: var(--gold-l); background: rgba(255, 255, 255, .04); }
  .rail-list button:hover { background: rgba(255, 255, 255, .05) !important; color: var(--ink) !important; }
  .mega-all:hover { background: var(--gold) !important; color: #0a0a0a !important; }
  .col-head:hover { color: var(--gold-l) !important; }
  .col li button:hover { color: var(--gold-l) !important; padding-inline-start: 6px !important; }
  .promo-mini:hover { background: rgba(197, 160, 89, .16); }
  .suggest-all:hover { background: var(--gold) !important; color: #0a0a0a !important; }
  .suggest-head button:hover { color: var(--ink) !important; }
}

/* حالت لمسی */
@media (hover: none) {
  .dp-links a:active, .acc-head:active, .acc-body button:active, .suggest-item:active {
    background: rgba(255, 255, 255, .05) !important;
  }
}

/* ── responsive ── */
@media (min-width: 1025px) {
  .drawer { display: none; }
}

@media (max-width: 1180px) {
  .mega { grid-template-columns: 220px minmax(0, 1fr); }
  .mega-promo { display: none; }
  .guarantee { display: none; }
}

@media (max-width: 1024px) {
  .nav-bar { display: none; }
  .nav-top { gap: 10px; }
  .brand-txt { display: none; }
  .search-wrap { display: none; }
  .lang, .ico, .user-wrap, .login { display: none; }
  .cart-label { display: none; }
  .cart-pill { width: 38px; padding: 0; justify-content: center; }
  .msearch { display: flex; }
  .burger { display: flex; }
}

@media (prefers-reduced-motion: reduce) {
  .mega, .pop-enter-active, .pop-leave-active,
  .drawer-panel, .drawer-bd, .caret, .acc-caret { transition-duration: .01ms !important; }
  .rail-skel span, .dp-skel span, .suggest-skel span { animation: none; }
}
</style>
