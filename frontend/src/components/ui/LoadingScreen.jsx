const LoadingScreen = () => (
  <div style={{
    height: '100vh', width: '100vw',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-primary)', gap: '16px'
  }}>
    <div style={{
      width: '48px', height: '48px',
      border: '3px solid var(--border)',
      borderTop: '3px solid var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
      Loading Dark Horse...
    </p>
  </div>
)
export default LoadingScreen
