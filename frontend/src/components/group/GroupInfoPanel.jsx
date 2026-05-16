import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setActiveChat } from '../../store/slices/chatSlice'
import api from '../../services/api'
import Avatar from '../ui/Avatar'
import { FiX, FiSearch, FiUserPlus, FiLogOut, FiTrash2, FiEdit2, FiCheck, FiShield, FiLink } from 'react-icons/fi'
import toast from 'react-hot-toast'

const GroupInfoPanel = ({ onClose }) => {
  const dispatch = useDispatch()
  const { activeChat } = useSelector(state => state.chat)
  const { user } = useSelector(state => state.auth)

  const [editingName, setEditingName] = useState(false)
  const [groupName, setGroupName] = useState(activeChat?.groupName || '')
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const isAdmin = activeChat?.admins?.includes(user?._id) ||
                  activeChat?.admins?.some(a => a._id === user?._id || a === user?._id)

  const handleSearch = async (e) => {
    setSearch(e.target.value)
    if (e.target.value.length < 2) return setSearchResults([])
    try {
      const res = await api.get(`/users?search=${e.target.value}`)
      const existingIds = activeChat.members.map(m => m._id || m)
      setSearchResults(res.data.data.users.filter(u => !existingIds.includes(u._id)))
    } catch { toast.error('Search failed') }
  }

  const handleAddMember = async (member) => {
    try {
      const res = await api.post(`/groups/${activeChat._id}/members`, { members: [member._id] })
      dispatch(setActiveChat(res.data.data.group))
      toast.success(`${member.displayName} added`)
      setSearch('')
      setSearchResults([])
      setShowAddMembers(false)
    } catch { toast.error('Failed to add member') }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return
    try {
      const res = await api.delete(`/groups/${activeChat._id}/members/${memberId}`)
      dispatch(setActiveChat(res.data.data.group))
      toast.success('Member removed')
    } catch { toast.error('Failed to remove member') }
  }

  const handleMakeAdmin = async (memberId) => {
    try {
      const res = await api.post(`/groups/${activeChat._id}/admin/${memberId}`)
      dispatch(setActiveChat(res.data.data.group))
      toast.success('Made admin')
    } catch { toast.error('Failed to update admin') }
  }

  const handleSaveName = async () => {
    if (!groupName.trim()) return
    setLoading(true)
    try {
      const res = await api.put(`/groups/${activeChat._id}`, { groupName })
      dispatch(setActiveChat(res.data.data.group))
      toast.success('Group name updated')
      setEditingName(false)
    } catch { toast.error('Failed to update name') }
    finally { setLoading(false) }
  }

  const handleGenerateInvite = async () => {
    try {
      const res = await api.post(`/groups/${activeChat._id}/invite`)
      setInviteLink(res.data.data.inviteLink)
      navigator.clipboard.writeText(res.data.data.inviteLink)
      setCopied(true)
      toast.success('Invite link copied!')
      setTimeout(() => setCopied(false), 3000)
    } catch { toast.error('Failed to generate invite link') }
  }

  const handleLeave = async () => {
    if (!window.confirm('Leave this group?')) return
    try {
      await api.post(`/groups/${activeChat._id}/leave`)
      dispatch(setActiveChat(null))
      toast.success('Left group')
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to leave group')
    }
  }

  const members = activeChat?.members || []
  const admins = activeChat?.admins || []
  const isMemberAdmin = (memberId) =>
    admins.includes(memberId) || admins.some(a => (a._id || a) === memberId)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--bg-secondary)',
        borderRadius: '20px', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden'
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <h3 style={{ fontWeight: 600, fontSize: '16px' }}>Group Info</h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-tertiary)', border: 'none',
            color: 'var(--text-secondary)', padding: '6px',
            borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}>
            <FiX />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Group avatar + name */}
          <div style={{
            padding: '24px 20px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            borderBottom: '1px solid var(--border)'
          }}>
            <Avatar src={activeChat?.groupImage} name={activeChat?.groupName} size={72} />
            {editingName ? (
              <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '280px' }}>
                <input
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                  style={{
                    flex: 1, padding: '8px 12px',
                    background: 'var(--bg-tertiary)', border: '1px solid var(--accent)',
                    borderRadius: '10px', fontSize: '15px', color: 'var(--text-primary)'
                  }}
                />
                <button onClick={handleSaveName} disabled={loading} style={{
                  background: 'var(--accent)', border: 'none', color: '#fff',
                  padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center'
                }}>
                  <FiCheck />
                </button>
                <button onClick={() => { setEditingName(false); setGroupName(activeChat.groupName) }} style={{
                  background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-muted)',
                  padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center'
                }}>
                  <FiX />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontWeight: 700, fontSize: '18px' }}>{activeChat?.groupName}</p>
                {isAdmin && (
                  <button onClick={() => setEditingName(true)} style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px'
                  }}>
                    <FiEdit2 size={14} />
                  </button>
                )}
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
            {activeChat?.groupDescription && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
                {activeChat.groupDescription}
              </p>
            )}
          </div>

          {/* Members list */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>
                MEMBERS
              </p>
              {isAdmin && (
                <button onClick={() => setShowAddMembers(!showAddMembers)} style={{
                  background: showAddMembers ? 'var(--accent)' : 'var(--bg-tertiary)',
                  border: 'none', color: showAddMembers ? '#fff' : 'var(--text-secondary)',
                  padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
                }}>
                  <FiUserPlus size={13} /> Add
                </button>
              )}
            </div>

            {/* Add member search */}
            {showAddMembers && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <FiSearch style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)'
                  }} />
                  <input
                    value={search}
                    onChange={handleSearch}
                    placeholder="Search people to add..."
                    autoFocus
                    style={{
                      width: '100%', padding: '9px 14px 9px 36px',
                      background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {searchResults.map(u => (
                  <div key={u._id} onClick={() => handleAddMember(u)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
                      background: 'var(--bg-tertiary)', marginBottom: '6px'
                    }}>
                    <Avatar src={u.avatar} name={u.displayName} size={32} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{u.displayName}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{u.username}</p>
                    </div>
                    <FiUserPlus style={{ marginLeft: 'auto', color: 'var(--accent)' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Member rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {members.map(member => {
                const memberId = member._id || member
                const isMe = memberId === user?._id
                const memberIsAdmin = isMemberAdmin(memberId)
                return (
                  <div key={memberId} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 10px', borderRadius: '10px',
                    background: isMe ? 'rgba(124,58,237,0.08)' : 'transparent'
                  }}>
                    <Avatar src={member.avatar} name={member.displayName} size={38} online={member.isOnline} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.displayName}{isMe ? ' (you)' : ''}
                        </p>
                        {memberIsAdmin && (
                          <span style={{
                            background: 'rgba(124,58,237,0.2)', color: 'var(--accent-light)',
                            fontSize: '10px', padding: '1px 6px', borderRadius: '6px', fontWeight: 600,
                            flexShrink: 0
                          }}>
                            Admin
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{member.username}</p>
                    </div>

                    {/* Admin actions on other members */}
                    {isAdmin && !isMe && (
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {!memberIsAdmin && (
                          <button onClick={() => handleMakeAdmin(memberId)} title="Make admin" style={{
                            background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-muted)',
                            padding: '6px', borderRadius: '8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center'
                          }}>
                            <FiShield size={14} />
                          </button>
                        )}
                        <button onClick={() => handleRemoveMember(memberId)} title="Remove" style={{
                          background: 'var(--bg-tertiary)', border: 'none', color: 'var(--danger)',
                          padding: '6px', borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center'
                        }}>
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leave group */}
          <div style={{ padding: '0 20px 20px' }}>
            <button onClick={handleGenerateInvite} style={{ width: '100%', padding: '12px', marginBottom: '8px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px', color: 'var(--accent-light)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {copied ? <><FiCheck /> Link Copied!</> : <><FiLink /> {inviteLink ? 'Copy Invite Link' : 'Generate Invite Link'}</>}
          </button>
          {inviteLink && (
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', wordBreak: 'break-all', fontSize: '12px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {inviteLink}
            </div>
          )}
          <button onClick={handleLeave} style={{
              width: '100%', padding: '12px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px', color: 'var(--danger)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <FiLogOut /> Leave Group
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default GroupInfoPanel
