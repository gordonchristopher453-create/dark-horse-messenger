const Avatar = ({ src, name = '', size = 40, online = false }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2']
  const color = colors[name.charCodeAt(0) % colors.length] || '#7c3aed'
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {src ? (
        <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%', background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.35, fontWeight: 600, color: '#fff', flexShrink: 0
        }}>
          {initials || '?'}
        </div>
      )}
      {online && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28,
          background: 'var(--online)', borderRadius: '50%',
          border: '2px solid var(--bg-secondary)'
        }} />
      )}
    </div>
  )
}
export default Avatar
