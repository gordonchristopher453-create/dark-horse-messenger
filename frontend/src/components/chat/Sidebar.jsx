import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setActiveChat, addChat } from '../../store/slices/chatSlice'
import { logout } from '../../store/slices/authSlice'
import { fetchMessages } from '../../store/slices/messageSlice'
import { getSocket } from '../../services/socket'
import Avatar from '../ui/Avatar'
import CreateGroupModal from '../group/CreateGroupModal'
import SearchUsers from './SearchUsers'
import ProfileModal from '../profile/ProfileModal'
import { FiSearch, FiLogOut, FiEdit, FiMessageSquare, FiUsers } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'

const Sidebar = () => {
  const dispatch = useDispatch()
  const { chats, activeChat } = useSelector(state => state.chat)
  const { user } = useSelector(state => state.auth)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)

  const handleChatClick = (chat) => {
    dispatch(setActiveChat(chat))
    dispatch(fetchMessages({ chatId: chat._id }))
    const socket = getSocket()
    if (socket) socket.emit('chat:join', chat._id)
  }

  const handleGroupCreated = (group) => {
    dispatch(addChat(group))
    dispatch(setActiveChat(group))
    dispatch(fetchMessages({ chatId: group._id }))
    const socket = getSocket()
    if (socket) socket.emit('chat:join', group._id)
  }

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.groupName
    const other = chat.members?.find(m => m._id !== user?._id)
    return other?.displayName || 'Unknown'
  }

  const getChatAvatar = (chat) => {
    if (chat.isGroup) return chat.groupImage
    const other = chat.members?.find(m => m._id !== user?._id)
    return other?.avatar
  }

  const isOnline = (chat) => {
    if (chat.isGroup) return false
    const other = chat.members?.find(m => m._id !== user?._id)
    return other?.isOnline
  }

  const getLastMessage = (chat) => {
    if (!chat.lastMessage) return 'No messages yet'
    if (chat.lastMessage.isDeleted) return 'Message deleted'
    if (chat.lastMessage.type === 'image') return '📷 Image'
    if (chat.lastMessage.type === 'audio') return '🎵 Voice note'
    if (chat.lastMessage.type === 'voice') return '🎤 Voice note'
    if (chat.lastMessage.type === 'video') return '🎥 Video'
    if (chat.lastMessage.type === 'document') return '📄 Document'
    if (chat.lastMessage.type === 'system') return chat.lastMessage.content
    return chat.lastMessage.content || ''
  }

  const totalUnread = chats.reduce((a, c) => a + (c.unreadCount || 0), 0)

  useEffect(() => {
    document.title = totalUnread > 0
      ? `(${totalUnread}) Dark Horse Messenger`
      : 'Dark Horse Messenger'
  }, [totalUnread])

  return (
    <div style={{
      width: '340px', height: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div onClick={() => setProfileOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <Avatar src={user?.avatar} name={user?.displayName} size={38} online />
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px' }}>{user?.displayName}</p>
            <p style={{ color: 'var(--success)', fontSize: '11px' }}>Online</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setGroupOpen(true)} title="New Group" style={{
            background: 'var(--bg-tertiary)', border: 'none',
            color: 'var(--text-secondary)', padding: '8px',
            borderRadius: '10px', fontSize: '16px',
            display: 'flex', alignItems: 'center', cursor: 'pointer'
          }}>
            <FiUsers />
          </button>
          <button onClick={() => setSearchOpen(true)} title="New Chat" style={{
            background: 'var(--bg-tertiary)', border: 'none',
            color: 'var(--text-secondary)', padding: '8px',
            borderRadius: '10px', fontSize: '16px',
            display: 'flex', alignItems: 'center', cursor: 'pointer'
          }}>
            <FiEdit />
          </button>
          <button onClick={() => dispatch(logout())} title="Logout" style={{
            background: 'var(--bg-tertiary)', border: 'none',
            color: 'var(--text-secondary)', padding: '8px',
            borderRadius: '10px', fontSize: '16px',
            display: 'flex', alignItems: 'center', cursor: 'pointer'
          }}>
            <FiLogOut />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-tertiary)', borderRadius: '12px',
          padding: '8px 14px', border: '1px solid var(--border)'
        }}>
          <FiSearch style={{ color: 'var(--text-muted)', fontSize: '15px' }} />
          <input placeholder="Search chats..." readOnly
            onClick={() => setSearchOpen(true)}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-primary)', fontSize: '14px',
              width: '100%', cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {/* Chat List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {chats.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '200px', gap: '12px'
          }}>
            <FiMessageSquare style={{ fontSize: '32px', color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No chats yet</p>
            <button onClick={() => setSearchOpen(true)} style={{
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: '10px',
              padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
            }}>
              Start a chat
            </button>
          </div>
        ) : (
          chats.map(chat => {
            const unread = chat.unreadCount || 0
            return (
              <div key={chat._id} onClick={() => handleChatClick(chat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', cursor: 'pointer',
                  background: activeChat?._id === chat._id ? 'var(--bg-hover)' : 'transparent',
                  borderLeft: activeChat?._id === chat._id ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={getChatAvatar(chat)} name={getChatName(chat)} size={46} online={isOnline(chat)} />
                  {chat.isGroup && (
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      background: 'var(--accent)', borderRadius: '50%',
                      width: '16px', height: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', border: '2px solid var(--bg-secondary)'
                    }}>
                      <FiUsers color="#fff" size={8} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '3px'
                  }}>
                    <p style={{
                      fontWeight: unread > 0 ? 700 : 600,
                      fontSize: '14px', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {getChatName(chat)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {chat.lastMessage && (
                        <span style={{
                          color: unread > 0 ? 'var(--accent-light)' : 'var(--text-muted)',
                          fontSize: '11px'
                        }}>
                          {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: false })}
                        </span>
                      )}
                      {unread > 0 && (
                        <div style={{
                          background: 'var(--accent)', color: '#fff',
                          borderRadius: '50%', minWidth: '20px', height: '20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, padding: '0 4px'
                        }}>
                          {unread > 99 ? '99+' : unread}
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{
                    color: unread > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontSize: '13px', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: unread > 0 ? 500 : 400
                  }}>
                    {getLastMessage(chat)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {searchOpen && <SearchUsers onClose={() => setSearchOpen(false)} />}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      {groupOpen && (
        <CreateGroupModal
          onClose={() => setGroupOpen(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </div>
  )
}

export default Sidebar
