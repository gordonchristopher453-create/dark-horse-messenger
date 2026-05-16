import { useEffect, useState } from 'react'
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

// PWA Install prompt
let deferredPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  console.log('✅ PWA install prompt ready')
})

const installApp = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log('PWA install outcome:', outcome)
    deferredPrompt = null
  }
}

export { installApp }

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

const setupNotifications = async () => {
  try {
    if (!('Notification' in window)) return
    if (!('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied') return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.ready

    const { initializeApp, getApps } = await import('firebase/app')
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging')

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    const messaging = getMessaging(app)

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    })

    if (token) {
      await api.put('/users/fcm-token', { fcmToken: token })
      console.log('✅ FCM token saved')

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
    console.log('Notification setup failed (non-critical):', error.message)
  }
}

function App() {
  const dispatch = useDispatch()
  const { accessToken, user } = useSelector(state => state.auth)
  const [showInstall, setShowInstall] = useState(false)

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
      setTimeout(setupNotifications, 3000)
    }
  }, [user, accessToken])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (deferredPrompt) setShowInstall(true)
    }, 10000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showInstall && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%',
          transform: 'translateX(-50%)', zIndex: 9999,
          background: 'var(--accent)', color: '#fff',
          padding: '12px 20px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
          fontSize: '14px', fontWeight: 600
        }}>
          <span>📲 Install Dark Horse App</span>
          <button onClick={() => { installApp(); setShowInstall(false) }}
            style={{
              background: '#fff', color: 'var(--accent)',
              border: 'none', borderRadius: '8px',
              padding: '6px 12px', fontWeight: 700,
              cursor: 'pointer', fontSize: '13px'
            }}>
            Install
          </button>
          <button onClick={() => setShowInstall(false)}
            style={{
              background: 'none', border: 'none',
              color: '#fff', cursor: 'pointer', fontSize: '18px'
            }}>
            ✕
          </button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/join/:inviteCode" element={<JoinGroupPage />} />
        <Route path="/join/:inviteCode" element={<ProtectedRoute><JoinGroupPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
