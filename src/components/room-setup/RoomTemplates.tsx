'use client'

import { useEffect } from 'react'
import { createRectanglePoints, createLShapePoints, Room } from '@/components/context/FloorPlanContext'

interface RoomTemplate {
  type: 'rectangle' | 'l-shape'
  name: string
  points: Array<{ x: number; y: number }>
  icon: string
  description: string
}

interface RoomTemplatesProps {
  onSelect: (template: Omit<Room, 'id' | 'color' | 'zIndex'>) => void
  onClose: () => void
}

export function RoomTemplates({ onSelect, onClose }: RoomTemplatesProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const templates: RoomTemplate[] = [
    {
      type: 'rectangle',
      name: 'Rectangle',
      points: createRectanglePoints(20, 20, 30, 25),
      icon: '⬜',
      description: 'Perfect for living rooms, bedrooms, and offices'
    },
    {
      type: 'l-shape',
      name: 'L-Shape',
      points: createLShapePoints(20, 20, 30, 25, 20, 15, 'bottom-right'),
      icon: '🔄',
      description: 'Great for kitchens and combined spaces'
    }
  ]

  const handleSelect = (template: RoomTemplate) => {
    const roomTemplate: Omit<Room, 'id' | 'color' | 'zIndex'> = {
      name: `${template.name} Room`,
      type: template.type,
      points: template.points
    }
    onSelect(roomTemplate)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Choose Room Type</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {templates.map((template) => (
            <button
              key={template.type}
              onClick={() => handleSelect(template)}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="text-3xl">{template.icon}</div>
                
                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-violet-900">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {template.description}
                  </p>
                </div>
                
                {/* Arrow */}
                <div className="text-gray-400 group-hover:text-violet-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t">
          <p className="text-xs text-gray-500 text-center">
            You can resize and move rooms after creating them
          </p>
        </div>
      </div>
    </div>
  )
}

// Add CSS animation for slide up
const style = `
  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = style
  document.head.appendChild(styleSheet)
} 