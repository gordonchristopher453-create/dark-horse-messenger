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
import toast from 'react-hot-toast'

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

const saveFcmToken = async (token) => {
  try {
    await api.put('/users/fcm-token', { fcmToken: token })
    console.log('✅ FCM token saved')
  } catch (error) {
    console.error('FCM token save error:', error)
    // Retry after 5 seconds
    setTimeout(() => saveFcmToken(token), 5000)
  }
}

const requestNotifications = async () => {
  try {
    if (!('Notification' in window)) return
    if (!('serviceWorker' in navigator)) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    // Wait for service worker
    const registration = await navigator.serviceWorker.ready

    // Dynamically import firebase
    const { getMessaging, getToken } = await import('firebase/messaging')
    const { initializeApp } = await import('firebase/app')

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

    const token = await getToken(messaging, {
      vapidKey: 'BE5qII9CWHu3S8lWwnyZNafZSJ7fxp2A2xjp0t-YxOZIIL8x4fgIKwIErTkE4IX-rLAIGam5diYuzsBTbkp0uOc',
      serviceWorkerRegistration: registration
    })

    if (token) {
      console.log('✅ FCM Token:', token)
      await saveFcmToken(token)

      // Listen for foreground messages
      const { onMessage } = await import('firebase/messaging')
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {}
        if (title) {
          toast(`💬 ${title}: ${body}`, {
            duration: 4000,
            style: {
              background: '#1a1a28',
              color: '#f0f0f5',
              border: '1px solid #7c3aed'
            }
          })
        }
      })
    }
  } catch (error) {
    console.error('Notification setup error:', error)
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
      // Request notifications after 3 seconds
      setTimeout(requestNotifications, 3000)
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
