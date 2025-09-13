import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Check, X, Eye } from 'lucide-react';

interface GoalCardMenuProps {
  onComplete: () => void;
  onRemove: () => void;
  onFocus: () => void;
  isCompleted: boolean;
  isFocused: boolean;
}

const GoalCardMenu: React.FC<GoalCardMenuProps> = ({
  onComplete,
  onRemove,
  onFocus,
  isCompleted,
  isFocused
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleMenuClick}
        className="p-1 rounded hover:bg-gray-200 transition-colors"
        aria-label="More options"
      >
        <MoreVertical size={16} className="text-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction(onComplete);
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
          >
            <Check size={14} className={isCompleted ? 'text-green-600' : 'text-gray-600'} />
            <span className={isCompleted ? 'text-green-600' : ''}>
              {isCompleted ? 'Completed' : 'Complete'}
            </span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction(onRemove);
            }}
            className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600"
          >
            <X size={14} />
            <span>Remove</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction(onFocus);
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
          >
            <Eye size={14} className={isFocused ? 'text-purple-600' : 'text-gray-600'} />
            <span className={isFocused ? 'text-purple-600' : ''}>
              {isFocused ? 'Focused' : 'Focus'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GoalCardMenu;
