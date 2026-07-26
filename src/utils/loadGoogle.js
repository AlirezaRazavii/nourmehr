let googlePromise = null

export const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (googlePromise) return googlePromise

  googlePromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve(window.google)
    s.onerror = () => { googlePromise = null; reject(new Error('بارگذاری سرویس گوگل ناموفق بود')) }
    document.head.appendChild(s)
  })
  return googlePromise
}
