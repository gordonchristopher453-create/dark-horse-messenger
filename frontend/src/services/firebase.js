import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyA9dA2Rg09FxDGXRDzODpxabgFegbDnpBM",
  authDomain: "dark-horse-messenger-77525.firebaseapp.com",
  projectId: "dark-horse-messenger-77525",
  storageBucket: "dark-horse-messenger-77525.firebasestorage.app",
  messagingSenderId: "925647798610",
  appId: "1:925647798610:web:eaadef472e7f42db7d7a8b"
}

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

const VAPID_KEY = 'BE5qII9CWHu3S8lWwnyZNafZSJ7fxp2A2xjp0t-YxOZIIL8x4fgIKwIErTkE4IX-rLAIGam5diYuzsBTbkp0uOc'

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return null
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (token) {
      console.log('✅ FCM Token:', token)
      return token
    }
  } catch (error) {
    console.error('❌ FCM Token error:', error)
    return null
  }
}

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (callback) => {
  return onMessage(messaging, (payload) => {
    console.log('📩 Foreground message:', payload)
    callback(payload)
  })
}

export { messaging }
