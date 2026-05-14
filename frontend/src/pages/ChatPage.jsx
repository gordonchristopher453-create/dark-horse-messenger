import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchChats, updateChatLastMessage, addChat } from '../store/slices/chatSlice'
import { getSocket } from '../services/socket'
import { addMessage } from '../store/slices/messageSlice'
import { setTypingUser } from '../store/slices/uiSlice'
import { setActiveChat } from '../store/slices/chatSlice'
import Sidebar from '../components/chat/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import WelcomeScreen from '../components/chat/WelcomeScreen'

const ChatPage = () => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    dispatch(fetchChats())
    const interval = setInterval(() => dispatch(fetchChats()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socket.on('message:receive', ({ message, chatId }) => {
      dispatch(addMessage({ chatId, message }))
      dispatch(updateChatLastMessage({ chatId, message }))
      dispatch(fetchChats())
    })

    socket.on('typing:start', ({ userId, chatId }) => {
      dispatch(setTypingUser({ chatId, userId, isTyping: true }))
    })

    socket.on('typing:stop', ({ userId, chatId }) => {
      dispatch(setTypingUser({ chatId, userId, isTyping: false }))
    })

    socket.on('chat:new', (chat) => dispatch(addChat(chat)))

    return () => {
      socket.off('message:receive')
      socket.off('typing:start')
      socket.off('typing:stop')
      socket.off('chat:new')
    }
  }, [])

  const handleBack = () => dispatch(setActiveChat(null))

  // Mobile layout - show one screen at a time
  if (isMobile) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
        {activeChat ? (
          <ChatWindow onBack={handleBack} />
        ) : (
          <Sidebar />
        )}
      </div>
    )
  }

  // Desktop layout - side by side
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <Sidebar />
      {activeChat ? <ChatWindow /> : <WelcomeScreen />}
    </div>
  )
}

export default ChatPage
