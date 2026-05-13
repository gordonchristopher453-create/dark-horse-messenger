importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyA9dA2Rg09FxDGXRDzODpxabgFegbDnpBM",
  authDomain: "dark-horse-messenger-77525.firebaseapp.com",
  projectId: "dark-horse-messenger-77525",
  storageBucket: "dark-horse-messenger-77525.firebasestorage.app",
  messagingSenderId: "925647798610",
  appId: "1:925647798610:web:eaadef472e7f42db7d7a8b"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload)
  const { title, body } = payload.notification
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: payload.data
  })
})
