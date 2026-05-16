import { useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../services/api'
import Avatar from '../ui/Avatar'
import { FiX, FiSearch, FiUsers } from 'react-icons/fi'
import toast from 'react-hot-toast'

const CreateGroupModal = ({ onClose, onGroupCreated }) => {
  const { user } = useSelector(state => state.auth)
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    const val = e.target.value
    setSearch(val)
    if (val.length < 2) return setSearchResults([])
    try {
      const res = await api.get('/users?search=' + val)
      const users = res.data.data?.users || res.data.data || []
      setSearchResults(users.filter(u => u._id !== user._id))
    } catch {
      toast.error('Search failed')
    }
  }

  const toggleMember = (member) => {
    setSelectedMembers(prev =>
      prev.find(m => m._id === member._id)
        ? prev.filter(m => m._id !== member._id)
        : [...prev, member]
    )
  }

  const handleCreate = async () => {
    if (!groupName.trim()) return toast.error('Group name is required')
    if (selectedMembers.length < 1) return toast.error('Add at least 1 member')
    setLoading(true)
    try {
      const res = await api.post('/groups', {
        groupName: groupName.trim(),
        groupDescription: description.trim(),
        members: selectedMembers.map(m => m._id)
      })
      toast.success('Group created!')
      onGroupCreated(res.data.data.group)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUsers style={{ color: 'var(--accent)', fontSize: '18px' }} />
            <h3 style={{ fontWeight: 700, fontSize: '16px' }}>New Group</h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <FiX />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Group Name */}
          <input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="Group name *"
            style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '14px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
          />

          {/* Description */}
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '14px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
          />

          {/* Search Members */}
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }} />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search people to add..."
              style={{ width: '100%', padding: '12px 14px 12px 36px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '14px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '8px' }}>
              {searchResults.map(member => (
                <div key={member._id} onClick={() => toggleMember(member)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', background: selectedMembers.find(m => m._id === member._id) ? 'var(--accent)' : 'transparent', transition: 'background 0.2s' }}>
                  <Avatar src={member.avatar} name={member.displayName} size={34} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{member.displayName}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{member.username}</p>
                  </div>
                  {selectedMembers.find(m => m._id === member._id) && (
                    <span style={{ color: '#fff', fontSize: '16px' }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Selected Members Tags */}
          {selectedMembers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedMembers.map(member => (
                <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', borderRadius: '20px', padding: '4px 12px' }}>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{member.displayName}</span>
                  <button onClick={() => toggleMember(member)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', padding: 0 }}>
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Selected count */}
          {selectedMembers.length > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
            </p>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={loading || !groupName.trim() || selectedMembers.length === 0}
            style={{ width: '100%', padding: '13px', background: loading || !groupName.trim() || selectedMembers.length === 0 ? 'var(--bg-tertiary)' : 'var(--accent)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}>
            <FiUsers />
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateGroupModal
