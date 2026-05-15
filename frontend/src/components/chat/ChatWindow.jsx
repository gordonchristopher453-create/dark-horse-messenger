import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMessages, sendMessage } from '../../store/slices/messageSlice'
import { getSocket } from '../../services/socket'
import Message from './Message'
import EmojiPicker from './EmojiPicker'
import Avatar from '../ui/Avatar'
import { FiSend, FiSmile, FiArrowLeft, FiX, FiImage, FiFile } from 'react-icons/fi'
import { MdMic, MdStop } from 'react-icons/md'
import toast from 'react-hot-toast'

const ChatWindow = ({ onBack }) => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)
  const { messages } = useSelector(state => state.messages)
  const { user } = useSelector(state => state.auth)
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [previewFile, setPreviewFile] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const [recording, setRecording] = useState(false)

  const chatMessages = messages[activeChat?._id] || []

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success('Back online') }
    const handleOffline = () => { setIsOnline(false); toast.error('You are offline') }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
    if (!text.trim() && !previewFile) return
    if (!isOnline) {
      const queue = JSON.parse(localStorage.getItem('messageQueue') || '[]')
      queue.push({ chatId: activeChat._id, content: text, timestamp: Date.now() })
      localStorage.setItem('messageQueue', JSON.stringify(queue))
      setText('')
      toast('Message queued — will send when online')
      return
    }
    try {
      const formData = new FormData()
      if (previewFile) {
        formData.append('file', previewFile.file)
        formData.append('type', previewFile.type)
        if (text.trim()) formData.append('content', text)
        setPreviewFile(null)
      } else {
        formData.append('content', text)
        formData.append('type', 'text')
      }
      setText('')
      await dispatch(sendMessage({ chatId: activeChat._id, formData }))
    } catch { toast.error('Failed to send message') }
  }

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) return toast.error('File must be less than 20MB')
    const url = URL.createObjectURL(file)
    setPreviewFile({ file, url, type, name: file.name })
    e.target.value = ''
  }

  const handleVoice = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []
      recorder.ondataavailable = e => chunks.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'voice')
        stream.getTracks().forEach(t => t.stop())
        await dispatch(sendMessage({ chatId: activeChat._id, formData }))
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch { toast.error('Microphone access denied') }
  }

  if (!activeChat) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <FiArrowLeft />
        </button>
        <Avatar src={getChatAvatar()} name={getChatName()} size={38} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: '15px' }}>{getChatName()}</p>
          <p style={{ fontSize: '12px', color: isOtherOnline() ? '#22c55e' : 'var(--text-muted)' }}>
            {isOtherOnline() ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* File Preview */}
      {previewFile && (
        <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {previewFile.type === 'image' ? (
            <img src={previewFile.url} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '28px' }}>📄</span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{previewFile.name}</span>
            </div>
          )}
          <button onClick={() => setPreviewFile(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>
            <FiX />
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {chatMessages.map((message, index) => {
          const isOwn = message.sender?._id === user?._id || message.sender === user?._id
          const showAvatar = activeChat.isGroup && !isOwn && (index === 0 || chatMessages[index - 1]?.sender?._id !== message.sender?._id)
          return <Message key={message._id} message={message} isOwn={isOwn} showAvatar={showAvatar} />
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        {showEmoji && (
          <EmojiPicker onSelect={(emoji) => { setText(prev => prev + emoji); setShowEmoji(false) }} onClose={() => setShowEmoji(false)} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => imageInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <FiImage />
          </button>
          <input ref={imageInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, e.target.files[0]?.type.startsWith('image') ? 'image' : 'video')} />

          <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <FiFile />
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.zip,.rar" style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'document')} />

          <input
            value={text}
            onChange={handleTyping}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '24px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}
          />

          <button onClick={() => setShowEmoji(!showEmoji)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <FiSmile />
          </button>

          {text.trim() || previewFile ? (
            <button onClick={handleSend} style={{ background: 'var(--accent)', border: 'none', color: '#fff', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px' }}>
              <FiSend />
            </button>
          ) : (
            <button onClick={handleVoice} style={{ background: recording ? '#ef4444' : 'var(--accent)', border: 'none', color: '#fff', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }}>
              {recording ? <MdStop /> : <MdMic />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatWindow
