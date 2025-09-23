import React, { useState, useEffect, useCallback } from 'react';
import { Connection } from '../types/goal.types';
import PPTGoalCard from './PPTGoalCard';
import { ConnectionLines } from './ConnectionLines';
import ConfettiCelebration from './ConfettiCelebration';
import AppNavigation from './AppNavigation';
import { calculatePPTPositions, findGoalById, getChildren } from '../utils/pptHelpers';

interface Goal {
  id: number;
  text: string;
  level: number;
  parentId?: number;
  position: { x: number; y: number };
  completed: boolean;
  isEditing: boolean;
}

const PPTGoalBreaker: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [currentDirection, setCurrentDirection] = useState('up-down');
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [connectorStyle, setConnectorStyle] = useState('straight');
  const [cardSorting, setCardSorting] = useState('off');
  const [exportMessage, setExportMessage] = useState('');
  const [canvasSize, setCanvasSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [helperText, setHelperText] = useState('');
  
  // Celebration system
  const [celebration, setCelebration] = useState({
    isVisible: false,
    type: 'nice' as const
  });

  // Initialize with ultimate goal
  useEffect(() => {
    if (!isStarted) {
      const ultimateGoal: Goal = {
        id: 1,
        text: '',
        level: 0,
        position: { x: 0, y: 0 },
        completed: false,
        isEditing: false // Don't start in editing mode - let user click to start
      };
      // Position the goal immediately in the center
      const centeredGoal = {
        ...ultimateGoal,
        position: {
          x: (canvasSize.width - 400) / 2,  // Center horizontally (400 is initial card width)
          y: (canvasSize.height - 120) / 2 - 50  // Center vertically, slightly above middle
        }
      };
      setGoals([centeredGoal]);
      setSelectedGoal(1); // Auto-select the main goal 
      setNextId(2);
      setIsStarted(true);
    }
  }, [isStarted, canvasSize]);

  // Recalculate positions when goals or direction changes
  useEffect(() => {
    if (goals.length > 0) {
      const repositionedGoals = calculatePPTPositions(goals, canvasSize.width, canvasSize.height, currentDirection);
      setGoals(repositionedGoals);
    }
  }, [currentDirection, canvasSize]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle spacebar for panning (only when NOT editing text)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is currently editing text
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );
      
      if (e.code === 'Space' && !spacePressed && !isEditingText) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Check if user is currently editing text
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );
      
      if (e.code === 'Space' && !isEditingText) {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  // Helper text management (only show during active actions)
  useEffect(() => {
    const anyGoalEditing = goals.some(g => g.isEditing);
    const editingGoal = goals.find(g => g.isEditing);
    const isMainGoalEmpty = goals.length === 1 && goals[0].text === '';
    const mainGoalEditing = editingGoal && editingGoal.level === 0;
    const selectedGoalObj = selectedGoal ? goals.find(g => g.id === selectedGoal) : null;
    
    if (mainGoalEditing && isMainGoalEmpty) {
      setHelperText('👋 Start by typing your main goal - what challenge do you want to solve?');
    } else if (isMainGoalEmpty && selectedGoalObj && selectedGoalObj.level === 0 && !anyGoalEditing) {
      setHelperText('👋 Click the card to start typing your main goal');
    } else if (mainGoalEditing) {
      setHelperText('Escape to cancel • Tab to break down goal');
    } else if (anyGoalEditing) {
      setHelperText('Enter to create sibling • Escape to cancel • Tab to break down goal');
    } else if (selectedGoalObj && !anyGoalEditing) {
      // Show shortcuts when a card is selected but not editing
      if (selectedGoalObj.level === 0) {
        setHelperText('Click to edit • Tab to break down goal');
      } else {
        setHelperText('Click to edit • Tab to break down • Enter to add sibling');
      }
    } else if (isPanning || spacePressed) {
      setHelperText('Space + drag or middle mouse to pan');
    } else {
      setHelperText(''); // No helper text when just browsing
    }
  }, [goals, spacePressed, isPanning, selectedGoal]);

  // Canvas panning handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button or spacebar + left click for panning
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startOffset = { ...canvasOffset };
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        setCanvasOffset({
          x: startOffset.x + deltaX,
          y: startOffset.y + deltaY
        });
      };
      
      const handleMouseUp = () => {
        setIsPanning(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else if (e.button === 0 && !spacePressed) {
      // Only deselect/stop editing if clicking on actual empty space (not on a card)
      const clickedElement = e.target as HTMLElement;
      const clickedOnCard = clickedElement.closest('[data-goal-card]') || 
                           clickedElement.tagName === 'TEXTAREA' || 
                           clickedElement.tagName === 'INPUT';
      
      if (!clickedOnCard) {
        // Small delay to allow blur event to complete first
        setTimeout(() => {
          setSelectedGoal(null);
          setGoals(prev => prev.map(goal => ({ ...goal, isEditing: false })));
        }, 50);
      }
    }
  }, [canvasOffset, spacePressed]);

  // Update goal text and exit editing
  const handleUpdateGoal = useCallback((id: number, text: string) => {
    setGoals(prev => prev.map(goal => 
      goal.id === id 
        ? { ...goal, text: text.trim(), isEditing: false }
        : goal
    ));
  }, []);

  // Start editing a goal (and also select it)
  const handleStartEditing = useCallback((id: number) => {
    setSelectedGoal(id); // Also select the goal when starting to edit
    setGoals(prev => prev.map(goal => 
      goal.id === id 
        ? { ...goal, isEditing: true }
        : { ...goal, isEditing: false } // Exit editing for others
    ));
  }, []);

  // Toggle goal completion
  const handleToggleComplete = useCallback((id: number) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === id) {
        const newCompleted = !goal.completed;
        // Show celebration when completing (not when uncompleting)
        if (newCompleted) {
          setCelebration({ isVisible: true, type: 'nice' });
          setTimeout(() => setCelebration(prev => ({ ...prev, isVisible: false })), 3000);
        }
        return { ...goal, completed: newCompleted };
      }
      return goal;
    }));
  }, []);

  // Add a child goal
  const handleAddChild = useCallback((parentId: number) => {
    const parent = findGoalById(goals, parentId);
    if (!parent) return;

    const newGoalId = nextId;
    const newGoal: Goal = {
      id: newGoalId,
      text: '',
      level: parent.level + 1,
      parentId: parentId,
      position: { x: 0, y: 0 }, // Will be calculated by positioning system
      completed: false,
      isEditing: true
    };

    // Single state update - add the new goal and update positions all at once
    setGoals(prev => {
      // First, stop editing for all existing goals
      const stoppedEditing = prev.map(goal => ({ ...goal, isEditing: false }));
      // Then add the new goal
      const withNewGoal = [...stoppedEditing, newGoal];
      // Finally, calculate positions
      return calculatePPTPositions(withNewGoal, canvasSize.width, canvasSize.height, currentDirection);
    });
    
    // Update other state synchronously
    setSelectedGoal(newGoalId); // Select only the new child
    setNextId(prev => prev + 1);
  }, [goals, nextId, currentDirection, canvasSize]);

  // Add a sibling goal
  const handleAddSibling = useCallback((siblingId: number) => {
    const sibling = findGoalById(goals, siblingId);
    if (!sibling || sibling.level === 0) return; // No siblings for main goal

    const newGoalId = nextId;
    const newGoal: Goal = {
      id: newGoalId,
      text: '',
      level: sibling.level,
      parentId: sibling.parentId,
      position: { x: 0, y: 0 }, // Will be calculated by positioning system
      completed: false,
      isEditing: true
    };

    // Single state update - add the new goal and update positions all at once
    setGoals(prev => {
      // First, stop editing for all existing goals
      const stoppedEditing = prev.map(goal => ({ ...goal, isEditing: false }));
      // Then add the new goal
      const withNewGoal = [...stoppedEditing, newGoal];
      // Finally, calculate positions
      return calculatePPTPositions(withNewGoal, canvasSize.width, canvasSize.height, currentDirection);
    });
    
    // Update other state synchronously
    setSelectedGoal(newGoalId); // Select only the new sibling
    setNextId(prev => prev + 1);
  }, [goals, nextId, currentDirection, canvasSize]);

  // Global Tab handler for adding child to selected goal  
  const [isAddingChild, setIsAddingChild] = useState(false);
  
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle Tab if a goal is selected but NOT editing any goal
      if (e.key === 'Tab' && selectedGoal && !isAddingChild) {
        const anyGoalEditing = goals.some(g => g.isEditing);
        const selectedGoalObj = goals.find(g => g.id === selectedGoal);
        
        if (selectedGoalObj && !anyGoalEditing) {
          e.preventDefault();
          setIsAddingChild(true); // Prevent double-firing
          handleAddChild(selectedGoal);
          // Reset flag after a short delay
          setTimeout(() => setIsAddingChild(false), 200);
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedGoal, goals, handleAddChild, isAddingChild]);

  // Select a goal
  const handleSelectGoal = useCallback((goalId: number) => {
    setSelectedGoal(goalId);
  }, []);

  // Reset/Clear board
  const handleResetBoard = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the board? This cannot be undone.')) {
      const ultimateGoal: Goal = {
        id: 1,
        text: '',
        level: 0,
        position: { x: 0, y: 0 },
        completed: false,
        isEditing: true
      };
      const positioned = calculatePPTPositions([ultimateGoal], canvasSize.width, canvasSize.height, currentDirection);
      setGoals(positioned);
      setSelectedGoal(null); // Don't auto-select after reset
      setNextId(2);
    }
  }, []);

  // Menu toggle
  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  // Generate connection lines
  const generateConnections = useCallback(() => {
    const connections: Connection[] = [];
    goals.forEach(goal => {
      if (goal.parentId) {
        const parent = findGoalById(goals, goal.parentId);
        if (parent) {
          connections.push({
            id: `${parent.id}-${goal.id}`,
            from: { 
              x: parent.position.x + 80, // Center of card
              y: parent.position.y + 30 
            },
            to: { 
              x: goal.position.x + 80, 
              y: goal.position.y + 30 
            },
            completed: goal.completed,
            path: '' // Will be generated by ConnectionLines component
          });
        }
      }
    });
    return connections;
  }, [goals]);

  return (
    <div className="w-full h-screen bg-blue-50 relative overflow-hidden">
      {/* Hidden focus target - satisfies browser focus requirement without visual impact */}
      <div 
        ref={(el) => {
          if (el && isStarted && !goals.some(g => g.isEditing)) {
            // Focus this invisible element to prevent unwanted cursor elsewhere
            setTimeout(() => el.focus(), 100);
          }
        }}
        tabIndex={-1}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        style={{ outline: 'none' }} // Ensure no focus ring
      />
      {/* App Navigation */}
      <AppNavigation
        currentView="canvas"
        setCurrentView={() => {}} // No list view in PPT style
        currentDirection={currentDirection}
        setCurrentDirection={setCurrentDirection}
        connectorStyle={connectorStyle}
        setConnectorStyle={setConnectorStyle}
        cardSorting={cardSorting}
        setCardSorting={setCardSorting}
        focusedGoal={selectedGoal}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        goals={goals}
        onReset={handleResetBoard}
        onGoalsImported={() => {}}
        onExportMessage={setExportMessage}
        onViewChange={() => {}}
      />

      {/* Canvas */}
      <div 
        className={`absolute inset-0 pt-16 ${isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-default'}`}
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onMouseDown={handleCanvasMouseDown}
      >
        {/* Connection Lines */}
        <ConnectionLines 
          connections={generateConnections().map(conn => ({
            ...conn,
            from: {
              x: conn.from.x + canvasOffset.x,
              y: conn.from.y + canvasOffset.y
            },
            to: {
              x: conn.to.x + canvasOffset.x,
              y: conn.to.y + canvasOffset.y
            }
          }))}
          canvasSize={canvasSize}
          connectorStyle={connectorStyle}
          direction={currentDirection}
        />

        {/* Goal Cards */}
        {goals.map(goal => (
          <PPTGoalCard
            key={goal.id}
            goal={{
              ...goal,
              position: {
                x: goal.position.x + canvasOffset.x,
                y: goal.position.y + canvasOffset.y
              }
            }}
            onUpdate={handleUpdateGoal}
            onToggleComplete={handleToggleComplete}
            onStartEditing={handleStartEditing}
            onSelect={handleSelectGoal}
            onAddChild={handleAddChild}
            onAddSibling={handleAddSibling}
            isSelected={selectedGoal === goal.id}
          />
        ))}

        {/* Simple Add Child Button for Selected Goal */}

      </div>

      {/* Helper Text */}
      {helperText && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-md text-center">
            {helperText === 'Enter to create sibling • Escape to cancel • Tab to break down goal' ? (
              <span>
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-400 text-xs font-semibold">Enter</kbd> to create sibling • 
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-400 text-xs font-semibold">Esc</kbd> to cancel • 
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-400 text-xs font-semibold">Tab</kbd> to break down goal
              </span>
            ) : helperText === 'Escape to cancel • Tab to break down goal' ? (
              <span>
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-400 text-xs font-semibold">Esc</kbd> to cancel • 
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-400 text-xs font-semibold">Tab</kbd> to break down goal
              </span>
            ) : helperText.includes('Click to edit') ? (
              <span>
                Click to edit • 
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-400 text-xs font-semibold">Tab</kbd> to break down
                {helperText.includes('Enter to add sibling') && (
                  <span> • <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-400 text-xs font-semibold">Enter</kbd> to add sibling</span>
                )}
              </span>
            ) : helperText === 'Space + drag or middle mouse to pan' ? (
              <span>
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-400 text-xs font-semibold">Space</kbd> + drag or 
                <span className="inline-block w-4 h-4 bg-gray-400 rounded-full mx-1"></span> middle mouse to pan
              </span>
            ) : (
              helperText
            )}
          </div>
        </div>
      )}

      {/* Celebration */}
      <ConfettiCelebration 
        isVisible={celebration.isVisible}
        type={celebration.type}
      />
    </div>
  );
};

export default PPTGoalBreaker;