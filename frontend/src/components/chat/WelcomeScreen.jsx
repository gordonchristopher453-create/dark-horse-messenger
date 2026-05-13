const WelcomeScreen = () => (
  <div style={{
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-primary)', gap: '16px'
  }}>
    <div style={{
      width: '80px', height: '80px',
      background: 'var(--accent)', borderRadius: '24px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '36px',
      boxShadow: '0 8px 32px rgba(124,58,237,0.3)'
    }}>🐴</div>
    <h2 style={{ fontSize: '22px', fontWeight: 700 }}>
      Dark Horse Messenger
    </h2>
    <p style={{
      color: 'var(--text-muted)', fontSize: '14px',
      textAlign: 'center', maxWidth: '300px', lineHeight: 1.6
    }}>
      Select a chat to start messaging or search for someone new
    </p>
  </div>
)

export default WelcomeScreen
