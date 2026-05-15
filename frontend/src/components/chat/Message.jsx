import { useState, useRef } from 'react'
import { format } from 'date-fns'
import Avatar from '../ui/Avatar'
import { FiCheck, FiDownload, FiCornerUpRight, FiTrash2, FiCopy } from 'react-icons/fi'
import { MdDoneAll, MdReply, MdDelete, MdForward } from 'react-icons/md'
import toast from 'react-hot-toast'

const Message = ({ message, isOwn, showAvatar, onReply, onDelete, onForward }) => {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0 })
  const longPressTimer = useRef(null)
  const msgRef = useRef(null)

  const handleLongPress = (e) => {
    e.preventDefault()
    longPressTimer.current = setTimeout(() => {
      const rect = msgRef.current?.getBoundingClientRect()
      const screenHeight = window.innerHeight
      const menuHeight = 160
      let top = rect ? rect.top - menuHeight - 10 : 100
      if (top < 60) top = rect ? rect.bottom + 10 : 100
      setMenuPos({ top: Math.max(60, Math.min(top, screenHeight - menuHeight - 20)) })
      setShowMenu(true)
    }, 500)
  }

  const handlePressEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  const handleDelete = () => {
    setShowMenu(false)
    // Show delete options
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 20px;
    `
    modal.innerHTML = `
      <div style="background: #1a1a28; border-radius: 16px; padding: 24px; width: 100%; max-width: 300px; border: 1px solid #2a2a3d;">
        <h3 style="color: #f0f0f5; font-size: 16px; margin-bottom: 16px; text-align: center;">Delete Message</h3>
        ${isOwn ? `<button id="del-all" style="width: 100%; padding: 12px; background: #ef4444; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; margin-bottom: 8px;">🗑️ Delete for Everyone</button>` : ''}
        <button id="del-me" style="width: 100%; padding: 12px; background: #2a2a3d; color: #f0f0f5; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; margin-bottom: 8px;">Delete for Me</button>
        <button id="del-cancel" style="width: 100%; padding: 12px; background: transparent; color: #a0a0b5; border: 1px solid #2a2a3d; border-radius: 10px; font-size: 14px; cursor: pointer;">Cancel</button>
      </div>
    `
    document.body.appendChild(modal)
    if (isOwn) {
      modal.querySelector('#del-all')?.addEventListener('click', () => {
        onDelete && onDelete(message._id, 'everyone')
        document.body.removeChild(modal)
      })
    }
    modal.querySelector('#del-me')?.addEventListener('click', () => {
      onDelete && onDelete(message._id, 'me')
      document.body.removeChild(modal)
    })
    modal.querySelector('#del-cancel')?.addEventListener('click', () => {
      document.body.removeChild(modal)
    })
  }

  const handleCopy = () => {
    setShowMenu(false)
    if (message.content) {
      navigator.clipboard?.writeText(message.content)
      toast.success('Message copied!')
    }
  }

  if (message.type === 'system') {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>
          {message.content}
        </span>
      </div>
    )
  }

  const renderContent = () => {
    if (message.isDeleted) {
      return <p style={{ fontSize: '14px', fontStyle: 'italic', color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>🚫 This message was deleted</p>
    }
    switch (message.type) {
      case 'image':
        return (
          <div>
            <img src={message.mediaUrl} alt="sent image"
              onClick={() => window.open(message.mediaUrl, '_blank')}
              style={{ maxWidth: '250px', maxHeight: '300px', width: '100%', objectFit: 'cover', borderRadius: message.content ? '12px 12px 0 0' : '12px', display: 'block', cursor: 'pointer' }}
            />
            {message.content && <p style={{ padding: '8px 10px', fontSize: '14px', color: isOwn ? '#fff' : 'var(--text-primary)' }}>{message.content}</p>}
          </div>
        )
      case 'video':
        return (
          <video controls style={{ maxWidth: '250px', maxHeight: '300px', borderRadius: '12px', display: 'block' }}>
            <source src={message.mediaUrl} />
          </video>
        )
      case 'audio':
      case 'voice':
        return (
          <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎤</span>
            <audio controls style={{ maxWidth: '200px', height: '36px' }}>
              <source src={message.mediaUrl} />
            </audio>
          </div>
        )
      case 'document':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
            <span style={{ fontSize: '28px' }}>📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: isOwn ? '#fff' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.mediaMeta?.fileName || 'Document'}
              </p>
              {message.mediaMeta?.size && <p style={{ fontSize: '11px', color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>{(message.mediaMeta.size / 1024).toFixed(1)} KB</p>}
            </div>
            <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" download style={{ color: isOwn ? '#fff' : 'var(--accent)', fontSize: '18px' }}>
              <FiDownload />
            </a>
          </div>
        )
      default:
        return (
          <>
            {/* Reply preview */}
            {message.replyTo && (
              <div style={{ background: 'rgba(0,0,0,0.2)', borderLeft: '3px solid var(--accent)', borderRadius: '6px', padding: '6px 8px', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: 'var(--accent-light)', fontWeight: 600 }}>{message.replyTo.sender?.displayName}</p>
                <p style={{ fontSize: '12px', color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {message.replyTo.content || '📎 Attachment'}
                </p>
              </div>
            )}
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: isOwn ? '#fff' : 'var(--text-primary)', wordBreak: 'break-word' }}>
              {message.content}
            </p>
          </>
        )
    }
  }

  return (
    <>
      {/* Context Menu */}
      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: 'fixed', top: menuPos.top, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-secondary)', borderRadius: '14px',
            border: '1px solid var(--border)', zIndex: 999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex', gap: '4px', padding: '8px',
            minWidth: '280px', justifyContent: 'center'
          }}>
            {/* Reply */}
            <button onClick={() => { setShowMenu(false); onReply && onReply(message) }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 14px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '10px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '20px' }}>
              <MdReply />
              <span style={{ fontSize: '10px' }}>Reply</span>
            </button>

            {/* Forward */}
            <button onClick={() => { setShowMenu(false); onForward && onForward(message) }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 14px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '10px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '20px' }}>
              <MdForward />
              <span style={{ fontSize: '10px' }}>Forward</span>
            </button>

            {/* Copy */}
            {message.content && (
              <button onClick={handleCopy}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 14px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '10px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '20px' }}>
                <FiCopy />
                <span style={{ fontSize: '10px' }}>Copy</span>
              </button>
            )}

            {/* Delete */}
            <button onClick={handleDelete}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 14px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '10px', color: 'var(--danger)', cursor: 'pointer', fontSize: '20px' }}>
              <MdDelete />
              <span style={{ fontSize: '10px', color: 'var(--danger)' }}>Delete</span>
            </button>
          </div>
        </>
      )}

      <div ref={msgRef}
        style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', marginBottom: '2px', animation: 'fadeIn 0.2s ease' }}
        onMouseDown={handleLongPress}
        onMouseUp={handlePressEnd}
        onTouchStart={handleLongPress}
        onTouchEnd={handlePressEnd}
        onContextMenu={(e) => { e.preventDefault(); handleLongPress(e); setTimeout(handlePressEnd, 10) }}
      >
        {!isOwn && showAvatar && <Avatar src={message.sender?.avatar} name={message.sender?.displayName} size={28} />}
        {!isOwn && !showAvatar && <div style={{ width: 28 }} />}

        <div style={{
          maxWidth: '65%',
          background: isOwn ? 'var(--sent-bubble)' : 'var(--received-bubble)',
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: ['image','video'].includes(message.type) ? '4px' : '10px 14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)', overflow: 'hidden'
        }}>
          {!isOwn && showAvatar && (
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-light)', marginBottom: '4px' }}>
              {message.sender?.displayName}
            </p>
          )}

          {renderContent()}

          {!['image','video'].includes(message.type) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
              {message.isEdited && <span style={{ fontSize: '10px', color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)' }}>edited</span>}
              <span style={{ fontSize: '11px', color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
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

          {message.reactions?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {[...new Set(message.reactions.map(r => r.emoji))].map(emoji => (
                <span key={emoji} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px 6px', fontSize: '12px' }}>
                  {emoji} {message.reactions.filter(r => r.emoji === emoji).length}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Message
