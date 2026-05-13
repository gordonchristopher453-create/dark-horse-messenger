import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMessages, sendMessage, addMessage } from '../../store/slices/messageSlice'
import { updateChatLastMessage } from '../../store/slices/chatSlice'
import { getSocket } from '../../services/socket'
import Avatar from '../ui/Avatar'
import Message from './Message'
import { FiSend, FiPaperclip, FiSmile, FiArrowLeft, FiPhone, FiVideo } from 'react-icons/fi'
import { MdMic } from 'react-icons/md'

const ChatWindow = () => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)
  const { user } = useSelector(state => state.auth)
  const { messages, loading } = useSelector(state => state.message)
  const { typingUsers } = useSelector(state => state.ui)
  const [text, setText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const chatMessages = messages[activeChat?._id] || []
  const typingInChat = typingUsers[activeChat?._id] || []

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Load messages
  useEffect(() => {
    if (activeChat?._id) {
      dispatch(fetchMessages({ chatId: activeChat._id }))
    }
  }, [activeChat?._id])

  const getChatName = () => {
    if (!activeChat) return ''
    if (activeChat.isGroup) return activeChat.groupName
    const other = activeChat.members?.find(m => m._id !== user?._id)
    return other?.displayName || 'Unknown'
  }

  const getChatAvatar = () => {
    if (!activeChat) return ''
    if (activeChat.isGroup) return activeChat.groupImage
    const other = activeChat.members?.find(m => m._id !== user?._id)
    return other?.avatar
  }

  const isOtherOnline = () => {
    if (!activeChat || activeChat.isGroup) return false
    const other = activeChat.members?.find(m => m._id !== user?._id)
    return other?.isOnline
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    const socket = getSocket()
    if (!socket) return

    if (!isTyping) {
      setIsTyping(true)
      socket.emit('typing:start', { chatId: activeChat._id })
    }

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socket.emit('typing:stop', { chatId: activeChat._id })
    }, 1500)
  }

  const handleSend = async () => {
    if (!text.trim()) return
    const socket = getSocket()

    // Stop typing
    if (socket) socket.emit('typing:stop', { chatId: activeChat._id })
    setIsTyping(false)

    const messageText = text.trim()
    setText('')

    // Send via socket for realtime
    if (socket) {
      socket.emit('message:send', {
        chatId: activeChat._id,
        content: messageText,
        type: 'text'
      })
    }

    // Also send via API for persistence
    const result = await dispatch(sendMessage({
      chatId: activeChat._id,
      formData: { content: messageText, type: 'text' }
    }))

    if (result.payload) {
      dispatch(updateChatLastMessage({
        chatId: activeChat._id,
        message: result.payload
      }))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '12px 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            src={getChatAvatar()}
            name={getChatName()}
            size={42}
            online={isOtherOnline()}
          />
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px' }}>
              {getChatName()}
            </p>
            <p style={{ fontSize: '12px', color: typingInChat.length > 0 ? 'var(--accent-light)' : 'var(--text-muted)' }}>
              {typingInChat.length > 0
                ? 'typing...'
                : isOtherOnline() ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[FiPhone, FiVideo].map((Icon, i) => (
            <button key={i} style={{
              background: 'var(--bg-tertiary)', border: 'none',
              color: 'var(--text-secondary)', padding: '8px',
              borderRadius: '10px', fontSize: '17px',
              display: 'flex', alignItems: 'center'
            }}>
              <Icon />
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column',
        gap: '4px'
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Loading messages...
            </p>
          </div>
        )}

        {!loading && chatMessages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '8px', opacity: 0.6
          }}>
            <p style={{ fontSize: '32px' }}>👋</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Say hello to {getChatName()}!
            </p>
          </div>
        )}

        {chatMessages.map((msg, idx) => (
          <Message
            key={msg._id}
            message={msg}
            isOwn={msg.sender?._id === user?._id || msg.sender === user?._id}
            showAvatar={
              !activeChat?.isGroup ? false :
              idx === 0 || chatMessages[idx-1]?.sender?._id !== msg.sender?._id
            }
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-end',
        gap: '10px', flexShrink: 0
      }}>
        {/* Attachment */}
        <button style={{
          background: 'var(--bg-tertiary)', border: 'none',
          color: 'var(--text-secondary)', padding: '10px',
          borderRadius: '12px', fontSize: '18px',
          display: 'flex', alignItems: 'center', flexShrink: 0
        }}>
          <FiPaperclip />
        </button>

        {/* Text Input */}
        <div style={{
          flex: 1, background: 'var(--bg-tertiary)',
          borderRadius: '16px', border: '1px solid var(--border)',
          padding: '10px 16px', display: 'flex', alignItems: 'center'
        }}>
          <textarea
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex: 1, background: 'transparent',
              border: 'none', color: 'var(--text-primary)',
              fontSize: '14px', resize: 'none',
              maxHeight: '120px', lineHeight: '1.5',
              fontFamily: 'inherit'
            }}
          />
          <button style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '18px',
            display: 'flex', alignItems: 'center', padding: '0 0 0 8px'
          }}>
            <FiSmile />
          </button>
        </div>

        {/* Send / Mic Button */}
        {text.trim() ? (
          <button
            onClick={handleSend}
            style={{
              background: 'var(--accent)', border: 'none',
              color: '#fff', padding: '10px',
              borderRadius: '12px', fontSize: '18px',
              display: 'flex', alignItems: 'center',
              flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.4)'
            }}>
            <FiSend />
          </button>
        ) : (
          <button style={{
            background: 'var(--bg-tertiary)', border: 'none',
            color: 'var(--text-secondary)', padding: '10px',
            borderRadius: '12px', fontSize: '18px',
            display: 'flex', alignItems: 'center', flexShrink: 0
          }}>
            <MdMic />
          </button>
        )}
      </div>
    </div>
  )
}

export default ChatWindow
