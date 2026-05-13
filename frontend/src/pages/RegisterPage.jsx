import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { register } from '../store/slices/authSlice'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { FiMail, FiLock, FiUser } from 'react-icons/fi'

const RegisterPage = () => {
  const dispatch = useDispatch()
  const { loading } = useSelector(state => state.auth)
  const [form, setForm] = useState({
    username: '', displayName: '', email: '', password: ''
  })

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = e => {
    e.preventDefault()
    dispatch(register(form))
  }

  return (
    <div style={{
      height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--bg-secondary)',
        borderRadius: '20px', padding: '40px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'var(--accent)', borderRadius: '20px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
            fontSize: '28px'
          }}>🐴</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Join Dark Horse Messenger today
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            type="text"
            name="username"
            placeholder="e.g. johndoe"
            label="Username"
            value={form.username}
            onChange={handleChange}
            icon={<FiUser />}
          />
          <Input
            type="text"
            name="displayName"
            placeholder="e.g. John Doe"
            label="Display Name"
            value={form.displayName}
            onChange={handleChange}
            icon={<FiUser />}
          />
          <Input
            type="email"
            name="email"
            placeholder="Enter your email"
            label="Email"
            value={form.email}
            onChange={handleChange}
            icon={<FiMail />}
          />
          <Input
            type="password"
            name="password"
            placeholder="Min 6 characters"
            label="Password"
            value={form.password}
            onChange={handleChange}
            icon={<FiLock />}
          />
          <Button
            fullWidth
            loading={loading}
            style={{ marginTop: '8px' }}
            onClick={handleSubmit}
          >
            Create Account
          </Button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center', marginTop: '24px',
          color: 'var(--text-muted)', fontSize: '14px'
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
