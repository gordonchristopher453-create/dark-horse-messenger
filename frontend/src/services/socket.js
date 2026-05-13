import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://dark-horse-messenger.onrender.com'

let socket = null

export const initSocket = (token) => {
  if (socket?.connected) return socket
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling']
  })
  socket.on('connect', () => console.log('✅ Socket connected:', socket.id))
  socket.on('disconnect', (reason) => console.log('❌ Socket disconnected:', reason))
  socket.on('connect_error', (error) => console.error('Socket error:', error.message))
  return socket
}

export const getSocket = () => socket
export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null }
}

export default { initSocket, getSocket, disconnectSocket }
