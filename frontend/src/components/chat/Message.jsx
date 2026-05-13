import Avatar from '../ui/Avatar'
import { format } from 'date-fns'
import { FiCheck } from 'react-icons/fi'
import { MdDoneAll } from 'react-icons/md'

const Message = ({ message, isOwn, showAvatar }) => {
  if (message.type === 'system') {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-muted)',
          fontSize: '12px', padding: '4px 12px',
          borderRadius: '20px'
        }}>
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '8px', marginBottom: '2px',
      animation: 'fadeIn 0.2s ease'
    }}>
      {/* Avatar for group chats */}
      {!isOwn && showAvatar && (
        <Avatar
          src={message.sender?.avatar}
          name={message.sender?.displayName}
          size={28}
        />
      )}
      {!isOwn && !showAvatar && <div style={{ width: 28 }} />}

      {/* Bubble */}
      <div style={{
        maxWidth: '65%',
        background: isOwn ? 'var(--sent-bubble)' : 'var(--received-bubble)',
        borderRadius: isOwn
          ? '18px 18px 4px 18px'
          : '18px 18px 18px 4px',
        padding: '10px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {/* Sender name in group */}
        {!isOwn && showAvatar && (
          <p style={{
            fontSize: '11px', fontWeight: 600,
            color: 'var(--accent-light)', marginBottom: '4px'
          }}>
            {message.sender?.displayName}
          </p>
        )}

        {/* Deleted message */}
        {message.isDeleted ? (
          <p style={{
            fontSize: '14px', fontStyle: 'italic',
            color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'
          }}>
            🚫 This message was deleted
          </p>
        ) : (
          <>
            {/* Image */}
            {message.type === 'image' && message.mediaUrl && (
              <img src={message.mediaUrl} alt="media"
                style={{
                  maxWidth: '240px', borderRadius: '10px',
                  display: 'block', marginBottom: '6px'
                }}
              />
            )}

            {/* Text content */}
            {message.content && (
              <p style={{
                fontSize: '14px', lineHeight: '1.5',
                color: isOwn ? '#fff' : 'var(--text-primary)',
                wordBreak: 'break-word'
              }}>
                {message.content}
              </p>
            )}
          </>
        )}

        {/* Time + Status */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', gap: '4px',
          marginTop: '4px'
        }}>
          {message.isEdited && (
            <span style={{
              fontSize: '10px',
              color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)'
            }}>edited</span>
          )}
          <span style={{
            fontSize: '11px',
            color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'
          }}>
            {message.createdAt
              ? format(new Date(message.createdAt), 'HH:mm')
              : ''}
          </span>
          {isOwn && (
            message.readBy?.length > 0
              ? <MdDoneAll style={{ fontSize: '14px', color: '#60a5fa' }} />
              : <FiCheck style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }} />
          )}
        </div>

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '4px',
            marginTop: '6px'
          }}>
            {[...new Set(message.reactions.map(r => r.emoji))].map(emoji => (
              <span key={emoji} style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '20px', padding: '2px 6px',
                fontSize: '12px'
              }}>
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
