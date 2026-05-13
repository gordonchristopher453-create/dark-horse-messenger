import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMessages, sendMessage } from '../../store/slices/messageSlice'
import { updateChatLastMessage } from '../../store/slices/chatSlice'
import { getSocket } from '../../services/socket'
import Avatar from '../ui/Avatar'
import Message from './Message'
import { FiSend, FiSmile, FiX } from 'react-icons/fi'
import { MdMic, MdMicOff, MdAttachFile, MdStop } from 'react-icons/md'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ChatWindow = () => {
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
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const audioChunksRef = useRef([])
  const chatMessages = messages[activeChat?._id] || []
  const typingInChat = typingUsers[activeChat?._id] || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (activeChat?._id) {
      dispatch(fetchMessages({ chatId: activeChat._id }))
    }
  }, [activeChat?._id])

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (activeChat?._id) {
      const socket = getSocket()
      if (socket) {
        const unreadIds = chatMessages
          .filter(m => {
            const isOwn = m.sender?._id === user?._id || m.sender === user?._id
            const isRead = m.readBy?.some(r => r.user === user?._id || r.user?._id === user?._id)
            return !isOwn && !isRead
          })
          .map(m => m._id)

        if (unreadIds.length > 0) {
          socket.emit('message:read', { chatId: activeChat._id, messageIds: unreadIds })
        }
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

    const result = await dispatch(sendMessage({
      chatId: activeChat._id,
      formData: { content: messageText, type: 'text' }
    }))

    if (result.payload) {
      dispatch(updateChatLastMessage({ chatId: activeChat._id, message: result.payload }))
      if (socket) {
        socket.emit('message:send', {
          chatId: activeChat._id,
          content: messageText,
          type: 'text',
          messageId: result.payload._id
        })
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum 50MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('media', file)

      let type = 'document'
      if (file.type.startsWith('image/')) type = 'image'
      else if (file.type.startsWith('video/')) type = 'video'
      else if (file.type.startsWith('audio/')) type = 'audio'

      formData.append('type', type)

      const result = await dispatch(sendMessage({
        chatId: activeChat._id,
        formData
      }))

      if (result.payload) {
        dispatch(updateChatLastMessage({ chatId: activeChat._id, message: result.payload }))
        const socket = getSocket()
        if (socket) {
          socket.emit('message:send', {
            chatId: activeChat._id,
            type,
            messageId: result.payload._id
          })
        }
        toast.success('File sent!')
      }
    } catch (error) {
      toast.error('Failed to send file')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())

        if (audioBlob.size > 0) {
          setUploading(true)
          try {
            const formData = new FormData()
            formData.append('media', audioBlob, 'voice-note.webm')
            formData.append('type', 'voice')

            const result = await dispatch(sendMessage({
              chatId: activeChat._id,
              formData
            }))

            if (result.payload) {
              dispatch(updateChatLastMessage({ chatId: activeChat._id, message: result.payload }))
              const socket = getSocket()
              if (socket) {
                socket.emit('message:send', {
                  chatId: activeChat._id,
                  type: 'voice',
                  messageId: result.payload._id
                })
              }
              toast.success('Voice note sent!')
            }
          } catch (error) {
            toast.error('Failed to send voice note')
          } finally {
            setUploading(false)
          }
        }
      }

      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording()
            return 0
          }
          return prev + 1
        })
      }, 1000)

    } catch (error) {
      toast.error('Microphone access denied')
    }
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

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar src={getChatAvatar()} name={getChatName()} size={42} online={isOtherOnline()} />
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px' }}>{getChatName()}</p>
            <p style={{ fontSize: '12px', color: typingInChat.length > 0 ? 'var(--accent-light)' : 'var(--text-muted)' }}>
              {typingInChat.length > 0 ? 'typing...' : isOtherOnline() ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: '4px'
      }}>
        {loading && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>
            Loading messages...
          </p>
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

      {/* Recording UI */}
      {recording && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          gap: '12px'
        }}>
          <button onClick={cancelRecording} style={{
            background: 'var(--danger)', border: 'none',
            color: '#fff', padding: '10px', borderRadius: '12px',
            fontSize: '18px', display: 'flex', alignItems: 'center'
          }}>
            <FiX />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'var(--danger)',
              animation: 'pulse 1s infinite'
            }} />
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              Recording... {formatTime(recordingTime)}
            </p>
          </div>
          <button onClick={stopRecording} style={{
            background: 'var(--accent)', border: 'none',
            color: '#fff', padding: '10px', borderRadius: '12px',
            fontSize: '18px', display: 'flex', alignItems: 'center'
          }}>
            <MdStop />
          </button>
        </div>
      )}

      {/* Input */}
      {!recording && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-end',
          gap: '10px', flexShrink: 0
        }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'var(--bg-tertiary)', border: 'none',
              color: uploading ? 'var(--accent)' : 'var(--text-secondary)',
              padding: '10px', borderRadius: '12px', fontSize: '18px',
              display: 'flex', alignItems: 'center', flexShrink: 0
            }}>
            <MdAttachFile />
          </button>

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
                flex: 1, background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontSize: '14px',
                resize: 'none', maxHeight: '120px',
                lineHeight: '1.5', fontFamily: 'inherit'
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

          {text.trim() ? (
            <button onClick={handleSend} style={{
              background: 'var(--accent)', border: 'none',
              color: '#fff', padding: '10px', borderRadius: '12px',
              fontSize: '18px', display: 'flex', alignItems: 'center',
              flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.4)'
            }}>
              <FiSend />
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onTouchStart={startRecording}
              style={{
                background: 'var(--bg-tertiary)', border: 'none',
                color: 'var(--text-secondary)', padding: '10px',
                borderRadius: '12px', fontSize: '18px',
                display: 'flex', alignItems: 'center', flexShrink: 0
              }}>
              <MdMic />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ChatWindow
