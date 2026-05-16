import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../services/api'
import toast from 'react-hot-toast'

const JoinGroupPage = () => {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user } = useSelector(state => state.auth)
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    const joinGroup = async () => {
      try {
        const res = await api.post(`/groups/join/${inviteCode}`)
        setGroup(res.data.data.group)
        toast.success(`Joined ${res.data.data.group.groupName}!`)
        setTimeout(() => navigate('/'), 2000)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Invalid or expired invite link')
        setTimeout(() => navigate('/'), 2000)
      } finally { setLoading(false) }
    }
    joinGroup()
  }, [inviteCode, user])

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: '16px' }}>
      {loading ? (
        <>
          <div style={{ fontSize: '48px' }}>🐴</div>
          <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>Joining group...</p>
        </>
      ) : group ? (
        <>
          <div style={{ fontSize: '48px' }}>✅</div>
          <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>Joined {group.groupName}!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Redirecting to chat...</p>
        </>
      ) : (
        <>
          <div style={{ fontSize: '48px' }}>❌</div>
          <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>Invalid invite link</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Redirecting home...</p>
        </>
      )}
    </div>
  )
}

export default JoinGroupPage
