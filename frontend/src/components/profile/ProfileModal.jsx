import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateUser } from '../../store/slices/authSlice'
import api from '../../services/api'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import { FiX, FiCamera, FiUser, FiInfo } from 'react-icons/fi'
import toast from 'react-hot-toast'

// Simple QR Code using Google Charts API
const QRCode = ({ value, size = 180 }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=7c3aed&bgcolor=1a1a28`
  return (
    <img src={url} alt="QR Code"
      style={{ width: size, height: size, borderRadius: '12px', display: 'block' }}
    />
  )
}

const ProfileModal = ({ onClose }) => {
  const dispatch = useDispatch()
  const { user } = useSelector(state => state.auth)
  const [tab, setTab] = useState('profile')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const profileUrl = `https://dark-horse-frontend-three.vercel.app/user/${user?.username}`

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      dispatch(updateUser(res.data.data.user))
      toast.success('Profile photo updated!')
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await api.put('/users/profile', { displayName, bio })
      dispatch(updateUser(res.data.data.user))
      toast.success('Profile updated!')
      onClose()
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'var(--bg-secondary)',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0
        }}>
          <h3 style={{ fontWeight: 600 }}>My Profile</h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-tertiary)', border: 'none',
            color: 'var(--text-secondary)', padding: '6px',
            borderRadius: '8px', display: 'flex',
            alignItems: 'center', fontSize: '16px', cursor: 'pointer'
          }}>
            <FiX />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}>
          {['profile', 'qrcode'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '12px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: tab === t ? 600 : 400,
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: '14px', fontFamily: 'inherit'
              }}>
              {t === 'profile' ? '👤 Profile' : '📱 QR Code'}
            </button>
          ))}
        </div>

        {/* Content - scrollable */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar src={user?.avatar} name={user?.displayName} size={80} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    style={{
                      position: 'absolute', bottom: 0, right: 0,
                      background: 'var(--accent)', border: 'none',
                      color: '#fff', width: '28px', height: '28px',
                      borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', cursor: 'pointer'
                    }}>
                    {uploading ? '...' : <FiCamera />}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarChange}
                    accept="image/*" style={{ display: 'none' }} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Tap camera to change photo
                </p>
              </div>

              {/* Username (read only) */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Username
                </label>
                <div style={{
                  padding: '10px 14px', background: 'var(--bg-tertiary)',
                  borderRadius: '10px', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: '14px'
                }}>
                  @{user?.username}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <FiUser /> Display Name
                </label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px', fontSize: '14px',
                    color: 'var(--text-primary)', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Bio */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <FiInfo /> Bio
                </label>
                <textarea value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                  rows={3} maxLength={150}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px', fontSize: '14px',
                    color: 'var(--text-primary)',
                    resize: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'right' }}>
                  {bio.length}/150
                </p>
              </div>

              <Button fullWidth loading={loading} onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          )}

          {/* QR Code Tab */}
          {tab === 'qrcode' && (
            <div style={{
              padding: '24px 20px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px'
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                Share your QR code so people can find you on Dark Horse
              </p>

              <div style={{
                background: '#1a1a28', padding: '20px',
                borderRadius: '16px', border: '2px solid var(--accent)'
              }}>
                <QRCode value={`darkhorse:user:${user?.username}`} size={180} />
              </div>

              <div style={{
                background: 'var(--bg-tertiary)', padding: '10px 20px',
                borderRadius: '20px', border: '1px solid var(--border)'
              }}>
                <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '15px' }}>
                  @{user?.username}
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`@${user?.username}`)
                  toast.success('Username copied!')
                }}
                style={{
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: '12px',
                  padding: '10px 24px', fontWeight: 600,
                  cursor: 'pointer', fontSize: '14px'
                }}>
                📋 Copy Username
              </button>

              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                Others can scan this to find and message you
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
