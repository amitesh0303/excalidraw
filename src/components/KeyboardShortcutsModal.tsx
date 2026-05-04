/**
 * Keyboard Shortcuts Modal
 * Displays all available keyboard shortcuts
 */

import { useEffect } from 'react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  {
    category: 'Tools',
    items: [
      { key: 'V or 1', action: 'Select tool' },
      { key: 'H', action: 'Hand (Pan)' },
      { key: 'R or 2', action: 'Rectangle' },
      { key: 'O or 3', action: 'Ellipse' },
      { key: 'D or 4', action: 'Diamond' },
      { key: 'L or 5', action: 'Line' },
      { key: 'A or 6', action: 'Arrow' },
      { key: 'P or 7', action: 'Pencil' },
      { key: 'T or 8', action: 'Text' },
      { key: 'E or 9', action: 'Eraser' },
    ]
  },
  {
    category: 'Actions',
    items: [
      { key: 'Ctrl+Z', action: 'Undo' },
      { key: 'Ctrl+Shift+Z or Ctrl+Y', action: 'Redo' },
      { key: 'Delete or Backspace', action: 'Delete selected' },
      { key: 'Esc', action: 'Clear selection' },
      { key: 'Ctrl+0', action: 'Reset zoom' },
    ]
  },
  {
    category: 'Navigation',
    items: [
      { key: 'Space + Drag', action: 'Pan canvas' },
      { key: 'Mouse Wheel', action: 'Zoom in/out' },
      { key: 'Ctrl+Scroll', action: 'Zoom (alternative)' },
    ]
  },
  {
    category: 'General',
    items: [
      { key: '?', action: 'Show this help' },
      { key: 'Esc', action: 'Close dialogs' },
    ]
  }
]

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary, #1e1e1e)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: '32px' }}>
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.6,
                marginBottom: '12px'
              }}>
                {section.category}
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span style={{ opacity: 0.9 }}>{item.action}</span>
                    <kbd style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: 'rgba(124, 58, 237, 0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          opacity: 0.8
        }}>
          💡 <strong>Tip:</strong> Press <kbd style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: '3px',
            fontFamily: 'monospace'
          }}>?</kbd> anytime to show this help
        </div>
      </div>
    </div>
  )
}
