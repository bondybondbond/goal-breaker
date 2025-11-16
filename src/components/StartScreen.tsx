import React, { useState } from 'react';

interface StartScreenProps {
  onStart: (goalText: string, useAI: boolean) => void;
  onLoadCanvas: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onLoadCanvas }) => {
  const [goalText, setGoalText] = useState('');
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canvasList, setCanvasList] = useState<any[]>([]);

  // Auto-focus on mount (like Google)
  React.useEffect(() => {
    inputRef.current?.focus();
    
    // Load canvas list for menu
    try {
      const storedList = localStorage.getItem('canvasList');
      const list = storedList ? JSON.parse(storedList) : [];
      setCanvasList(list);
    } catch (error) {
      console.error('Failed to load canvas list:', error);
    }
  }, []);

  const handleSubmit = (useAI: boolean) => {
    if (goalText.trim()) {
      let processedGoal = goalText.trim();
      // For manual mode, truncate to 55 chars + ".." if needed
      if (!useAI && processedGoal.length > 55) {
        processedGoal = processedGoal.substring(0, 55) + '..';
      }
      onStart(processedGoal, useAI);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      {/* Decorative pattern overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.5) 35px, rgba(255,255,255,.5) 70px)`
      }} />

      {/* Header with menu button and title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '20px',
        position: 'relative',
        zIndex: 2
      }}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            width: '40px',
            height: '40px',
            border: 'none',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: 'white',
            transition: 'all 0.2s'
          }}
          title="My Canvases"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
          }}
        >
          ☰
        </button>
        <h2 style={{
          margin: 0,
          fontFamily: '"Segoe UI Black", "Arial Black", sans-serif',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '24px',
          letterSpacing: '1px',
          color: 'white',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🎯</span>
          <span style={{ fontStyle: 'italic' }}>GOAL BREAKER</span>
        </h2>
      </div>

      {/* Canvas Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            style={{
              position: 'fixed',
              top: '90px',
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
              top: '90px',
              left: 0,
              width: '300px',
              height: 'calc(100vh - 90px)',
              backgroundColor: 'white',
              boxShadow: '2px 0 10px rgba(0,0,0,0.2)',
              zIndex: 10000,
              padding: '20px',
              overflowY: 'auto'
            }}
          >
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>My Canvases</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                style={{
                  width: '30px',
                  height: '30px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            {/* Canvas List */}
            {canvasList.length === 0 ? (
              <p style={{ color: '#999', fontSize: '14px' }}>No saved canvases yet. Create your first goal above!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {canvasList
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.lastSaved || 0).getTime();
                    const dateB = new Date(b.lastSaved || 0).getTime();
                    return dateB - dateA; // Descending order (newest first)
                  })
                  .map((canvas) => (
                  <button
                    key={canvas.id}
                    onClick={() => {
                      localStorage.setItem('currentCanvasId', canvas.id);
                      onLoadCanvas();
                    }}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e0e0e0';
                      e.currentTarget.style.borderColor = '#4A90E2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                      {canvas.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {canvas.goals?.length || 0} goal{canvas.goals?.length !== 1 ? 's' : ''} • {new Date(canvas.lastSaved).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Main Content - Centered */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '600px',
          padding: '40px'
        }}>
          {/* Question */}
          <h1 style={{
            fontSize: '28px',
            fontWeight: '400',
            color: 'white',
            fontStyle: 'italic',
            marginBottom: '32px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            What do you want to solve today?
          </h1>

          {/* Input Box - Google style single line */}
          <textarea
            ref={inputRef}
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="Type your goal here..."
            style={{
              width: '100%',
              minHeight: '48px',
              maxHeight: '120px',
              padding: '12px 16px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '24px',
              resize: 'none',
              fontFamily: 'inherit',
              marginBottom: '8px',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              outline: 'none',
              transition: 'box-shadow 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(false);
              }
            }}
          />

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center'
          }}>
            {/* Manual Mode Button */}
            <button
              onClick={() => handleSubmit(false)}
              disabled={!goalText.trim()}
              style={{
                padding: '12px 28px',
                fontSize: '16px',
                fontWeight: '500',
                backgroundColor: goalText.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                color: goalText.trim() ? '#667eea' : 'rgba(255,255,255,0.5)',
                border: 'none',
                borderRadius: '24px',
                cursor: goalText.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: goalText.trim() ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (goalText.trim()) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (goalText.trim()) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                }
              }}
            >Build manually</button>

            {/* AI Mode Button */}
            <button
              onClick={() => handleSubmit(true)}
              disabled={!goalText.trim()}
              style={{
                padding: '12px 28px',
                fontSize: '16px',
                fontWeight: '500',
                backgroundColor: goalText.trim() ? '#FCD34D' : 'rgba(255,255,255,0.3)',
                color: goalText.trim() ? '#1F2937' : 'rgba(255,255,255,0.5)',
                border: 'none',
                borderRadius: '24px',
                cursor: goalText.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: goalText.trim() ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (goalText.trim()) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (goalText.trim()) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                }
              }}
            >Get ✨ AI help</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
