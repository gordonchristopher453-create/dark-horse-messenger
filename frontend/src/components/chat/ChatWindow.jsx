import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMessages, sendMessage } from '../../store/slices/messageSlice'
import { updateChatLastMessage } from '../../store/slices/chatSlice'
import { getSocket } from '../../services/socket'
import Avatar from '../ui/Avatar'
import Message from './Message'
import { FiSend, FiSmile, FiArrowLeft, FiX } from 'react-icons/fi'
import { MdMic, MdAttachFile, MdStop } from 'react-icons/md'
import toast from 'react-hot-toast'

const ChatWindow = ({ onBack }) => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)
  const { user } = useSelector(state => state.auth)
  const { messages, loading } = useSelector(state => state.message)
  const { typingUsers } = useSelector(state => state.ui)
  const [text, setText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingMessages, setPendingMessages] = useState([])
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const audioChunksRef = useRef([])
  const chatMessages = messages[activeChat?._id] || []
  const typingInChat = typingUsers[activeChat?._id] || []

  // Online/offline detection
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      toast.success('Back online! Sending queued messages...')
      // Send queued messages
      const queue = JSON.parse(localStorage.getItem('messageQueue') || '[]')
      const chatQueue = queue.filter(m => m.chatId === activeChat?._id)
      for (const msg of chatQueue) {
        await dispatch(sendMessage({ chatId: msg.chatId, formData: { content: msg.content, type: 'text' } }))
      }
      // Clear queue for this chat
      const remaining = queue.filter(m => m.chatId !== activeChat?._id)
      localStorage.setItem('messageQueue', JSON.stringify(remaining))
      setPendingMessages([])
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.error('You are offline. Messages will be sent when reconnected.')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [activeChat?._id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (activeChat?._id) dispatch(fetchMessages({ chatId: activeChat._id }))
  }, [activeChat?._id])

  useEffect(() => {
    if (activeChat?._id) {
      const socket = getSocket()
      if (socket) {
        const unreadIds = chatMessages
          .filter(m => {
            const isOwn = m.sender?._id === user?._id || m.sender === user?._id
            const isRead = m.readBy?.some(r => r.user === user?._id || r.user?._id === user?._id)
            return !isOwn && !isRead
          }).map(m => m._id)
        if (unreadIds.length > 0) socket.emit('message:read', { chatId: activeChat._id, messageIds: unreadIds })
      }
    }
  }, [activeChat?._id, chatMessages.length])

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
    if (socket) socket.emit('typing:stop', { chatId: activeChat._id })
    setIsTyping(false)
    const messageText = text.trim()
    setText('')

    // Queue message if offline
    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('messageQueue') || '[]')
      const pendingMsg = { chatId: activeChat._id, content: messageText, timestamp: Date.now(), id: Date.now() }
      queue.push(pendingMsg)
      localStorage.setItem('messageQueue', JSON.stringify(queue))
      setPendingMessages(prev => [...prev, pendingMsg])
      toast('Message queued — will send when online', { icon: '⏳' })
      return
    }

    const result = await dispatch(sendMessage({
      chatId: activeChat._id,
      formData: { content: messageText, type: 'text' }
    }))
    if (result.payload) {
      dispatch(updateChatLastMessage({ chatId: activeChat._id, message: result.payload }))
      if (socket) socket.emit('message:send', {
        chatId: activeChat._id, content: messageText,
        type: 'text', messageId: result.payload._id
      })
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('File too large. Maximum 50MB'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('media', file)
      let type = 'document'
      if (file.type.startsWith('image/')) type = 'image'
      else if (file.type.startsWith('video/')) type = 'video'
      else if (file.type.startsWith('audio/')) type = 'audio'
      formData.append('type', type)
      const result = await dispatch(sendMessage({ chatId: activeChat._id, formData }))
      if (result.payload) {
        dispatch(updateChatLastMessage({ chatId: activeChat._id, message: result.payload }))
        const socket = getSocket()
        if (socket) socket.emit('message:send', { chatId: activeChat._id, type, messageId: result.payload._id })
        toast.success('File sent!')
      }
    } catch { toast.error('Failed to send file') }
    finally { setUploading(false); e.target.value = '' }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        if (audioBlob.size > 0) {
          setUploading(true)
          try {
            const formData = new FormData()
            formData.append('media', audioBlob, 'voice-note.webm')
            formData.append('type', 'voice')
            const result = await dispatch(sendMessage({ chatId: activeChat._id, formData }))
            if (result.payload) {
              dispatch(updateChatLastMessage({ chatId: activeChat._id, message: result.payload }))
              const socket = getSocket()
              if (socket) socket.emit('message:send', { chatId: activeChat._id, type: 'voice', messageId: result.payload._id })
              toast.success('Voice note sent!')
            }
          } catch { toast.error('Failed to send voice note') }
          finally { setUploading(false) }
        }
      }
      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => { if (prev >= 60) { stopRecording(); return 0 } return prev + 1 })
      }, 1000)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      clearInterval(recordingTimerRef.current)
      setRecordingTime(0)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      setRecording(false)
      clearInterval(recordingTimerRef.current)
      setRecordingTime(0)
      audioChunksRef.current = []
    }
  }

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Offline Banner */}
      {!isOnline && (
        <div style={{ background: '#f59e0b', color: '#000', padding: '6px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
          ⚠️ You are offline — messages will be queued
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '22px', display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer', flexShrink: 0 }}>
            <FiArrowLeft />
          </button>
        )}
        <Avatar src={getChatAvatar()} name={getChatName()} size={40} online={isOtherOnline()} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getChatName()}</p>
          <p style={{ fontSize: '12px', color: typingInChat.length > 0 ? 'var(--accent-light)' : isOtherOnline() ? 'var(--success)' : 'var(--text-muted)' }}>
            {typingInChat.length > 0 ? 'typing...' : isOtherOnline() ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>Loading...</p>}
        {!loading && chatMessages.length === 0 && pendingMessages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.6 }}>
            <p style={{ fontSize: '32px' }}>👋</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Say hello to {getChatName()}!</p>
          </div>
        )}
        {chatMessages.map((msg, idx) => (
          <Message key={msg._id} message={msg}
            isOwn={msg.sender?._id === user?._id || msg.sender === user?._id}
            showAvatar={!activeChat?.isGroup ? false : idx === 0 || chatMessages[idx-1]?.sender?._id !== msg.sender?._id}
          />
        ))}
        {/* Pending/queued messages */}
        {pendingMessages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
            <div style={{ background: 'var(--sent-bubble)', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', maxWidth: '65%', opacity: 0.6 }}>
              <p style={{ fontSize: '14px', color: '#fff' }}>{msg.content}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>⏳ Queued</span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Recording UI */}
      {recording && (
        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={cancelRecording} style={{ background: 'var(--danger)', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontSize: '18px', display: 'flex', alignItems: 'center' }}><FiX /></button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1s infinite' }} />
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Recording... {formatTime(recordingTime)}</p>
          </div>
          <button onClick={stopRecording} style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontSize: '18px', display: 'flex', alignItems: 'center' }}>
            <MdStop />
          </button>
        </div>
      )}

      {/* Input */}
      {!recording && (
        <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '10px', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <MdAttachFile />
          </button>
          <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: '24px', border: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            <textarea value={text} onChange={handleTyping} onKeyDown={handleKeyPress}
              placeholder={isOnline ? "Type a message..." : "Offline - message will be queued..."}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '15px', resize: 'none', maxHeight: '100px', lineHeight: '1.4', fontFamily: 'inherit' }}
            />
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', display: 'flex', alignItems: 'center' }}>
              <FiSmile />
            </button>
          </div>
          {text.trim() ? (
            <button onClick={handleSend} style={{ background: isOnline ? 'var(--accent)' : '#666', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <FiSend />
            </button>
          ) : (
            <button onMouseDown={startRecording} onTouchStart={startRecording}
              style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '10px', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <MdMic />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ChatWindow
