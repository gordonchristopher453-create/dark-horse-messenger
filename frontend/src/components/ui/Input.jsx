const Input = ({ type = 'text', placeholder = '', value, onChange, label, error, icon, style = {}, name }) => (
  <div style={{ width: '100%' }}>
    {label && (
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#a0a0b5' }}>
        {label}
      </label>
    )}
    <div style={{ position: 'relative' }}>
      {icon && (
        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#606075', fontSize: '16px', zIndex: 1, pointerEvents: 'none' }}>
          {icon}
        </div>
      )}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="off"
        style={{
          width: '100%',
          padding: icon ? '12px 12px 12px 40px' : '12px 16px',
          background: '#1a1a28',
          border: `1px solid ${error ? '#ef4444' : '#2a2a3d'}`,
          borderRadius: '10px',
          fontSize: '14px',
          color: '#f0f0f5',
          outline: 'none',
          display: 'block',
          boxSizing: 'border-box',
          ...style
        }}
      />
    </div>
    {error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{error}</p>}
  </div>
)
export default Input
