import { generateKeyPair, exportPublicKey, storePrivateKey, hasStoredKey } from '../../services/crypto'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import toast from 'react-hot-toast'

// Register
export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', data)
    localStorage.setItem('accessToken', res.data.data.accessToken)
    localStorage.setItem('refreshToken', res.data.data.refreshToken)
    const userId = res.data.data.user._id
    const keyPair = await generateKeyPair()
    await storePrivateKey(userId, keyPair.privateKey, data.password)
    const pubKey = await exportPublicKey(keyPair.publicKey)
    await api.put('/users/public-key', { publicKey: pubKey })
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed')
  }
})

// Login
export const login = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', data)
    localStorage.setItem('accessToken', res.data.data.accessToken)
    localStorage.setItem('refreshToken', res.data.data.refreshToken)
    const userId = res.data.data.user._id
    if (!hasStoredKey(userId)) {
      const keyPair = await generateKeyPair()
      await storePrivateKey(userId, keyPair.privateKey, data.password)
      const pubKey = await exportPublicKey(keyPair.publicKey)
      await api.put('/users/public-key', { publicKey: pubKey })
    }
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed')
  }
})

// Get current user
export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/me')
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

// Logout
export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  } catch (err) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }
  // Note: private key stays in localStorage so user can re-login without regenerating
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    loading: false,
    initialized: false,
    error: null
  },
  reducers: {
    setUser: (state, action) => { state.user = action.payload },
    clearError: (state) => { state.error = null },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
    }
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (state) => { state.loading = true; state.error = null })
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      toast.success('Account created successfully!')
    })
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
      toast.error(action.payload)
    })
    // Login
    builder.addCase(login.pending, (state) => { state.loading = true; state.error = null })
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      toast.success('Welcome back!')
    })
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
      toast.error(action.payload)
    })
    // GetMe
    builder.addCase(getMe.fulfilled, (state, action) => {
      state.user = action.payload.user
      state.initialized = true
    })
    builder.addCase(getMe.rejected, (state) => {
      state.user = null
      state.initialized = true
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })
    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null
      state.accessToken = null
    })
  }
})

export const { setUser, clearError, updateUser } = authSlice.actions
export default authSlice.reducer
