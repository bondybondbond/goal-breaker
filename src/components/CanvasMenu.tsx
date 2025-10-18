import React, { useState } from 'react';

interface Canvas {
  id: string;
  name: string;
  customName?: string;
  goals: any[];
  nextId: number;
  lastSaved: string;
}

interface CanvasMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentCanvasId: string;
  canvasList: Canvas[];
  currentGoals: any[];
  onNewCanvas: () => void;
  onSwitchCanvas: (canvasId: string) => void;
  onRenameCanvas: (canvasId: string, newName: string) => void;
  onDeleteCanvas: (canvasId: string) => void;
}

const CanvasMenu: React.FC<CanvasMenuProps> = ({
  isOpen,
  onClose,
  currentCanvasId,
  canvasList,
  currentGoals,
  onNewCanvas,
  onSwitchCanvas,
  onRenameCanvas,
  onDeleteCanvas
}) => {
  const [isRenamingCanvas, setIsRenamingCanvas] = useState(false);
  const [customCanvasName, setCustomCanvasName] = useState<string>('');

  if (!isOpen) return null;

  const currentCanvas = canvasList.find((c: any) => c.id === currentCanvasId);
  // Sort by lastSaved (most recent first)
  const otherCanvases = canvasList
    .filter((c: any) => c.id !== currentCanvasId)
    .sort((a: any, b: any) => {
      const dateA = new Date(a.lastSaved || 0).getTime();
      const dateB = new Date(b.lastSaved || 0).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

  const getCurrentCanvasName = () => {
    if (currentCanvas?.customName) {
      return currentCanvas.customName;
    }
    const mainGoal = currentGoals.find(g => !g.parentId);
    return mainGoal ? mainGoal.text.substring(0, 20) + (mainGoal.text.length > 20 ? '...' : '') : 'Untitled Canvas';
  };

  const handleRenameSubmit = () => {
    if (customCanvasName.trim()) {
      onRenameCanvas(currentCanvasId, customCanvasName.trim());
    }
    setIsRenamingCanvas(false);
  };

  return (
    <>
      {/* Backdrop - dark overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '80px',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 9999
        }}
      />

      {/* Menu Panel */}
      <div
        style={{
          position: 'fixed',
          top: '80px',
          left: 0,
          width: '300px',
          height: 'calc(100vh - 80px)',
          backgroundColor: 'white',
          boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
          zIndex: 10000,
          padding: '20px',
          overflowY: 'auto'
        }}
      >
        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>My Canvases</h3>
          <button
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ✕
          </button>
        </div>

        {/* New Canvas Button */}
        <button
          onClick={() => {
            onNewCanvas();
            onClose();
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#4A90E2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '20px'
          }}
        >
          + New Canvas
        </button>

        {/* Current Canvas */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '10px',
            border: '2px solid #4A90E2'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
            {isRenamingCanvas ? (
              <input
                type="text"
                value={customCanvasName}
                onChange={(e) => setCustomCanvasName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setIsRenamingCanvas(false);
                  }
                }}
                autoFocus
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #4A90E2',
                  borderRadius: '2px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            ) : (
              <>
                <span>{getCurrentCanvasName()}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setCustomCanvasName(getCurrentCanvasName());
                      setIsRenamingCanvas(true);
                    }}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px 6px'
                    }}
                    title="Rename canvas"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this canvas? This cannot be undone.')) {
                        onDeleteCanvas(currentCanvasId);
                        onClose();
                      }
                    }}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px 6px',
                      color: '#e74c3c'
                    }}
                    title="Delete this canvas"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {currentGoals.length} goal{currentGoals.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #ddd', margin: '20px 0' }}></div>

        {/* All Saved Canvases */}
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>All Canvases</h4>
        {otherCanvases.map((canvas: any) => (
          <div
            key={canvas.id}
            onClick={() => {
              onSwitchCanvas(canvas.id);
              onClose();
            }}
            style={{
              padding: '12px',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
              {canvas.name}
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>
              {canvas.goals.length} goal{canvas.goals.length !== 1 ? 's' : ''} • 
              {new Date(canvas.lastSaved).toLocaleDateString()}
            </div>
          </div>
        ))}
        
        {otherCanvases.length === 0 && (
          <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
            No other canvases yet. Click "+ New Canvas" to create one.
          </p>
        )}
      </div>
    </>
  );
};

export default CanvasMenu;
