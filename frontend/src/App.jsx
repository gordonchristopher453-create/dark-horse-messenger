import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getMe } from './store/slices/authSlice'
import { initSocket } from './services/socket'
import api from './services/api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import LoadingScreen from './components/ui/LoadingScreen'
import toast from 'react-hot-toast'

let deferredPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
})

export const installApp = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
  }
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
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {}
        if (title) toast(`💬 ${title}: ${body}`, { duration: 4000, style: { background: '#1a1a28', color: '#f0f0f5', border: '1px solid #7c3aed' } })
      })
    }
  } catch (error) {
    console.log('Notification setup failed:', error.message)
  }
}

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

  // Handle Android back button - don't close app
  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault()
      // Push state back so app doesn't close
      window.history.pushState(null, '', window.location.href)
    }
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { if (deferredPrompt) setShowInstall(true) }, 15000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showInstall && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'var(--accent)', color: '#fff', padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(124,58,237,0.5)', fontSize: '14px', fontWeight: 600 }}>
          <span>📲 Install Dark Horse</span>
          <button onClick={() => { installApp(); setShowInstall(false) }} style={{ background: '#fff', color: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '6px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Install</button>
          <button onClick={() => setShowInstall(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
