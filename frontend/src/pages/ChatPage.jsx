import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchChats, updateChatLastMessage, addChat, setActiveChat } from '../store/slices/chatSlice'
import { getSocket } from '../services/socket'
import { addMessage, updateMessage , markMessageRead } from '../store/slices/messageSlice'
import { setTypingUser } from '../store/slices/uiSlice'
import Sidebar from '../components/chat/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import WelcomeScreen from '../components/chat/WelcomeScreen'

const ChatPage = () => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)
  const { user } = useSelector(state => state.auth)
  const { messages } = useSelector(state => state.message)
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

    // New message received
    socket.on('message:receive', ({ message, chatId }) => {
      dispatch(addMessage({ chatId, message }))
      dispatch(updateChatLastMessage({ chatId, message }))
      dispatch(fetchChats())

      // Auto mark as read if chat is open
      if (activeChat?._id === chatId) {
        socket.emit('message:read', { chatId, messageIds: [message._id] })
      }
    })

    socket.on('message:read', ({ chatId, messageIds, readBy, readAt }) => {
      messageIds.forEach(messageId => {
        dispatch(markMessageRead({ chatId, messageId, readBy, readAt }))
      })
    })

    socket.on('typing:start', ({ userId, chatId }) => {
      dispatch(setTypingUser({ chatId, userId, isTyping: true }))
    })

    socket.on('typing:stop', ({ userId, chatId }) => {
      dispatch(setTypingUser({ chatId, userId, isTyping: false }))
    })

    socket.on('chat:new', (chat) => dispatch(addChat(chat)))

    // ✅ FIX — update message when deleted by other person
    socket.on('message:deleted', ({ messageId, chatId }) => {
      const msg = messages[chatId]?.find(m => m._id === messageId)
      if (msg) {
        dispatch(updateMessage({
          chatId,
          message: { ...msg, isDeleted: true, content: 'This message was deleted' }
        }))
      }
    })

    return () => {
      socket.off('message:receive')
      socket.off('message:read')
      socket.off('typing:start')
      socket.off('typing:stop')
      socket.off('chat:new')
      socket.off('message:deleted')
    }
  }, [activeChat, messages])

  // ✅ FIX — mark messages as read instantly when opening a chat
  useEffect(() => {
    if (!activeChat?._id) return
    const socket = getSocket()
    if (!socket) return

    const chatMessages = messages[activeChat._id] || []
    const unreadIds = chatMessages
      .filter(m => {
        const isOwn = m.sender?._id === user?._id || m.sender === user?._id
        const isRead = m.readBy?.some(r => r.user === user?._id || r.user?._id === user?._id)
        return !isOwn && !isRead && !m.isDeleted
      })
      .map(m => m._id)

    if (unreadIds.length > 0) {
      socket.emit('message:read', { chatId: activeChat._id, messageIds: unreadIds })
      // Refresh chats to clear unread badge immediately
      dispatch(fetchChats())
    }
  }, [activeChat?._id])

  const handleBack = () => dispatch(setActiveChat(null))

  if (isMobile) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
        {activeChat ? <ChatWindow onBack={handleBack} /> : <Sidebar />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <Sidebar />
      {activeChat ? <ChatWindow onBack={handleBack} /> : <WelcomeScreen />}
    </div>
  )
}

export default ChatPage
