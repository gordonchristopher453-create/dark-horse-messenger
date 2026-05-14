import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getMe } from './store/slices/authSlice'
import { initSocket } from './services/socket'
import api from './services/api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import LoadingScreen from './components/ui/LoadingScreen'

const ProtectedRoute = ({ children }) => {
  const { user, initialized } = useSelector(state => state.auth)
  if (!initialized) return <LoadingScreen />
  return user ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user, initialized } = useSelector(state => state.auth)
  if (!initialized) return <LoadingScreen />
  return !user ? children : <Navigate to="/" replace />
}

// Safe notification setup - won't crash app if it fails
const setupNotifications = async () => {
  try {
    if (!('Notification' in window)) return
    if (!('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied') return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.ready
    console.log('✅ Service worker ready for notifications')

    // Try to get FCM token
    try {
      const { initializeApp, getApps } = await import('firebase/app')
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging')

      const firebaseConfig = {
        apiKey: "AIzaSyA9dA2Rg09FxDGXRDzODpxabgFegbDnpBM",
        authDomain: "dark-horse-messenger-77525.firebaseapp.com",
        projectId: "dark-horse-messenger-77525",
        storageBucket: "dark-horse-messenger-77525.firebasestorage.app",
        messagingSenderId: "925647798610",
        appId: "1:925647798610:web:eaadef472e7f42db7d7a8b"
      }

      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
      const messaging = getMessaging(app)

      const token = await getToken(messaging, {
        vapidKey: 'BE5qII9CWHu3S8lWwnyZNafZSJ7fxp2A2xjp0t-YxOZIIL8x4fgIKwIErTkE4IX-rLAIGam5diYuzsBTbkp0uOc',
        serviceWorkerRegistration: registration
      })

      if (token) {
        await api.put('/users/fcm-token', { fcmToken: token })
        console.log('✅ FCM token saved')
      }
    } catch (fcmError) {
      console.log('FCM setup failed (non-critical):', fcmError.message)
    }
  } catch (error) {
    console.log('Notification setup failed (non-critical):', error.message)
  }
}

function App() {
  const dispatch = useDispatch()
  const { accessToken, user } = useSelector(state => state.auth)

  useEffect(() => {
    if (accessToken) {
      dispatch(getMe())
    } else {
      dispatch({ type: 'auth/getMe/rejected' })
    }
  }, [])

  useEffect(() => {
    if (user && accessToken) {
      initSocket(accessToken)
      // Setup notifications after 5 seconds
      setTimeout(setupNotifications, 5000)
    }
  }, [user, accessToken])

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
