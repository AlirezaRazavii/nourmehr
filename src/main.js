import { createApp } from 'vue'
import { createPinia } from 'pinia'
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

  app.mount('#app')

  const splash = document.getElementById('app-splash')
  if (splash) splash.remove()
}

bootstrap()
