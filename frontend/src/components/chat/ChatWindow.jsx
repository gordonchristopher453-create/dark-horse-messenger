import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMessages, sendMessage } from '../../store/slices/messageSlice'
import { updateChatLastMessage } from '../../store/slices/chatSlice'
import { getSocket } from '../../services/socket'
import Avatar from '../ui/Avatar'
import Message from './Message'
import EmojiPicker from './EmojiPicker'
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
  const [showEmoji, setShowEmoji] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingMessages, setPendingMessages] = useState([])
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const audioChunksRef = useRef([])
  const textareaRef = useRef(null)
  const chatMessages = messages[activeChat?._id] || []
  const typingInChat = typingUsers[activeChat?._id] || []

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      toast.success('Back online!')
      const queue = JSON.parse(localStorage.getItem('messageQueue') || '[]')
      const chatQueue = queue.filter(m => m.chatId === activeChat?._id)
      for (const msg of chatQueue) {
        await dispatch(sendMessage({ chatId: msg.chatId, formData: { content: msg.content, type: 'text' } }))
      }
      const remaining = queue.filter(m => m.chatId !== activeChat?._id)
      localStorage.setItem('messageQueue', JSON.stringify(remaining))
      setPendingMessages([])
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.error('You are offline')
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
