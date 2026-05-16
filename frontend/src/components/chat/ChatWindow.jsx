import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMessages, sendMessage, deleteMessage } from '../../store/slices/messageSlice'
import { updateChatLastMessage } from '../../store/slices/chatSlice'
import { getSocket } from '../../services/socket'
import Avatar from '../ui/Avatar'
import Message from './Message'
import EmojiPicker from './EmojiPicker'
import { FiSend, FiSmile, FiArrowLeft, FiX, FiInfo, FiLock } from 'react-icons/fi'
import GroupInfoPanel from '../group/GroupInfoPanel'
import { MdMic, MdAttachFile, MdStop } from 'react-icons/md'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { loadPrivateKey, encryptForRecipient, encryptForGroup } from '../../services/crypto'

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
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingMessages, setPendingMessages] = useState([])
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const audioChunksRef = useRef([])
  const textareaRef = useRef(null)
  const chatMessages = messages[activeChat?._id] || []

  if (!activeChat) return null
  const typingInChat = typingUsers[activeChat?._id] || []

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      const queue = JSON.parse(localStorage.getItem('messageQueue') || '[]')
      const chatQueue = queue.filter(m => m.chatId === activeChat?._id)
      for (const msg of chatQueue) {
        await dispatch(sendMessage({ chatId: msg.chatId, formData: { content: msg.content, type: 'text' } }))
      }
      localStorage.setItem('messageQueue', JSON.stringify(queue.filter(m => m.chatId !== activeChat?._id)))
      setPendingMessages([])
      toast.success('Back online!')
    }
    const handleOffline = () => { setIsOnline(false); toast.error('You are offline') }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [activeChat?._id])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])
  useEffect(() => { if (activeChat?._id) dispatch(fetchMessages({ chatId: activeChat._id })) }, [activeChat?._id])

  useEffect(() => {
    if (activeChat?._id) {
      const socket = getSocket()
      if (socket) {
        const unreadIds = chatMessages.filter(m => {
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
    return activeChat.members?.find(m => m._id !== user?._id)?.displayName || 'Unknown'
  }

  const getChatAvatar = () => {
    if (!activeChat) return ''
    if (activeChat.isGroup) return activeChat.groupImage
    return activeChat.members?.find(m => m._id !== user?._id)?.avatar
  }

  const isOtherOnline = () => {
    if (!activeChat || activeChat.isGroup) return false
    return activeChat.members?.find(m => m._id !== user?._id)?.isOnline
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    const socket = getSocket()
    if (!socket) return
    if (!isTyping) { setIsTyping(true); socket.emit('typing:start', { chatId: activeChat._id }) }
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => { setIsTyping(false); socket.emit('typing:stop', { chatId: activeChat._id }) }, 1500)
  }

  const handleEmojiClick = (emoji) => { setText(prev => prev + emoji); setShowEmoji(false); textareaRef.current?.focus() }

  const handleSend = async () => {
    if (!text.trim()) return
    const socket = getSocket()
    if (socket) socket.emit('typing:stop', { chatId: activeChat._id })
    setIsTyping(false)
    const messageText = text.trim()
    const replyToId = replyTo?._id
    setText('')
    setReplyTo(null)
    setShowEmoji(false)

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('messageQueue') || '[]')
      const msg = { chatId: activeChat._id, content: messageText, timestamp: Date.now(), id: Date.now() }
      queue.push(msg)
      localStorage.setItem('messageQueue', JSON.stringify(queue))
      setPendingMessages(prev => [...prev, msg])
      toast('Message queued', { icon: '⏳' })
      return
    }

    const result = await dispatch(sendMessage({
      chatId: activeChat._id,
      formData: { content: messageText, type: 'text', replyTo: replyToId }
    }))
    if (result.payload) {
      dispatch(updateChatLastMessage({ chatId: activeChat._id, message: result.payload }))
      if (socket) socket.emit('message:send', { chatId: activeChat._id, content: messageText, type: 'text', messageId: result.payload._id })
    }
  }

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  const handleDeleteMessage = async (messageId, deleteFor) => {
    try {
      await api.delete(`/messages/${messageId}?deleteFor=${deleteFor}`)
      dispatch(deleteMessage({ chatId: activeChat._id, messageId }))
      const socket = getSocket()
      if (socket && deleteFor === 'everyone') {
        socket.emit('message:delete', { messageId, chatId: activeChat._id, deleteFor: 'everyone' })
      }
      toast.success('Message deleted')
    } catch { toast.error('Failed to delete message') }
  }

  const handleForward = (message) => {
    toast('Forward feature coming soon!', { icon: '📨' })
  }

  const uploadFile = async (file, type) => {
    if (!file) return
    if (file.size > 100 * 1024 * 1024) { toast.error('File too large. Maximum 100MB'); return }
    setUploading(true)
    setShowAttachMenu(false)
    try {
      const formData = new FormData()
      formData.append('media', file)
      formData.append('type', type)
      const result = await dispatch(sendMessage({ chatId: activeChat._id, formData }))
      if (result.payload) {
        dispatch(updateChatLastMessage({ chatId: activeChat._id, message: result.payload }))
        const socket = getSocket()
        if (socket) socket.emit('message:send', { chatId: activeChat._id, type, messageId: result.payload._id })
        toast.success('Sent!')
      }
    } catch { toast.error('Failed to send') }
    finally { setUploading(false) }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    let type = 'document'
    if (file.type.startsWith('image/')) type = 'image'
    else if (file.type.startsWith('video/')) type = 'video'
    else if (file.type.startsWith('audio/')) type = 'audio'
    await uploadFile(file, type)
    e.target.value = ''
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
        setRecordingTime(prev => { if (prev >= 120) { stopRecording(); return 0 } return prev + 1 })
      }, 1000)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop(); setRecording(false)
      clearInterval(recordingTimerRef.current); setRecordingTime(0)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      setRecording(false); clearInterval(recordingTimerRef.current); setRecordingTime(0)
      audioChunksRef.current = []
    }
  }

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden', position: 'relative' }}>
      {!isOnline && <div style={{ background: '#f59e0b', color: '#000', padding: '6px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>⚠️ You are offline</div>}

      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '22px', display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer', flexShrink: 0 }}><FiArrowLeft /></button>}
        <Avatar src={getChatAvatar()} name={getChatName()} size={40} online={isOtherOnline()} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <p style={{ fontWeight: 600, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getChatName()}</p>
            <FiLock style={{ fontSize: '11px', color: '#10b981', flexShrink: 0 }} />
          </div>
          <p style={{ fontSize: '12px', color: typingInChat.length > 0 ? 'var(--accent-light)' : isOtherOnline() ? 'var(--success)' : 'var(--text-muted)' }}>
            {typingInChat.length > 0 ? 'typing...' : activeChat && activeChat.isGroup ? (activeChat.members && activeChat.members.length || 0) + ' members' : isOtherOnline() ? 'Online' : 'Offline'}
          </p>
        </div>
        {activeChat && activeChat.isGroup && (
          <button onClick={() => setShowGroupInfo(true)} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '8px', borderRadius: '10px', fontSize: '18px', display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <FiInfo />
          </button>
        )}
      </div>

      {/* E2E Encryption Indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '5px', padding: '4px 0',
        background: 'rgba(16,185,129,0.06)',
        borderBottom: '1px solid rgba(16,185,129,0.1)'
      }}>
        <FiLock style={{ fontSize: '10px', color: '#10b981' }} />
        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 500 }}>
          End-to-end encrypted
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}
        onClick={() => { showEmoji && setShowEmoji(false); showAttachMenu && setShowAttachMenu(false) }}>
        {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>Loading...</p>}
        {!loading && chatMessages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.6 }}>
            <p style={{ fontSize: '32px' }}>👋</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Say hello to {getChatName()}!</p>
          </div>
        )}
        {chatMessages.map((msg, idx) => (
          <Message key={msg._id} message={msg}
            isOwn={msg.sender?._id === user?._id || msg.sender === user?._id}
            showAvatar={!activeChat?.isGroup ? false : idx === 0 || chatMessages[idx-1]?.sender?._id !== msg.sender?._id}
            onReply={(m) => { setReplyTo(m); textareaRef.current?.focus() }}
            onDelete={handleDeleteMessage}
            onForward={handleForward}
          />
        ))}
        {pendingMessages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ background: 'var(--sent-bubble)', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', maxWidth: '65%', opacity: 0.6 }}>
              <p style={{ fontSize: '14px', color: '#fff' }}>{msg.content}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: '4px' }}>⏳</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && <EmojiPicker onEmojiClick={handleEmojiClick} onClose={() => setShowEmoji(false)} />}

      {/* Attachment Menu */}
      {showAttachMenu && (
        <div style={{ position: 'absolute', bottom: '70px', left: '16px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', padding: '12px', display: 'flex', gap: '16px', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {[
            { ref: cameraInputRef, icon: '📷', label: 'Camera', accept: 'image/*', capture: 'environment' },
            { ref: imageInputRef, icon: '🖼️', label: 'Gallery', accept: 'image/*' },
            { ref: videoInputRef, icon: '🎥', label: 'Video', accept: 'video/*' },
            { ref: fileInputRef, icon: '📄', label: 'File', accept: '.pdf,.doc,.docx,.txt,.zip' },
          ].map((item, i) => (
            <div key={i} onClick={() => item.ref.current?.click()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <div style={{ background: ['#7c3aed','#059669','#dc2626','#2563eb'][i], width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                {item.icon}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hidden inputs */}
      <input type="file" ref={cameraInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" capture="environment" />
      <input type="file" ref={imageInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" />
      <input type="file" ref={videoInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="video/*" />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx" />

      {/* Reply Preview */}
      {replyTo && (
        <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, borderLeft: '3px solid var(--accent)', paddingLeft: '10px' }}>
            <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>{replyTo.sender?.displayName}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyTo.content || '📎 Attachment'}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <FiX />
          </button>
        </div>
      )}

      {/* Recording */}
      {recording && (
        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={cancelRecording} style={{ background: 'var(--danger)', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontSize: '18px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><FiX /></button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1s infinite' }} />
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>🎤 {formatTime(recordingTime)}</p>
          </div>
          <button onClick={stopRecording} style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontSize: '18px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><MdStop /></button>
        </div>
      )}

      {/* Input */}
      {!recording && (
        <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false) }}
            style={{ background: showAttachMenu ? 'var(--accent)' : 'var(--bg-tertiary)', border: 'none', color: showAttachMenu ? '#fff' : 'var(--text-secondary)', padding: '10px', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer' }}>
            <MdAttachFile />
          </button>
          <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: '24px', border: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            <textarea ref={textareaRef} value={text} onChange={handleTyping} onKeyDown={handleKeyPress}
              placeholder={isOnline ? "Type a message..." : "Offline..."} rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '15px', resize: 'none', maxHeight: '100px', lineHeight: '1.4', fontFamily: 'inherit' }}
            />
            <button onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false) }}
              style={{ background: 'none', border: 'none', color: showEmoji ? 'var(--accent)' : 'var(--text-muted)', fontSize: '22px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <FiSmile />
            </button>
          </div>
          {text.trim() ? (
            <button onClick={handleSend} style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.4)', cursor: 'pointer' }}>
              <FiSend />
            </button>
          ) : (
            <button onMouseDown={startRecording} onTouchStart={startRecording}
              style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '10px', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer' }}>
              <MdMic />
            </button>
          )}
        </div>
      )}
      {showGroupInfo && activeChat && activeChat.isGroup && (
        <GroupInfoPanel onClose={() => setShowGroupInfo(false)} />
      )}
    </div>
  )
}

export default ChatWindow
