import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchChats } from '../store/slices/chatSlice'
import { getSocket } from '../services/socket'
import { addMessage } from '../store/slices/messageSlice'
import { updateChatLastMessage } from '../store/slices/chatSlice'
import { setTypingUser } from '../store/slices/uiSlice'
import Sidebar from '../components/chat/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import WelcomeScreen from '../components/chat/WelcomeScreen'

const ChatPage = () => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)

  useEffect(() => {
    dispatch(fetchChats())
  }, [])

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Receive message
    socket.on('message:receive', ({ message, chatId }) => {
      dispatch(addMessage({ chatId, message }))
      dispatch(updateChatLastMessage({ chatId, message }))
    })

    // Typing indicators
    socket.on('typing:start', ({ userId, chatId }) => {
      dispatch(setTypingUser({ chatId, userId, isTyping: true }))
    })

    socket.on('typing:stop', ({ userId, chatId }) => {
      dispatch(setTypingUser({ chatId, userId, isTyping: false }))
    })

    return () => {
      socket.off('message:receive')
      socket.off('typing:start')
      socket.off('typing:stop')
    }
  }, [])

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      <Sidebar />
      {activeChat ? <ChatWindow /> : <WelcomeScreen />}
    </div>
  )
}

export default ChatPage
