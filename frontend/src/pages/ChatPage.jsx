import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchChats, updateChatLastMessage, addChat } from '../store/slices/chatSlice'
import { getSocket } from '../services/socket'
import { addMessage } from '../store/slices/messageSlice'
import { setTypingUser } from '../store/slices/uiSlice'
import Sidebar from '../components/chat/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import WelcomeScreen from '../components/chat/WelcomeScreen'

const ChatPage = () => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)

  useEffect(() => {
    // Load chats on mount
    dispatch(fetchChats())

    // Auto refresh chats every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchChats())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Receive new message
    socket.on('message:receive', ({ message, chatId }) => {
      dispatch(addMessage({ chatId, message }))
      dispatch(updateChatLastMessage({ chatId, message }))
      // Refresh chat list to update order
      dispatch(fetchChats())
    })

    // Typing indicators
    socket.on('typing:start', ({ userId, chatId }) => {
      dispatch(setTypingUser({ chatId, userId, isTyping: true }))
    })

    socket.on('typing:stop', ({ userId, chatId }) => {
      dispatch(setTypingUser({ chatId, userId, isTyping: false }))
    })

    // New chat created
    socket.on('chat:new', (chat) => {
      dispatch(addChat(chat))
    })

    return () => {
      socket.off('message:receive')
      socket.off('typing:start')
      socket.off('typing:stop')
      socket.off('chat:new')
    }
  }, [])

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg-primary)', overflow: 'hidden'
    }}>
      <Sidebar />
      {activeChat ? <ChatWindow /> : <WelcomeScreen />}
    </div>
  )
}

export default ChatPage
