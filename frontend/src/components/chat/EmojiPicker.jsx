import { useEffect, useRef } from 'react'
import EmojiPickerReact from 'emoji-picker-react'

const EmojiPicker = ({ onEmojiClick, onClose }) => {
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: '70px', right: '16px',
      zIndex: 1000, borderRadius: '16px',
      overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <EmojiPickerReact
        onEmojiClick={(emojiData) => onEmojiClick(emojiData.emoji)}
        theme="dark"
        searchPlaceholder="Search emoji..."
        width={300}
        height={380}
        previewConfig={{ showPreview: false }}
        skinTonesDisabled
      />
    </div>
  )
}

export default EmojiPicker
