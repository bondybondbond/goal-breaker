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
        isEditing: true
      };
      setGoals([ultimateGoal]);
      setSelectedGoal(1);
      setNextId(2);
      setIsStarted(true);
    }
  }, [isStarted]);

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

  // Update goal text and exit editing
  const handleUpdateGoal = useCallback((id: number, text: string) => {
    setGoals(prev => prev.map(goal => 
      goal.id === id 
        ? { ...goal, text: text.trim(), isEditing: false }
        : goal
    ));
  }, []);

  // Start editing a goal
  const handleStartEditing = useCallback((id: number) => {
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

    const newGoal: Goal = {
      id: nextId,
      text: '',
      level: parent.level + 1,
      parentId: parentId,
      position: { x: 0, y: 0 }, // Will be calculated by positioning system
      completed: false,
      isEditing: true
    };

    setGoals(prev => {
      const updated = [...prev, newGoal];
      return calculatePPTPositions(updated, canvasSize.width, canvasSize.height, currentDirection);
    });
    setSelectedGoal(nextId);
    setNextId(prev => prev + 1);
  }, [goals, nextId, currentDirection, canvasSize]);

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
      setSelectedGoal(1);
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
    <div className="w-full h-screen bg-gray-50 relative overflow-hidden">
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
        className="absolute inset-0 pt-16"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
        {/* Connection Lines */}
        <ConnectionLines 
          connections={generateConnections()}
          canvasSize={canvasSize}
          connectorStyle={connectorStyle}
          direction={currentDirection}
        />

        {/* Goal Cards */}
        {goals.map(goal => (
          <PPTGoalCard
            key={goal.id}
            goal={goal}
            onUpdate={handleUpdateGoal}
            onToggleComplete={handleToggleComplete}
            onStartEditing={handleStartEditing}
            onSelect={handleSelectGoal}
            isSelected={selectedGoal === goal.id}
          />
        ))}

        {/* Simple Add Child Button for Selected Goal */}
        {selectedGoal && (
          <div className="fixed bottom-6 right-6">
            <button
              onClick={() => handleAddChild(selectedGoal)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
            >
              <span>+</span>
              Add Child Goal
            </button>
          </div>
        )}
      </div>

      {/* Celebration */}
      <ConfettiCelebration 
        isVisible={celebration.isVisible}
        type={celebration.type}
      />
    </div>
  );
};

export default PPTGoalBreaker;