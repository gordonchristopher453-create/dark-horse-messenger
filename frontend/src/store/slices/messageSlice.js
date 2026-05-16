import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchMessages = createAsyncThunk('message/fetchMessages', async ({ chatId, page = 1 }, { rejectWithValue }) => {
  try {
    const res = await api.get(`/messages/${chatId}?page=${page}`)
    return { ...res.data.data, chatId }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const sendMessage = createAsyncThunk('message/sendMessage', async ({ chatId, formData }, { rejectWithValue }) => {
  try {
    const isFile = formData instanceof FormData
    const res = await api.post(`/messages/${chatId}`, formData, {
      timeout: isFile ? 60000 : 10000,
      headers: isFile ? { 'Content-Type': 'multipart/form-data' } : {}
    })
    return res.data.data.message
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

const messageSlice = createSlice({
  name: 'message',
  initialState: { messages: {}, loading: false, error: null },
  reducers: {
    addMessage: (state, action) => {
      const { chatId, message } = action.payload
      if (!state.messages[chatId]) state.messages[chatId] = []
      const exists = state.messages[chatId].find(m => m._id === message._id)
      if (!exists) state.messages[chatId].push(message)
    },
    updateMessage: (state, action) => {
      const { chatId, message } = action.payload
      if (state.messages[chatId]) {
        const idx = state.messages[chatId].findIndex(m => m._id === message._id)
        if (idx !== -1) state.messages[chatId][idx] = message
      }
    },
    deleteMessage: (state, action) => {
      const { chatId, messageId } = action.payload
      if (state.messages[chatId]) {
        const msg = state.messages[chatId].find(m => m._id === messageId)
        if (msg) { msg.isDeleted = true; msg.content = 'This message was deleted' }
      }
    },
    clearMessages: (state, action) => { delete state.messages[action.payload] },
    markMessageRead: (state, action) => {
      const { chatId, messageId, readBy, readAt } = action.payload
      if (!state.messages[chatId]) return
      const msg = state.messages[chatId].find(m => m._id === messageId)
      if (msg) {
        if (!msg.readBy) msg.readBy = []
        const alreadyRead = msg.readBy.some(r => (r.user?._id || r.user) === readBy)
        if (!alreadyRead) msg.readBy.push({ user: readBy, readAt })
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMessages.pending, (state) => { state.loading = true })
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      state.loading = false
      state.messages[action.payload.chatId] = action.payload.messages || []
    })
    builder.addCase(fetchMessages.rejected, (state, action) => { state.loading = false; console.error("fetchMessages failed:", action.payload) })
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      const msg = action.payload
      if (!state.messages[msg.chat]) state.messages[msg.chat] = []
      const exists = state.messages[msg.chat].find(m => m._id === msg._id)
      if (!exists) state.messages[msg.chat].push(msg)
    })
  }
})

export const { addMessage, updateMessage, deleteMessage, clearMessages, markMessageRead } = messageSlice.actions
export default messageSlice.reducer
