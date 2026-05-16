import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setActiveChat } from '../../store/slices/chatSlice'
import api from '../../services/api'
import Avatar from '../ui/Avatar'
import { FiX, FiUserPlus, FiLogOut, FiTrash2, FiShield, FiLink, FiCheck, FiSearch } from 'react-icons/fi'
import toast from 'react-hot-toast'

const GroupInfoPanel = ({ onClose }) => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)
  const { user } = useSelector(state => state.auth)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const members = activeChat?.members || []
  const admins = activeChat?.admins || []
  const isAdmin = admins.some(a => (a._id || a).toString() === user?._id?.toString())

  const handleSearch = async (e) => {
    const val = e.target.value
    setSearch(val)
    if (val.length < 2) return setSearchResults([])
    try {
      const res = await api.get('/users?search=' + val)
      const users = res.data.data?.users || res.data.data || []
      const existingIds = members.map(m => (m._id || m).toString())
      setSearchResults(users.filter(u => !existingIds.includes(u._id.toString())))
    } catch {
      toast.error('Search failed')
    }
  }

  const handleAddMember = async (member) => {
    try {
      const res = await api.post('/groups/' + activeChat._id + '/members', { members: [member._id] })
      toast.success(member.displayName + ' added!')
      setSearch('')
      setSearchResults([])
      setShowAddMembers(false)
      dispatch(setActiveChat({ ...activeChat, members: [...members, member] }))
    } catch {
      toast.error('Failed to add member')
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return
    try {
      await api.delete('/groups/' + activeChat._id + '/members/' + memberId)
      toast.success('Member removed')
      dispatch(setActiveChat({ ...activeChat, members: members.filter(m => (m._id || m).toString() !== memberId) }))
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const handleMakeAdmin = async (memberId) => {
    try {
      await api.post('/groups/' + activeChat._id + '/admin/' + memberId)
      toast.success('Member promoted to admin')
    } catch {
      toast.error('Failed to promote member')
    }
  }

  const handleLeave = async () => {
    if (!window.confirm('Leave this group?')) return
    try {
      await api.post('/groups/' + activeChat._id + '/leave')
      toast.success('Left group')
      dispatch(setActiveChat(null))
      onClose()
    } catch {
      toast.error('Failed to leave group')
    }
  }

  const handleGenerateLink = async () => {
    setLoading(true)
    try {
      const res = await api.post('/groups/' + activeChat._id + '/invite')
      const link = res.data.data.inviteLink
      setInviteLink(link)
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
      toast.success('Invite link copied!')
    } catch {
      toast.error('Failed to generate invite link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', maxHeight: '85vh', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h3 style={{ fontWeight: 700, fontSize: '16px' }}>Group Info</h3>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
            <FiX />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Group Avatar and Name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Avatar src={activeChat?.groupImage} name={activeChat?.groupName} size={70} />
            <p style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>{activeChat?.groupName}</p>
            {activeChat?.groupDescription && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>{activeChat.groupDescription}</p>
            )}
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Invite Link */}
          {isAdmin && (
            <button onClick={handleGenerateLink} disabled={loading}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {copied ? <FiCheck style={{ color: '#22c55e' }} /> : <FiLink />}
              {copied ? 'Link Copied!' : loading ? 'Generating...' : 'Generate Invite Link'}
            </button>
          )}

          {/* Add Members */}
          {isAdmin && (
            <div>
              <button onClick={() => setShowAddMembers(!showAddMembers)}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FiUserPlus /> Add Members
              </button>

              {showAddMembers && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input value={search} onChange={handleSearch} placeholder="Search users..."
                      style={{ width: '100%', padding: '10px 14px 10px 36px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  {searchResults.map(u => (
                    <div key={u._id} onClick={() => handleAddMember(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', background: 'var(--bg-tertiary)' }}>
                      <Avatar src={u.avatar} name={u.displayName} size={32} />
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{u.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Members</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {members.map(member => {
                const memberId = (member._id || member).toString()
                const memberIsAdmin = admins.some(a => (a._id || a).toString() === memberId)
                const isMe = memberId === user?._id?.toString()
                return (
                  <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
                    <Avatar src={member.avatar} name={member.displayName} size={36} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {member.displayName || member.username} {isMe ? '(You)' : ''}
                      </p>
                      {memberIsAdmin && (
                        <p style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>Admin</p>
                      )}
                    </div>
                    {isAdmin && !isMe && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!memberIsAdmin && (
                          <button onClick={() => handleMakeAdmin(memberId)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                            <FiShield />
                          </button>
                        )}
                        <button onClick={() => handleRemoveMember(memberId)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leave Group */}
          <button onClick={handleLeave}
            style={{ width: '100%', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiLogOut /> Leave Group
          </button>
        </div>
      </div>
    </div>
  )
}

export default GroupInfoPanel
