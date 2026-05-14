import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getMe } from './store/slices/authSlice'
import { initSocket } from './services/socket'
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
