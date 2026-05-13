import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getMe } from './store/slices/authSlice'
import { initSocket } from './services/socket'
import { requestNotificationPermission, onForegroundMessage } from './services/firebase'
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

      // Request notification permission
      requestNotificationPermission().then(async (token) => {
        if (token) {
          try {
            await api.put('/users/fcm-token', { fcmToken: token })
            console.log('✅ FCM token saved')
          } catch (error) {
            console.error('FCM token save error:', error)
          }
        }
      })

      // Listen for foreground notifications
      onForegroundMessage((payload) => {
        const { title, body } = payload.notification || {}
        if (title) {
          toast(
            `💬 ${title}: ${body}`,
            {
              duration: 4000,
              style: {
                background: '#1a1a28',
                color: '#f0f0f5',
                border: '1px solid #7c3aed'
              }
            }
          )
        }
      })
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
