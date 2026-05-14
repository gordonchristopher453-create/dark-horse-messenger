import { format } from 'date-fns'
import Avatar from '../ui/Avatar'
import { FiCheck, FiDownload } from 'react-icons/fi'
import { MdDoneAll } from 'react-icons/md'

const Message = ({ message, isOwn, showAvatar }) => {
  if (message.type === 'system') {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={{
          background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
          fontSize: '12px', padding: '4px 12px', borderRadius: '20px'
        }}>
          {message.content}
        </span>
      </div>
    )
  }

  const bubbleStyle = {
    maxWidth: '65%',
    background: isOwn ? 'var(--sent-bubble)' : 'var(--received-bubble)',
    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    padding: message.type === 'image' || message.type === 'video' ? '4px' : '10px 14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    overflow: 'hidden'
  }

  const timeStyle = {
    fontSize: '11px',
    color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'
  }

  const renderContent = () => {
    if (message.isDeleted) {
      return (
        <p style={{ fontSize: '14px', fontStyle: 'italic', color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
          🚫 This message was deleted
        </p>
      )
    }

    switch (message.type) {
      case 'image':
        return (
          <div>
            <img
              src={message.mediaUrl}
              alt="sent image"
              onClick={() => window.open(message.mediaUrl, '_blank')}
              style={{
                maxWidth: '250px', maxHeight: '300px',
                width: '100%', objectFit: 'cover',
                borderRadius: message.content ? '12px 12px 0 0' : '12px',
                display: 'block', cursor: 'pointer'
              }}
            />
            {message.content && (
              <p style={{ padding: '8px 10px', fontSize: '14px', color: isOwn ? '#fff' : 'var(--text-primary)' }}>
                {message.content}
              </p>
            )}
          </div>
        )

      case 'video':
        return (
          <div>
            <video controls style={{ maxWidth: '250px', maxHeight: '300px', borderRadius: '12px', display: 'block' }}>
              <source src={message.mediaUrl} />
              Your browser does not support video.
            </video>
            {message.content && (
              <p style={{ padding: '8px 10px', fontSize: '14px', color: isOwn ? '#fff' : 'var(--text-primary)' }}>
                {message.content}
              </p>
            )}
          </div>
        )

      case 'audio':
      case 'voice':
        return (
          <div style={{ padding: '4px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎤</span>
              <audio controls style={{ maxWidth: '200px', height: '36px' }}>
                <source src={message.mediaUrl} />
              </audio>
            </div>
          </div>
        )

      case 'document':
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '4px', background: 'rgba(0,0,0,0.2)',
            borderRadius: '10px'
          }}>
            <span style={{ fontSize: '28px' }}>📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '13px', fontWeight: 600,
                color: isOwn ? '#fff' : 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {message.mediaMeta?.fileName || message.fileName || 'Document'}
              </p>
              {message.mediaMeta?.size && (
                <p style={{ fontSize: '11px', color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                  {(message.mediaMeta.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" download
              style={{ color: isOwn ? '#fff' : 'var(--accent)', fontSize: '18px' }}>
              <FiDownload />
            </a>
          </div>
        )

      default:
        return (
          <p style={{
            fontSize: '14px', lineHeight: '1.5',
            color: isOwn ? '#fff' : 'var(--text-primary)',
            wordBreak: 'break-word'
          }}>
            {message.content}
          </p>
        )
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: '8px',
      marginBottom: '2px',
      animation: 'fadeIn 0.2s ease'
    }}>
      {/* Avatar for group chats */}
      {!isOwn && showAvatar && (
        <Avatar src={message.sender?.avatar} name={message.sender?.displayName} size={28} />
      )}
      {!isOwn && !showAvatar && <div style={{ width: 28 }} />}

      {/* Bubble */}
      <div style={bubbleStyle}>
        {/* Sender name in group */}
        {!isOwn && showAvatar && (
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-light)', marginBottom: '4px', padding: message.type === 'image' ? '6px 10px 0' : '0' }}>
            {message.sender?.displayName}
          </p>
        )}

        {renderContent()}

        {/* Time + Status */}
        {message.type !== 'image' && message.type !== 'video' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
            {message.isEdited && (
              <span style={{ fontSize: '10px', color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)' }}>edited</span>
            )}
            <span style={timeStyle}>
              {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : ''}
            </span>
            {isOwn && (
              message.readBy?.length > 0
                ? <MdDoneAll style={{ fontSize: '14px', color: '#60a5fa' }} />
                : message.deliveredTo?.length > 1
                  ? <MdDoneAll style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }} />
                  : <FiCheck style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }} />
            )}
          </div>
        )}

        {/* Time for image/video */}
        {(message.type === 'image' || message.type === 'video') && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', padding: '4px 8px' }}>
            <span style={timeStyle}>
              {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : ''}
            </span>
            {isOwn && (
              message.readBy?.length > 0
                ? <MdDoneAll style={{ fontSize: '14px', color: '#60a5fa' }} />
                : <FiCheck style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }} />
            )}
          </div>
        )}

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px', padding: '0 4px 4px' }}>
            {[...new Set(message.reactions.map(r => r.emoji))].map(emoji => (
              <span key={emoji} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px 6px', fontSize: '12px' }}>
                {emoji} {message.reactions.filter(r => r.emoji === emoji).length}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Message
