import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateUser } from '../../store/slices/authSlice'
import api from '../../services/api'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import { FiX, FiCamera, FiUser, FiInfo } from 'react-icons/fi'
import toast from 'react-hot-toast'

const ProfileModal = ({ onClose }) => {
  const dispatch = useDispatch()
  const { user } = useSelector(state => state.auth)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

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
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
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
          <h3 style={{ fontWeight: 600 }}>Edit Profile</h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-tertiary)', border: 'none',
            color: 'var(--text-secondary)', padding: '6px',
            borderRadius: '8px', display: 'flex',
            alignItems: 'center', fontSize: '16px'
          }}>
            <FiX />
          </button>
        </div>

        {/* Avatar */}
        <div style={{
          padding: '24px', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: '16px'
        }}>
          <div style={{ position: 'relative' }}>
            <Avatar src={user?.avatar} name={user?.displayName} size={80} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                background: 'var(--accent)', border: 'none',
                color: '#fff', width: '28px', height: '28px',
                borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
              {uploading ? '...' : <FiCamera />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Tap camera to change photo
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Display Name */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <FiUser /> Display Name
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
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
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Write something about yourself..."
              rows={3}
              maxLength={150}
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
      </div>
    </div>
  )
}

export default ProfileModal
