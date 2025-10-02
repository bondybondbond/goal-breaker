import React, { useState, useRef, useEffect } from 'react';
import { ConnectionLines } from './ConnectionLines';
import { Connection } from '../types/goal.types';

interface SimpleGoal {
  id: number;
  text: string;
  parentId?: number;
  position: { x: number; y: number };
  completed?: boolean; // Track completion state
}

const SimpleGoalBreaker: React.FC = () => {
  const [goals, setGoals] = useState<SimpleGoal[]>([
    { id: 1, text: 'What\'s your main goal?', parentId: undefined, position: { x: 400, y: 80 } }
  ]);
  const [nextId, setNextId] = useState(2);
  
  // ===== SELECTION STATE =====
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [helperText, setHelperText] = useState('');

  // ===== PANNING STATE =====
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Global spacebar detection for panning
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'TEXTAREA') {
        setSpacePressed(true);
        e.preventDefault();
      }
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setPanStart({ x: 0, y: 0 });
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('keyup', handleGlobalKeyUp);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);

  // Helper text based on selection
  useEffect(() => {
    const updateHelperText = () => {
      // Don't show helper text if user is editing (textarea focused)
      if (document.activeElement?.tagName === 'TEXTAREA') {
        setHelperText('');
        return;
      }

      if (selectedGoalId) {
        const selectedGoal = goals.find(g => g.id === selectedGoalId);
        if (selectedGoal) {
          if (!selectedGoal.parentId) {
            // Main goal - no sibling option
            setHelperText('[Tab] to add child');
          } else {
            // Other goals - show both options
            setHelperText('[Tab] to add child, [Enter] to add sibling');
          }
        }
      } else {
        setHelperText(''); // No helper text when nothing selected
      }
    };

    // Update on mount/change
    updateHelperText();

    // Also listen for focus changes globally
    const handleFocusChange = () => updateHelperText();
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    return () => {
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, [selectedGoalId, goals]);

  // Keyboard shortcuts for adding child (Tab) and sibling (Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea
      if (document.activeElement?.tagName === 'TEXTAREA') return;
      
      // Only work if a goal is selected
      if (!selectedGoalId) return;

      const selectedGoal = goals.find(g => g.id === selectedGoalId);
      if (!selectedGoal) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        addChild(selectedGoalId);
      } else if (e.key === 'Enter' && selectedGoal.parentId) {
        // Only allow Enter for non-main goals (those with parentId)
        e.preventDefault();
        addSibling(selectedGoalId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedGoalId, goals]);

  // ===== SELECTION HANDLERS =====
  const handleCardClick = (goalId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent canvas deselect
    setSelectedGoalId(goalId);
  };

  const handleCanvasClick = () => {
    setSelectedGoalId(null); // Deselect when clicking canvas
  };

  // ===== PANNING EVENT HANDLERS =====
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const isMiddleButton = e.button === 1;
    
    if (isMiddleButton) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // Handle middle mouse panning
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
    
    // Handle spacebar + mouse panning
    if (spacePressed && !isPanning) {
      if (!panStart.x && !panStart.y) {
        setPanStart({ x: e.clientX, y: e.clientY });
      } else {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        setCanvasOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };



  // Helper: Check if a goal is a leaf (no children)
  const isLeafGoal = (goalId: number): boolean => {
    return !goals.some(g => g.parentId === goalId);
  };

  // Helper: Check if a goal is at the deepest level in its branch
  const isAtDeepestLevel = (goalId: number): boolean => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !goal.parentId) return false;
    
    // Get all siblings
    const siblings = goals.filter(g => g.parentId === goal.parentId);
    
    // Check if ANY sibling has children (if so, this level is not deepest)
    return siblings.every(sib => isLeafGoal(sib.id));
  };

  // RECALCULATE ALL POSITIONS - PowerPoint Style
  // Now accepts goals array as parameter to avoid closure issues
  const recalculatePositions = (goalsArray: SimpleGoal[]): SimpleGoal[] => {
    const CARD_WIDTH = 160;
    const CARD_HEIGHT = 75;
    const HORIZONTAL_GAP = 40; // Increased from 25 for better spacing
    const VERTICAL_GAP = 40; // Balanced spacing between vertical cards
    
    const newPositions = new Map<number, { x: number; y: number }>();
    
    // Calculate subtree width recursively
    const calculateSubtreeWidth = (goalId: number): number => {
      const children = goalsArray.filter(g => g.parentId === goalId);
      
      if (children.length === 0) {
        return CARD_WIDTH; // Leaf node
      }
      
      const goal = goalsArray.find(g => g.id === goalId);
      if (!goal) return CARD_WIDTH;
      
      // Check if this is Level 1 (ultimate goal's children)
      const isLevel1 = !goal.parentId;
      
      // Check if all children are leaves
      const allChildrenAreLeaves = children.every(child => 
        !goalsArray.some(g => g.parentId === child.id)
      );
      
      if (isLevel1 || !allChildrenAreLeaves) {
        // Horizontal layout - sum all children widths
        const childrenWidth = children.reduce((total, child) => 
          total + calculateSubtreeWidth(child.id) + HORIZONTAL_GAP, 0
        ) - HORIZONTAL_GAP;
        
        return Math.max(CARD_WIDTH, childrenWidth);
      } else {
        // Vertical layout - widest child
        const maxChildWidth = Math.max(...children.map(child => 
          calculateSubtreeWidth(child.id)
        ));
        return Math.max(CARD_WIDTH, maxChildWidth);
      }
    };
    
    // Position nodes recursively
    const positionNode = (goalId: number, x: number, y: number): void => {
      newPositions.set(goalId, { x, y });
      
      const children = goalsArray.filter(g => g.parentId === goalId);
      if (children.length === 0) return;
      
      const goal = goalsArray.find(g => g.id === goalId);
      if (!goal) return;
      
      const isLevel1 = !goal.parentId;
      const allChildrenAreLeaves = children.every(child => 
        !goalsArray.some(g => g.parentId === child.id)
      );
      
      if (isLevel1 || !allChildrenAreLeaves) {
        // Horizontal layout
        const totalWidth = calculateSubtreeWidth(goalId);
        let currentX = x - totalWidth / 2 + CARD_WIDTH / 2;
        
        children.forEach(child => {
          const childWidth = calculateSubtreeWidth(child.id);
          const childX = currentX + childWidth / 2 - CARD_WIDTH / 2;
          const childY = y + CARD_HEIGHT + VERTICAL_GAP;
          
          positionNode(child.id, childX, childY);
          currentX += childWidth + HORIZONTAL_GAP;
        });
      } else {
        // Vertical layout
        let currentY = y + CARD_HEIGHT + VERTICAL_GAP;
        
        children.forEach(child => {
          positionNode(child.id, x, currentY);
          currentY += CARD_HEIGHT + VERTICAL_GAP;
        });
      }
    };
    
    // Start from root (ultimate goal)
    const rootGoal = goalsArray.find(g => !g.parentId);
    if (rootGoal) {
      // Calculate total tree width to center properly
      const totalTreeWidth = calculateSubtreeWidth(rootGoal.id);
      const centerX = Math.max(totalTreeWidth / 2 + 100, 600); // At least 600px from left
      positionNode(rootGoal.id, centerX, 80);
    }
    
    // Return updated goals array with new positions
    return goalsArray.map(goal => ({
      ...goal,
      position: newPositions.get(goal.id) || goal.position
    }));
  };

  // Wrapper to recalculate all positions and update state
  const recalculateAllPositions = () => {
    setGoals(prev => recalculatePositions(prev));
  };

  // OLD positioning function (kept for adding new goals before recalc)
  const calculateGridPosition = (parentId?: number): { x: number; y: number } => {
    if (!parentId) {
      return { x: 600, y: 80 }; // Ultimate goal at top center
    }
    
    const parent = goals.find(g => g.id === parentId);
    if (!parent) return { x: 50, y: 80 };
    
    // Just place near parent - will be recalculated
    return {
      x: parent.position.x,
      y: parent.position.y + 120
    };
  };



  // Add a child to a specific goal
  const addChild = (parentId: number) => {
    const newGoal: SimpleGoal = {
      id: nextId,
      text: 'New sub-goal',
      parentId: parentId,
      position: calculateGridPosition(parentId)
    };
    
    setGoals(prev => {
      const updated = [...prev, newGoal];
      // Recalculate positions immediately with the new goal
      return recalculatePositions(updated);
    });
    setNextId(prev => prev + 1);
  };

  // Add a sibling to a specific goal
  const addSibling = (siblingId: number) => {
    const sibling = goals.find(g => g.id === siblingId);
    if (!sibling) return;

    const newGoal: SimpleGoal = {
      id: nextId,
      text: 'New sibling goal',
      parentId: sibling.parentId,
      position: calculateGridPosition(sibling.parentId)
    };
    
    setGoals(prev => {
      const updated = [...prev, newGoal];
      // Recalculate positions immediately with the new goal (same as addChild)
      return recalculatePositions(updated);
    });
    setNextId(prev => prev + 1);
  };

  // Update goal text
  const updateGoalText = (id: number, newText: string) => {
    setGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, text: newText } : goal
    ));
  };

  // Helper: Get all descendant IDs recursively (for deletion)
  const getAllDescendantIds = (goalId: number): number[] => {
    const children = goals.filter(g => g.parentId === goalId);
    const descendantIds: number[] = [];
    
    children.forEach(child => {
      descendantIds.push(child.id);
      descendantIds.push(...getAllDescendantIds(child.id)); // Recursive
    });
    
    return descendantIds;
  };

  // Delete a goal and all its children
  const deleteGoal = (goalId: number) => {
    const goalToDelete = goals.find(g => g.id === goalId);
    if (!goalToDelete) return;

    // Prevent deleting the main goal (root)
    if (goalToDelete.parentId === undefined) {
      return; // Can't delete main goal
    }

    // Confirmation dialog
    if (!window.confirm("Delete this goal and all its sub-goals?")) {
      return; // User cancelled
    }

    // Get all IDs to delete (goal + all descendants)
    const idsToDelete = [goalId, ...getAllDescendantIds(goalId)];
    
    // Filter out deleted goals and recalculate positions
    setGoals(prev => {
      const filtered = prev.filter(goal => !idsToDelete.includes(goal.id));
      return recalculatePositions(filtered); // Reposition remaining goals
    });
    
    // Clear selection if deleted goal was selected
    if (selectedGoalId && idsToDelete.includes(selectedGoalId)) {
      setSelectedGoalId(null);
      setHelperText('');
    }
  };

  // Toggle goal completion status
  const toggleComplete = (goalId: number) => {
    setGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { ...goal, completed: !goal.completed } 
        : goal
    ));
  };

  // Get children of a goal
  const getChildren = (parentId: number): SimpleGoal[] => {
    return goals.filter(goal => goal.parentId === parentId);
  };

  // Calculate dynamic font size based on text content (like PowerPoint)
  const calculateFontSize = (text: string): number => {
    const charCount = text.length;
    
    // PPT-style logic: more content = smaller font
    if (charCount < 30) return 16; // Short text = large font
    if (charCount < 60) return 14; // Medium text
    if (charCount < 100) return 12; // Longer text
    if (charCount < 150) return 11; // Much longer
    return 10; // Very long text = minimum readable size
  };

  // Render toolbar above selected card
  const renderToolbar = (goal: SimpleGoal) => {
    if (selectedGoalId !== goal.id) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: goal.position.x + 160 - 69, // Right-align: card width (160px) - buttons (23*3=69px)
          top: goal.position.y - 26, // Just above card
          display: 'flex',
          gap: '0', // No gap - buttons touch
          zIndex: 1000 // On top of everything
        }}
      >
        {/* Priority button (placeholder for now) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Priority functionality
          }}
          style={{
            width: '23px',
            height: '23px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            borderRadius: '0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
          title="Set priority"
        >
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: '7px solid #4A90E2'
          }} />
        </button>

        {/* Complete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete(goal.id);
          }}
          style={{
            width: '23px',
            height: '23px',
            border: '1px solid #ddd',
            backgroundColor: goal.completed ? '#c8e6c9' : 'white', // Green when completed
            borderRadius: '0',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22C55E',
            fontWeight: 'bold',
            padding: 0
          }}
          title={goal.completed ? "Mark as incomplete" : "Mark as complete"}
        >
          ✔
        </button>

        {/* Delete button - hidden for main goal */}
        {goal.parentId !== undefined && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteGoal(goal.id);
            }}
            style={{
              width: '23px',
              height: '23px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              borderRadius: '0',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E94B8B',
              fontWeight: 'bold',
              padding: 0
            }}
            title="Delete goal"
          >
            ✖
          </button>
        )}
      </div>
    );
  };

  // Render a goal with absolute positioning
  const renderGoal = (goal: SimpleGoal) => {
    // Calculate goal level for coloring
    const calculateLevel = (g: SimpleGoal): number => {
      if (!g.parentId) return 0;
      const parent = goals.find(goal => goal.id === g.parentId);
      return parent ? calculateLevel(parent) + 1 : 0;
    };
    
    const level = calculateLevel(goal);
    const isLeaf = !goals.some(g => g.parentId === goal.id);
    
    // Clean white cards by default, green when completed
    const bgColor = goal.completed 
      ? '#c8e6c9'  // Green when completed
      : 'white';   // White by default
    
    return (
      <>
        {/* Main card */}
        <div 
          key={goal.id} 
          onClick={(e) => handleCardClick(goal.id, e)}
          style={{ 
            position: 'absolute',
            left: goal.position.x,
            top: goal.position.y,
            border: '1px solid #999', 
            outline: selectedGoalId === goal.id ? '2px solid #333' : 'none',
            outlineOffset: '-1px',
            padding: '6px', 
            backgroundColor: bgColor,
            width: '160px', // FIXED width - never shrinks
            boxSizing: 'border-box', // Include padding in width
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <textarea
            value={goal.text}
            onChange={(e) => updateGoalText(goal.id, e.target.value)}
            style={{ 
              border: 'none', 
              outline: 'none', 
              width: '100%',
              height: '60px',
              resize: 'none',
              backgroundColor: 'transparent',
              fontSize: `${calculateFontSize(goal.text)}px`, // DYNAMIC font size (PPT-style)
              fontFamily: 'inherit',
              textAlign: 'center',
              overflow: 'hidden', // NO SCROLLBAR
              lineHeight: '1.3',
              padding: '12px 4px',
              textDecoration: goal.completed ? 'line-through' : 'none' // Strikethrough when completed
            }}
          />
        </div>

        {/* Add Child button - below card */}
        {selectedGoalId === goal.id && (
          <button
            key={`child-${goal.id}`}
            onClick={() => addChild(goal.id)}
            style={{
              position: 'absolute',
              left: goal.position.x + 70, // Center below card
              top: goal.position.y + 85, // 10px gap below card
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '1px solid #999',
              backgroundColor: 'white', // White like cards
              fontSize: '14px',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            title="Add child"
          >
            +
          </button>
        )}

        {/* Add Sibling button - right of card (only if not level 0) */}
        {selectedGoalId === goal.id && goal.parentId && (
          <button
            key={`sibling-${goal.id}`}
            onClick={() => addSibling(goal.id)}
            style={{
              position: 'absolute',
              left: goal.position.x + 165, // Right of card with smaller gap
              top: goal.position.y + 28, // Vertically centered
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '1px solid #999',
              backgroundColor: 'white', // White like cards
              fontSize: '14px',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            title="Add sibling"
          >
            +
          </button>
        )}
      </>
    );
  };

  // Generate connections between parent and child goals
  const generateConnections = (): Connection[] => {
    const connections: Connection[] = [];
    const CARD_WIDTH = 160;
    const CARD_HEIGHT = 75;
    
    goals.forEach(goal => {
      if (goal.parentId) {
        const parent = goals.find(g => g.id === goal.parentId);
        if (parent) {
          connections.push({
            id: `${parent.id}-${goal.id}`,
            from: {
              x: parent.position.x + CARD_WIDTH / 2,
              y: parent.position.y + CARD_HEIGHT
            },
            to: {
              x: goal.position.x + CARD_WIDTH / 2,
              y: goal.position.y
            },
            completed: false,
            path: ''
          });
        }
      }
    });
    
    return connections;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ outline: 'none', userSelect: 'none' }}>🎯 Goal Breaker</h2>

      


      {/* Canvas area with positioned goals - WITH PANNING */}
      <div 
        ref={canvasRef}
        className={`relative w-full overflow-hidden ${isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grabbing' : 'cursor-default'}`}
        style={{ 
          height: '800px',
          border: '1px dashed #ccc',
          backgroundColor: '#EFF3FF',
          outline: 'none'
        }}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseDown={handleCanvasMouseDown}
        onClick={handleCanvasClick}
      >
        {/* Panning Container */}
        <div
          style={{
            width: '2400px', // Larger canvas for panning
            height: '1600px',
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
            transformOrigin: '0 0',
            backgroundColor: 'transparent'
          }}
        >
          {/* Connection Lines - behind cards */}
          <ConnectionLines 
            connections={generateConnections()}
            canvasSize={{ width: 2400, height: 1600 }}
            connectorStyle='straight'
            direction='up-down'
          />
          
          {/* Goal Cards - on top */}
          {goals.map(goal => renderGoal(goal))}
          
          {/* Toolbar - highest priority (rendered last = on top) */}
          {selectedGoalId && goals.find(g => g.id === selectedGoalId) && 
            renderToolbar(goals.find(g => g.id === selectedGoalId)!)
          }
        </div>
      </div>

      {/* Helper Text - Bottom Center */}
      {helperText && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: '#D9D9D9',
          color: 'black',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: 'none',
          fontSize: '14px',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          {helperText === '[Tab] to add child' ? (
            <span>
              <kbd style={{
                padding: '2px 8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #9CA3AF',
                fontSize: '12px',
                fontWeight: '600',
                color: 'black'
              }}>Tab</kbd> to add child
            </span>
          ) : helperText === '[Tab] to add child, [Enter] to add sibling' ? (
            <span>
              <kbd style={{
                padding: '2px 8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #9CA3AF',
                fontSize: '12px',
                fontWeight: '600',
                color: 'black'
              }}>Tab</kbd> to add child, <kbd style={{
                padding: '2px 8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #9CA3AF',
                fontSize: '12px',
                fontWeight: '600',
                color: 'black'
              }}>Enter</kbd> to add sibling
            </span>
          ) : (
            <span>{helperText}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleGoalBreaker;