const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, fullWidth = false, style = {}, loading = false }) => {
  const styles = {
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    secondary: { background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    danger: { background: 'var(--danger)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: 'none' }
  }
  const sizes = {
    sm: { padding: '6px 12px', fontSize: '13px', borderRadius: '8px' },
    md: { padding: '10px 20px', fontSize: '14px', borderRadius: '10px' },
    lg: { padding: '14px 28px', fontSize: '16px', borderRadius: '12px' }
  }
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{
        ...styles[variant], ...sizes[size],
        width: fullWidth ? '100%' : 'auto',
        fontWeight: 600, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', ...style
      }}>
      {loading ? (
        <div style={{
          width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
          borderTop: '2px solid #fff', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      ) : children}
    </button>
  )
}
export default Button
