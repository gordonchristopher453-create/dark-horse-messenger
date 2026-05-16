import { useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../services/api'
import Avatar from '../ui/Avatar'
import { FiX, FiSearch, FiUsers, FiLink, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

const CreateGroupModal = ({ onClose, onGroupCreated }) => {
  const { user } = useSelector(state => state.auth)
  const [step, setStep] = useState(1)
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [createdGroup, setCreatedGroup] = useState(null)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSearch = async (e) => {
    setSearch(e.target.value)
    if (e.target.value.length < 2) return setSearchResults([])
    try {
      const res = await api.get(`/users?search=${e.target.value}`)
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
      const group = res.data.data.group
      setCreatedGroup(group)
      try {
        const invRes = await api.post(`/groups/${group._id}/invite`)
        setInviteLink(invRes.data.data.inviteLink)
      } catch {}
      toast.success('Group created!')
      setStep(3)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create group')
    } finally { setLoading(false) }
  }

  const handleOpen = () => {
    if (createdGroup) onGroupCreated(createdGroup)
    onClose()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { width: '100%', maxWidth: '420px', background: 'var(--bg-secondary)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
    header: { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
    body: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' },
    input: { width: '100%', padding: '11px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' },
    btn: { width: '100%', padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    closeBtn: { background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {step === 2 && <button onClick={() => setStep(1)} style={s.closeBtn}>←</button>}
            <h3 style={{ fontWeight: 600, fontSize: '16px' }}>
              {step === 1 ? 'New Group' : step === 2 ? 'Add Members' : '🎉 Group Created!'}
            </h3>
          </div>
          {step !== 3 && <button onClick={onClose} style={s.closeBtn}><FiX /></button>}
        </div>

        {step === 1 && (
          <div style={s.body}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>👥</div>
            </div>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name *" style={s.input} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" style={s.input} />
            <button onClick={() => { if (!groupName.trim()) return toast.error('Group name is required'); setStep(2) }} style={s.btn}>
              Next → Add Members
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={s.body}>
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }} />
              <input value={search} onChange={handleSearch} placeholder="Search by name or username..." autoFocus style={{ ...s.input, paddingLeft: '36px' }} />
            </div>
            {searchResults.length > 0 && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {searchResults.map(member => (
                  <div key={member._id} onClick={() => toggleMember(member)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                    borderRadius: '10px', cursor: 'pointer',
                    background: selectedMembers.find(m => m._id === member._id) ? 'rgba(124,58,237,0.2)' : 'var(--bg-tertiary)',
                    border: selectedMembers.find(m => m._id === member._id) ? '1px solid var(--accent)' : '1px solid transparent'
                  }}>
                    <Avatar src={member.avatar} name={member.displayName} size={36} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{member.displayName}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{member.username}</p>
                    </div>
                    {selectedMembers.find(m => m._id === member._id) && (
                      <div style={{ background: 'var(--accent)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiCheck size={12} color="#fff" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedMembers.length > 0 && (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedMembers.map(member => (
                    <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', borderRadius: '20px', padding: '4px 10px 4px 6px', border: '1px solid var(--border)' }}>
                      <Avatar src={member.avatar} name={member.displayName} size={20} />
                      <span style={{ fontSize: '13px' }}>{member.displayName}</span>
                      <button onClick={() => toggleMember(member)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><FiX size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleCreate} disabled={loading || selectedMembers.length < 1} style={{ ...s.btn, opacity: selectedMembers.length < 1 ? 0.5 : 1 }}>
              <FiUsers /> {loading ? 'Creating...' : `Create Group (${selectedMembers.length + 1} members)`}
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={s.body}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>✅</div>
              <p style={{ fontWeight: 700, fontSize: '16px' }}>"{groupName}" created!</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>Share this link to invite people</p>
            </div>
            {inviteLink && (
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>INVITE LINK</p>
                <p style={{ fontSize: '12px', color: 'var(--accent-light)', wordBreak: 'break-all', marginBottom: '10px' }}>{inviteLink}</p>
                <button onClick={handleCopy} style={{ width: '100%', padding: '9px', background: copied ? 'rgba(16,185,129,0.15)' : 'var(--accent)', border: 'none', borderRadius: '8px', color: copied ? '#10b981' : '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {copied ? <><FiCheck /> Copied!</> : <><FiLink /> Copy Invite Link</>}
                </button>
              </div>
            )}
            <button onClick={handleOpen} style={s.btn}>Open Group Chat</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateGroupModal
