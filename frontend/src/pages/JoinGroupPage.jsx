import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addChat, setActiveChat } from '../store/slices/chatSlice'
import api from '../services/api'
import toast from 'react-hot-toast'

const JoinGroupPage = () => {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector(state => state.auth)
  const [status, setStatus] = useState('joining')
  const [groupName, setGroupName] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    const join = async () => {
      try {
        const res = await api.post(`/groups/join/${inviteCode}`)
        const group = res.data.data.group
        setGroupName(group.groupName)
        dispatch(addChat(group))
        dispatch(setActiveChat(group))
        setStatus('success')
        setTimeout(() => navigate('/'), 2000)
      } catch (e) {
        setStatus('error')
        toast.error(e.response?.data?.message || 'Invalid invite link')
      }
    }
    join()
  }, [inviteCode])

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: '16px' }}>
      {status === 'joining' && (<><div style={{ fontSize: '40px' }}>🔗</div><p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>Joining group...</p><p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Please wait</p></>)}
      {status === 'success' && (<><div style={{ fontSize: '40px' }}>✅</div><p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>Joined "{groupName}"!</p><p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Redirecting to chat...</p></>)}
      {status === 'error' && (<><div style={{ fontSize: '40px' }}>❌</div><p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>Invalid invite link</p><button onClick={() => navigate('/')} style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>Go Home</button></>)}
    </div>
  )
}

export default JoinGroupPage
