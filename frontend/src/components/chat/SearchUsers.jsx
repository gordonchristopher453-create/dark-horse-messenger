import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { getOrCreateDirectChat } from '../../store/slices/chatSlice'
import { fetchMessages } from '../../store/slices/messageSlice'
import { getSocket } from '../../services/socket'
import api from '../../services/api'
import Avatar from '../ui/Avatar'
import { FiSearch, FiX } from 'react-icons/fi'

const SearchUsers = ({ onClose }) => {
  const dispatch = useDispatch()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) return setUsers([])
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get(`/users?search=${query}`)
        setUsers(res.data.data.users)
      } catch { setUsers([]) }
      finally { setLoading(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = async (userId) => {
    const result = await dispatch(getOrCreateDirectChat(userId))
    if (result.payload) {
      dispatch(fetchMessages({ chatId: result.payload._id }))
      const socket = getSocket()
      if (socket) socket.emit('chat:join', result.payload._id)
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--bg-secondary)',
        borderRadius: '20px', overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{ fontWeight: 600 }}>New Chat</h3>
          <button onClick={onClose}
            style={{
              background: 'var(--bg-tertiary)', border: 'none',
              color: 'var(--text-secondary)', padding: '6px',
              borderRadius: '8px', display: 'flex',
              alignItems: 'center', fontSize: '16px'
            }}>
            <FiX />
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--bg-tertiary)', borderRadius: '12px',
            padding: '10px 14px', border: '1px solid var(--border)'
          }}>
            <FiSearch style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              placeholder="Search by name or username..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontSize: '14px', width: '100%'
              }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {loading && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '14px' }}>
              Searching...
            </p>
          )}
          {!loading && users.length === 0 && query && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '14px' }}>
              No users found
            </p>
          )}
          {!loading && !query && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '14px' }}>
              Type to search for users
            </p>
          )}
          {users.map(u => (
            <div key={u._id}
              onClick={() => handleSelect(u._id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 20px', cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Avatar src={u.avatar} name={u.displayName} size={42} online={u.isOnline} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>{u.displayName}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>@{u.username}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SearchUsers
