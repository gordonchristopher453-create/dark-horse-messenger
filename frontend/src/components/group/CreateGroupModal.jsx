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
    setSearch(e.target.value)
    if (e.target.value.length < 2) return setSearchResults([])
    try {
      const res = await api.get(`/users/search?q=${e.target.value}`)
      setSearchResults(res.data.data.users.filter(u => u._id !== user._id))
    } catch { toast.error('Search failed') }
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
        groupName,
        groupDescription: description,
        members: selectedMembers.map(m => m._id)
      })
      toast.success('Group created!')
      onGroupCreated(res.data.data.group)
      onClose()
    } catch { toast.error('Failed to create group') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-secondary)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600 }}>New Group</h3>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
            <FiX />
          </button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name"
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)"
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={handleSearch} placeholder="Search members"
              style={{ width: '100%', padding: '10px 14px 10px 36px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
          </div>
          {searchResults.length > 0 && (
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map(member => (
                <div key={member._id} onClick={() => toggleMember(member)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '10px', cursor: 'pointer', background: selectedMembers.find(m => m._id === member._id) ? 'var(--accent)' : 'var(--bg-tertiary)' }}>
                  <Avatar src={member.avatar} name={member.displayName} size={32} />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{member.displayName}</span>
                  {selectedMembers.find(m => m._id === member._id) && <span style={{ marginLeft: 'auto' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
          {selectedMembers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedMembers.map(member => (
                <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', borderRadius: '20px', padding: '4px 10px' }}>
                  <span style={{ fontSize: '13px' }}>{member.displayName}</span>
                  <button onClick={() => toggleMember(member)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><FiX /></button>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleCreate} disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiUsers /> {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateGroupModal
