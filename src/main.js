import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import App from './App.vue'
import router from './router'
import i18n, { getSavedLocale, loadLocaleMessages } from './i18n'
import './assests/main.css'

async function bootstrap() {
  try {
    await loadLocaleMessages(getSavedLocale())
  } catch (e) {}

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)
  app.use(i18n)
  app.use(createHead())

  app.mount('#app')

  const splash = document.getElementById('app-splash')
  if (splash) splash.remove()
}

// Matomo Analytics
window._paq = window._paq || [];

window._paq.push(['setTrackerUrl', 'https://analytics.nourmehr.ir/matomo.php']);
window._paq.push(['setSiteId', '1']);
window._paq.push(['enableLinkTracking']);
window._paq.push(['enableHeartBeatTimer']);

(function () {
  const u = 'https://analytics.nourmehr.ir/';
  const d = document;
  const g = d.createElement('script');
  const s = d.getElementsByTagName('script')[0];

  g.async = true;
  g.src = u + 'matomo.js';
  s.parentNode.insertBefore(g, s);
})();

bootstrap()
