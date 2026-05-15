import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchChats = createAsyncThunk('chat/fetchChats', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/chats')
    return res.data.data.chats
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const getOrCreateDirectChat = createAsyncThunk('chat/getOrCreateDirect', async (userId, { rejectWithValue }) => {
  try {
    const res = await api.post(`/chats/direct/${userId}`)
    return res.data.data.chat
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const createGroup = createAsyncThunk('chat/createGroup', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/groups', data)
    return res.data.data.group
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    activeChat: null,
    loading: false,
    error: null
  },
  reducers: {
    setActiveChat: (state, action) => {
      state.activeChat = action.payload
    },
    updateChatLastMessage: (state, action) => {
      const { chatId, message } = action.payload
      const chat = state.chats.find(c => c._id === chatId)
      if (chat) {
        chat.lastMessage = message
        chat.updatedAt = new Date().toISOString()
      }
      // Sort chats by latest message
      state.chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    },
    addChat: (state, action) => {
      const exists = state.chats.find(c => c._id === action.payload._id)
      if (!exists) state.chats.unshift(action.payload)
    },
    updateActiveChat: (state, action) => {
      if (state.activeChat?._id === action.payload._id) {
        state.activeChat = action.payload
      }
    },
    clearUnread: (state, action) => {
      const chat = state.chats.find(c => c._id === action.payload)
      if (chat) chat.unreadCount = 0
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchChats.pending, (state) => { state.loading = true })
    builder.addCase(fetchChats.fulfilled, (state, action) => {
      state.loading = false
      state.chats = action.payload
      // Update active chat if it exists in new data
      if (state.activeChat) {
        const updated = action.payload.find(c => c._id === state.activeChat._id)
        if (updated) state.activeChat = updated
      }
    })
    builder.addCase(fetchChats.rejected, (state) => { state.loading = false })
    builder.addCase(getOrCreateDirectChat.fulfilled, (state, action) => {
      const exists = state.chats.find(c => c._id === action.payload._id)
      if (!exists) state.chats.unshift(action.payload)
      state.activeChat = action.payload
    })
    builder.addCase(createGroup.fulfilled, (state, action) => {
      state.chats.unshift(action.payload)
      state.activeChat = action.payload
    })
  }
})

export const { setActiveChat, updateChatLastMessage, addChat, updateActiveChat, clearUnread } = chatSlice.actions
export default chatSlice.reducer
