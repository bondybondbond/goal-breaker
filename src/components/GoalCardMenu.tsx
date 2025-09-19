import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Check, X, Eye, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface GoalCardMenuProps {
  onComplete: () => void;
  onRemove: () => void;
  onFocus: () => void;
  onSetPriority: (priority: 'high' | 'medium' | 'low') => void;
  isCompleted: boolean;
  isFocused: boolean;
  isRootGoal?: boolean;
  priority?: 'high' | 'medium' | 'low';
  onMenuStateChange?: (isOpen: boolean) => void;
}

const GoalCardMenu: React.FC<GoalCardMenuProps> = ({
  onComplete,
  onRemove,
  onFocus,
  onSetPriority,
  isCompleted,
  isFocused,
  isRootGoal = false,
  priority = 'medium',
  onMenuStateChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onMenuStateChange?.(false);
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
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onMenuStateChange?.(newIsOpen);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    onMenuStateChange?.(false);
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
        <div className="absolute right-0 top-8 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[150px]">
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

          {!isRootGoal && (
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
          )}

          {!isRootGoal && (
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
          )}

          {/* Priority Selection - Only show for non-root goals */}
          {!isRootGoal && (
            <div className="border-t border-gray-200 pt-1 mt-1">
              <div className="px-3 py-1 text-xs text-gray-500 font-medium">Priority</div>
              <div className="flex">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(() => onSetPriority('high'));
                  }}
                  className={`flex-1 px-2 py-2 text-center hover:bg-gray-100 flex items-center justify-center gap-1 text-sm ${
                    priority === 'high' ? 'bg-green-100 text-green-700' : 'text-gray-600'
                  }`}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(() => onSetPriority('medium'));
                  }}
                  className={`flex-1 px-2 py-2 text-center hover:bg-gray-100 flex items-center justify-center gap-1 text-sm ${
                    priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600'
                  }`}
                >
                  <Minus size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(() => onSetPriority('low'));
                  }}
                  className={`flex-1 px-2 py-2 text-center hover:bg-gray-100 flex items-center justify-center gap-1 text-sm ${
                    priority === 'low' ? 'bg-red-100 text-red-700' : 'text-gray-600'
                  }`}
                >
                  <ArrowDown size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalCardMenu;
