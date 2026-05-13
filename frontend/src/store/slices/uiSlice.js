import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    searchOpen: false,
    newChatOpen: false,
    newGroupOpen: false,
    theme: 'dark',
    typingUsers: {}
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload },
    toggleSearch: (state) => { state.searchOpen = !state.searchOpen },
    setNewChatOpen: (state, action) => { state.newChatOpen = action.payload },
    setNewGroupOpen: (state, action) => { state.newGroupOpen = action.payload },
    setTypingUser: (state, action) => {
      const { chatId, userId, isTyping } = action.payload
      if (!state.typingUsers[chatId]) state.typingUsers[chatId] = []
      if (isTyping) {
        if (!state.typingUsers[chatId].includes(userId))
          state.typingUsers[chatId].push(userId)
      } else {
        state.typingUsers[chatId] = state.typingUsers[chatId].filter(id => id !== userId)
      }
    }
  }
})

export const {
  toggleSidebar, setSidebarOpen, toggleSearch,
  setNewChatOpen, setNewGroupOpen, setTypingUser
} = uiSlice.actions
export default uiSlice.reducer
