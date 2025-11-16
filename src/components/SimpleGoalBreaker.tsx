import React, { useState, useRef, useEffect } from 'react';
import { ConnectionLines } from './ConnectionLines';
import { Connection } from '../types/goal.types';
import Toolbar from './Toolbar';
import CanvasMenu from './CanvasMenu';
import GoalCard from './GoalCard';
import { getAISubGoals, shortenGoalText } from '../utils/groqApi';

interface SimpleGoal {
  id: number;
  text: string;
  parentId?: number;
  position: { x: number; y: number };
  completed?: boolean; // Track completion state
  isPlaceholder?: boolean; // Track if text is placeholder
}

interface SimpleGoalBreakerProps {
  initialGoal?: string;
  useAI?: boolean;
  onReturnToHome?: () => void;
}

const SimpleGoalBreaker: React.FC<SimpleGoalBreakerProps> = ({ initialGoal, useAI, onReturnToHome }) => {
  // Calculate initial center position
  // Card dimensions for centering
  const CARD_WIDTH = 160;
  const CARD_HEIGHT = 75;
  
  const initialCenterX = typeof window !== 'undefined' ? (window.innerWidth / 2 - CARD_WIDTH / 2) : 520;
  const initialCenterY = typeof window !== 'undefined' ? (window.innerHeight / 3 - CARD_HEIGHT / 2) : 240;
  
  const [goals, setGoals] = useState<SimpleGoal[]>([
    { 
      id: 1, 
      text: initialGoal || 'What\'s your main goal?', 
      parentId: undefined, 
      position: { x: initialCenterX, y: initialCenterY }, 
      isPlaceholder: !initialGoal 
    }
  ]);
  const [nextId, setNextId] = useState(2);
  
  // ===== SELECTION STATE =====
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [helperText, setHelperText] = useState('');
  const [showPanningTip, setShowPanningTip] = useState(false);
  const [showDebugGrid, setShowDebugGrid] = useState(false);

  // ===== AI STATE =====
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [showAIButtonHint, setShowAIButtonHint] = useState(false);

  // ===== MENU STATE =====
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ===== CANVAS STATE =====
  // Generate unique canvas ID on mount
  const [currentCanvasId, setCurrentCanvasId] = useState<string>(() => {
    // If creating NEW canvas (has initialGoal), generate unique ID
    if (initialGoal) {
      try {
        const storedList = localStorage.getItem('canvasList');
        const list = storedList ? JSON.parse(storedList) : [];
        
        // Find highest canvas number
        const maxNum = list.reduce((max: number, canvas: any) => {
          const match = canvas.id.match(/canvas-(\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            return num > max ? num : max;
          }
          return max;
        }, 0);
        
        const newId = `canvas-${maxNum + 1}`;
        return newId;
      } catch (error) {
        console.error('❌ Failed to generate canvas ID, defaulting to canvas-1');
        return 'canvas-1';
      }
    }
    // Loading existing canvas - will be overwritten by load effect
    return 'canvas-1';
  });
  const [canvasList, setCanvasList] = useState<any[]>([]);


  // ===== PANNING STATE =====
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ===== VIEWPORT STATE =====
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  // ===== AUTO-LOAD FROM LOCALSTORAGE ON MOUNT =====
  useEffect(() => {
    
    // If we have an initialGoal, we're starting fresh - don't load old canvas
    if (initialGoal) {
      return;
    }

    try {
      
      // Load canvas list
      const storedList = localStorage.getItem('canvasList');

      const list = storedList ? JSON.parse(storedList) : [];
setCanvasList(list);
      
      // Load last active canvas ID
      const lastCanvasId = localStorage.getItem('currentCanvasId') || 'canvas-1';
      setCurrentCanvasId(lastCanvasId);
      
      // Find and load that canvas
      const canvas = list.find((c: any) => c.id === lastCanvasId);
      if (canvas) {
        setGoals(canvas.goals);
        setNextId(canvas.nextId);
      } else {
      }
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
    }
  }, []); // Empty dependency array = run once on mount

  // ===== AUTO-TRIGGER AI ON MOUNT (if useAI=true) =====
  useEffect(() => {
    // Only trigger if user clicked "Get ✨ AI help" on start screen
    if (!useAI || !initialGoal) return;
    
    // Wait a moment for UI to render, then auto-generate AI suggestions
    const timer = setTimeout(async () => {
      const mainGoal = goals.find(g => !g.parentId);
      if (!mainGoal) return;

      setIsLoadingAI(true); // Show loading state
      
      try {
        // Step 1: Shorten the main goal text first
        const shortenedMainGoal = await shortenGoalText(mainGoal.text);
        
        // Update main goal with shortened text
        setGoals(prev => prev.map(g => 
          g.id === mainGoal.id 
            ? { ...g, text: shortenedMainGoal, isPlaceholder: false }
            : g
        ));
        
        // Step 2: Generate sub-goals using the shortened text
        const suggestions = await getAISubGoals(shortenedMainGoal);
        
        // Create all AI children at once (batch update for efficiency)
        const newChildren: SimpleGoal[] = suggestions.map((suggestion, index) => {
          // Truncate AI text to 52 chars max (3 lines)
          const text = suggestion.text.length <= 52 
            ? suggestion.text 
            : suggestion.text.substring(0, 49) + '...';
          
          return {
            id: nextId + index,
            text: text,
            parentId: mainGoal.id,
            position: calculateGridPosition(mainGoal.id),
            isPlaceholder: false
          };
        });
        
        // Add all children and recalculate positions once
        setGoals(prev => {
          const updated = [...prev, ...newChildren];
          return recalculatePositions(updated);
        });
        
        // Update nextId to account for all new goals
        setNextId(prev => prev + suggestions.length);
        
      } catch (error) {
        console.error('❌ Auto-AI failed:', error);
        alert('Failed to generate AI suggestions. Please try the ✨ button manually.');
      } finally {
        setIsLoadingAI(false);
      }
    }, 800); // Small delay to let canvas render first

    return () => clearTimeout(timer);
  }, [useAI, initialGoal]); // Run when component mounts with useAI

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

  // Track viewport size changes
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Recalculate positions when viewport size changes
  useEffect(() => {
    if (goals.length > 0) {
      recalculateAllPositions();
    }
  }, [viewportSize]);

  // Warn user before refreshing page (would return to homepage/splash screen)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard way to show browser confirmation dialog
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ===== AUTO-SAVE TO LOCALSTORAGE =====
  useEffect(() => {
    
    // Auto-generate canvas name from main goal (first 20 chars)
    const mainGoal = goals.find(g => !g.parentId);
    const canvasName = mainGoal ? mainGoal.text.substring(0, 20) : 'Untitled Canvas';
    
    // Don't save completely empty canvases (only placeholder main goal, nothing else)
    const isEmptyCanvas = goals.length === 1 && 
                          mainGoal?.isPlaceholder === true;
    
    if (isEmptyCanvas) {
      return;
    }
    
    try {
      
      // Load existing canvas list
      const stored = localStorage.getItem('canvasList');
      let list = stored ? JSON.parse(stored) : [];
      
      // Update or add current canvas
      const canvasIndex = list.findIndex((c: any) => c.id === currentCanvasId);
      
      const canvasData = {
        id: currentCanvasId,
        name: canvasName,
        goals,
        nextId,
        lastSaved: new Date().toISOString()
      };
      
      if (canvasIndex >= 0) {
        list[canvasIndex] = canvasData;
      } else {
        list.push(canvasData);
      }
      
      // Enforce 10-canvas limit
      const MAX_CANVASES = 10;
      if (list.length > MAX_CANVASES) {
        // Sort by lastSaved to find oldest
        list.sort((a: any, b: any) => {
          const dateA = new Date(a.lastSaved || 0).getTime();
          const dateB = new Date(b.lastSaved || 0).getTime();
          return dateA - dateB; // Ascending order (oldest first)
        });
        
        // Remove oldest canvas
        const removed = list.shift();
      }
      
      
      // Save updated list
      localStorage.setItem('canvasList', JSON.stringify(list));
      localStorage.setItem('currentCanvasId', currentCanvasId);
      
      
      // Update local canvas list state
      setCanvasList(list);
    } catch (error) {
      console.error('❌ SAVE FAILED:', error);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error type:', error.name);
      }
    }
  }, [goals, nextId, currentCanvasId]);

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

  // ===== AI SUGGESTIONS HANDLER =====
  const handleGetAISuggestions = async () => {
    if (!selectedGoalId) return;
    
    const selectedGoal = goals.find(g => g.id === selectedGoalId);
    if (!selectedGoal) return;

    setIsLoadingAI(true);
    setAiSuggestions([]); // Clear previous suggestions
    
    try {
      // Gather context for better AI suggestions
      const mainGoal = goals.find(g => !g.parentId);
      const parentGoal = selectedGoal.parentId ? goals.find(g => g.id === selectedGoal.parentId) : undefined;
      const siblingGoals = selectedGoal.parentId 
        ? goals.filter(g => g.parentId === selectedGoal.parentId && g.id !== selectedGoal.id).map(g => g.text)
        : [];
      
      const suggestions = await getAISubGoals(selectedGoal.text, {
        mainGoal: mainGoal?.text,
        parentGoalText: parentGoal?.text,
        siblingGoals: siblingGoals
      });
      
      // Extract just the text from suggestions
      const suggestionTexts = suggestions.map(s => s.text);
      setAiSuggestions(suggestionTexts);
      
    } catch (error) {
      console.error('❌ Failed to get AI suggestions:', error);
      alert('Failed to get AI suggestions. Check console for details.');
    } finally {
      setIsLoadingAI(false);
    }
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
        // Vertical layout - indent children to the right (PPT style)
        const indent = 35; // Pixels to indent children to show hierarchy
        let currentY = y + CARD_HEIGHT + VERTICAL_GAP;
        
        children.forEach(child => {
          positionNode(child.id, x + indent, currentY);
          currentY += CARD_HEIGHT + VERTICAL_GAP;
        });
      }
    };
    
    // Start from root (ultimate goal)
    const rootGoal = goalsArray.find(g => !g.parentId);
    if (rootGoal) {
      // Calculate total tree width to center properly
      const totalTreeWidth = calculateSubtreeWidth(rootGoal.id);
      // Use dynamic viewport center - adjust for card dimensions
      const centerX = Math.max(totalTreeWidth / 2, viewportSize.width / 2) - CARD_WIDTH / 2;
      const centerY = viewportSize.height / 3 - CARD_HEIGHT / 2; // 1/3rd from top, centered
      positionNode(rootGoal.id, centerX, centerY);
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
      // Ultimate goal at viewport center horizontally, 1/3rd from top vertically
      // Adjust for card dimensions to center properly
      return { 
        x: viewportSize.width / 2 - CARD_WIDTH / 2, 
        y: viewportSize.height / 3 - CARD_HEIGHT / 2
      };
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
      position: calculateGridPosition(parentId),
      isPlaceholder: true // Mark as placeholder
    };
    
    setGoals(prev => {
      const updated = [...prev, newGoal];
      // Recalculate positions immediately with the new goal
      return recalculatePositions(updated);
    });
    setNextId(prev => prev + 1);
  };

  // Truncate text to 52 chars max (3 lines × ~17 chars)
  const truncateText = (text: string): string => {
    if (text.length <= 52) return text;
    return text.substring(0, 49) + '...'; // 49 chars + "..." = 52 total
  };

  // Add a child with custom text (for AI suggestions)
  const addChildWithText = (parentId: number, text: string) => {
    const truncatedText = truncateText(text); // Truncate long AI text
    
    const newGoal: SimpleGoal = {
      id: nextId,
      text: truncatedText,
      parentId: parentId,
      position: calculateGridPosition(parentId),
      isPlaceholder: false // Not a placeholder - real AI text
    };
    
    setGoals(prev => {
      const updated = [...prev, newGoal];
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
      position: calculateGridPosition(sibling.parentId),
      isPlaceholder: true // Mark as placeholder
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
      goal.id === id ? { ...goal, text: newText, isPlaceholder: false } : goal
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

  // ===== CANVAS MENU HANDLERS =====
  const handleNewCanvas = () => {
    // Return to splash screen to start a new canvas
    if (onReturnToHome) {
      onReturnToHome();
    }
  };

  const handleSwitchCanvas = (canvasId: string) => {
    const canvas = canvasList.find((c: any) => c.id === canvasId);
    if (canvas) {
      setCurrentCanvasId(canvas.id);
      setGoals(canvas.goals);
      setNextId(canvas.nextId);
    }
  };

  const handleRenameCanvas = (canvasId: string, newName: string) => {
    const updatedList = canvasList.map((c: any) => 
      c.id === canvasId ? { ...c, customName: newName } : c
    );
    localStorage.setItem('canvasList', JSON.stringify(updatedList));
    setCanvasList(updatedList);
  };

  const handleDeleteCanvas = (canvasId: string) => {
    const updatedList = canvasList.filter((c: any) => c.id !== canvasId);
    localStorage.setItem('canvasList', JSON.stringify(updatedList));
    setCanvasList(updatedList);
    
    // Return to splash screen after deletion
    if (onReturnToHome) {
      onReturnToHome();
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

  // Generate connections between parent and child goals
  const generateConnections = (): Connection[] => {
    const connections: Connection[] = [];
    const CARD_WIDTH = 160;
    const CARD_HEIGHT = 75;
    
    goals.forEach(goal => {
      if (goal.parentId) {
        const parent = goals.find(g => g.id === goal.parentId);
        if (parent) {
          // Determine if parent uses vertical layout (all children are leaves)
          const parentChildren = goals.filter(g => g.parentId === parent.id);
          const allChildrenAreLeaves = parentChildren.every(child => 
            !goals.some(g => g.parentId === child.id)
          );
          const isLevel1 = !parent.parentId; // Main goal's children
          
          // Vertical layout ONLY if: NOT level 1 AND all children are leaves
          const useVerticalLayout = !isLevel1 && allChildrenAreLeaves;
          
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
            path: '',
            layoutType: useVerticalLayout ? 'vertical' : 'horizontal'
          });
        }
      }
    });
    
    return connections;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header with menu button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            width: '40px',
            height: '40px',
            border: '1px solid #ccc',
            backgroundColor: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}
          title="Canvas Menu"
        >
          ☰
        </button>

        <h2 style={{ outline: 'none', userSelect: 'none', margin: 0, fontFamily: '"Segoe UI Black", "Arial Black", sans-serif', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '26px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontStyle: 'normal' }}>🎯</span>
          <span style={{ fontStyle: 'italic' }}>GOAL BREAKER</span>
        </h2>
      </div>

      {/* Canvas Menu Overlay */}
      <CanvasMenu 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentCanvasId={currentCanvasId}
        canvasList={canvasList}
        currentGoals={goals}
        onNewCanvas={handleNewCanvas}
        onSwitchCanvas={handleSwitchCanvas}
        onRenameCanvas={handleRenameCanvas}
        onDeleteCanvas={handleDeleteCanvas}
      />

      {/* Canvas area with positioned goals - WITH PANNING */}
      <div style={{ position: 'relative' }}>
        {/* Fixed PPT-Style Rulers - Don't move with pan */}
        {showDebugGrid && (
          <>
            {/* Top Ruler */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '25px',
              backgroundColor: '#f3f4f6',
              borderBottom: '1px solid #d1d5db',
              zIndex: 100,
              pointerEvents: 'none',
              overflow: 'hidden'
            }}>
              <svg width="100%" height="25">
                {/* Ruler marks every 50px, centered at 0 like PPT */}
                {(() => {
                  const centerX = viewportSize.width / 2;
                  const marks = [];
                  // Draw from left edge to right edge
                  for (let x = 0; x < viewportSize.width; x += 50) {
                    const rulerValue = Math.round((x - centerX) / 10); // Convert to cm (10px = 1cm)
                    const isMajor = x % 100 === 0; // Every 100px is major tick
                    const showNumber = rulerValue % 10 === 0; // Only show numbers at multiples of 10
                    marks.push(
                      <g key={`top-${x}`}>
                        <line
                          x1={x}
                          y1={isMajor ? 10 : 15}
                          x2={x}
                          y2={25}
                          stroke="#9ca3af"
                          strokeWidth="1"
                        />
                        {showNumber && (
                          <text
                            x={x + 2}
                            y={9}
                            fontSize="9"
                            fill="#4b5563"
                            fontFamily="Arial, sans-serif"
                          >
                            {rulerValue}
                          </text>
                        )}
                      </g>
                    );
                  }
                  return marks;
                })()}
              </svg>
            </div>

            {/* Left Ruler */}
            <div style={{
              position: 'absolute',
              top: '25px',
              left: 0,
              width: '25px',
              bottom: 0,
              backgroundColor: '#f3f4f6',
              borderRight: '1px solid #d1d5db',
              zIndex: 100,
              pointerEvents: 'none',
              overflow: 'hidden'
            }}>
              <svg width="25" height="100%">
                {/* Ruler marks every 50px, centered at 0 like PPT */}
                {(() => {
                  const centerY = viewportSize.height / 3; // Match our card center position
                  const marks = [];
                  // Draw from top edge to bottom edge
                  for (let y = 0; y < 800; y += 50) {
                    const rulerValue = Math.round((y - centerY) / 10); // Convert to cm (10px = 1cm)
                    const isMajor = y % 100 === 0; // Every 100px is major
                    marks.push(
                      <g key={`left-${y}`}>
                        <line
                          x1={isMajor ? 10 : 15}
                          y1={y}
                          x2={25}
                          y2={y}
                          stroke="#9ca3af"
                          strokeWidth="1"
                        />
                        {isMajor && (
                          <text
                            x={20}
                            y={y + 3}
                            fontSize="9"
                            fill="#4b5563"
                            fontFamily="Arial, sans-serif"
                            textAnchor="end"
                          >
                            {rulerValue}
                          </text>
                        )}
                      </g>
                    );
                  }
                  return marks;
                })()}
              </svg>
            </div>

            {/* Corner square */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '25px',
              height: '25px',
              backgroundColor: '#f3f4f6',
              borderRight: '1px solid #d1d5db',
              borderBottom: '1px solid #d1d5db',
              zIndex: 101,
              pointerEvents: 'none'
            }} />
          </>
        )}

  <div 
        ref={canvasRef}
        className={`relative w-full overflow-hidden ${isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grabbing' : 'cursor-default'}`}
        style={{ 
          height: '800px',
          border: '1px dashed #ccc',
          backgroundColor: '#EFF3FF',
          outline: 'none',
          marginLeft: showDebugGrid ? '25px' : '0',
          marginTop: showDebugGrid ? '25px' : '0',
          width: showDebugGrid ? 'calc(100% - 25px)' : '100%'
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
          {/* Debug Grid - PPT Style (moves with canvas) */}
          {showDebugGrid && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '2400px',
                height: '1600px',
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              {/* Light gray grid lines every 100px */}
              {Array.from({ length: 24 }).map((_, i) => (
                <line
                  key={`v${i}`}
                  x1={i * 100}
                  y1={0}
                  x2={i * 100}
                  y2={1600}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  opacity="0.5"
                />
              ))}
              {Array.from({ length: 16 }).map((_, i) => (
                <line
                  key={`h${i}`}
                  x1={0}
                  y1={i * 100}
                  x2={2400}
                  y2={i * 100}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  opacity="0.5"
                />
              ))}
              
              {/* Center guides - RED (for alignment reference) */}
              {/* Vertical center line (X=0) */}
              <line
                x1={viewportSize.width / 2}
                y1={0}
                x2={viewportSize.width / 2}
                y2={1600}
                stroke="#ff6b6b"
                strokeWidth="1.5"
                strokeDasharray="8,4"
                opacity="0.6"
              />
              
              {/* Horizontal center line (Y=0) */}
              <line
                x1={0}
                y1={viewportSize.height / 3}
                x2={2400}
                y2={viewportSize.height / 3}
                stroke="#ff6b6b"
                strokeWidth="1.5"
                strokeDasharray="8,4"
                opacity="0.6"
              />
            </svg>
          )}
          
          {/* Connection Lines - behind cards */}
          <ConnectionLines 
            connections={generateConnections()}
            canvasSize={{ width: 2400, height: 1600 }}
            connectorStyle='straight'
            direction='up-down'
          />
          
          {/* Goal Cards - on top */}
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              selectedGoalId={selectedGoalId}
              allGoals={goals}
              onCardClick={handleCardClick}
              onTextChange={updateGoalText}
              onAddChild={addChild}
              onAddSibling={addSibling}
            />
          ))}
          
          {/* Toolbar - highest priority (rendered last = on top) */}
          {selectedGoalId && goals.find(g => g.id === selectedGoalId) && (
            <Toolbar 
              goal={goals.find(g => g.id === selectedGoalId)!}
              selectedGoalId={selectedGoalId}
              onToggleComplete={toggleComplete}
              onDelete={deleteGoal}
            />
          )}
        </div>
      </div>
      </div> {/* Close ruler wrapper */}

      {/* Debug Info - Compact */}
      {showDebugGrid && (
        <div style={{
          position: 'fixed',
          top: '125px',
          right: '24px',
          backgroundColor: 'rgba(255,255,255,0.95)',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '8px 10px',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          lineHeight: '1.4'
        }}>
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
            📐 Ruler Mode
          </div>
          <div style={{ color: '#374151', fontSize: '9px' }}>
            Center = 0, 0
          </div>
          <div style={{ color: '#9ca3af', fontSize: '9px', marginTop: '2px' }}>
            Units: 10px = 1 ruler mark
          </div>
        </div>
      )}

      {/* Debug Grid Toggle - Top Right */}
      <div style={{
        position: 'fixed',
        top: '75px',
        right: '74px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setShowDebugGrid(!showDebugGrid)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '4px',
            backgroundColor: showDebugGrid ? '#8b5cf6' : 'white',
            color: showDebugGrid ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          title={showDebugGrid ? "Hide rulers & guides" : "Show rulers & guides (PPT-style)"}
        >
          📐
        </button>
      </div>

      {/* Lightbulb Tip Button - Top Right */}
      <div style={{
        position: 'fixed',
        top: '75px',
        right: '24px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setShowPanningTip(!showPanningTip)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#D9D9D9',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          title="Panning tip"
        >
          💡
        </button>
        
        {showPanningTip && (
          <div style={{
            position: 'absolute',
            top: '50px',
            right: '0',
            backgroundColor: '#FFF9C4',
            color: 'black',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            width: '320px',
            border: '2px solid #F59E0B',
            whiteSpace: 'normal',
            lineHeight: '1.4'
          }}>
            <strong>Did you know that...</strong>
            <br />
            Pan around the board by <kbd style={{
              padding: '2px 6px',
              backgroundColor: 'white',
              borderRadius: '3px',
              border: '1px solid #9CA3AF',
              fontSize: '11px',
              fontWeight: '600'
            }}>Space</kbd> or <kbd style={{
              padding: '2px 6px',
              backgroundColor: 'white',
              borderRadius: '3px',
              border: '1px solid #9CA3AF',
              fontSize: '11px',
              fontWeight: '600'
            }}>middle mouse</kbd> button hold and drag?
          </div>
        )}
      </div>

      {/* Helper Text - Bottom Center */}
      {/* AI Suggestions Panel - Right Side Above Button */}
      {aiSuggestions.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '82px',
          right: '24px',
          zIndex: 1000,
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          width: '380px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              ✨ AI Suggestions
            </h3>
            <button
              onClick={() => setAiSuggestions([])}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px'
              }}
              title="Close suggestions"
            >
              ×
            </button>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
          }}>
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => {
                  if (selectedGoalId) {
                    addChildWithText(selectedGoalId, suggestion);
                    // Remove this suggestion from the list
                    setAiSuggestions(prev => prev.filter((_, i) => i !== index));
                  }
                }}
                style={{
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#8b5cf6';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#8b5cf6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.color = 'black';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>
                    {index + 1}.
                  </span>
                  <span style={{ flex: 1, fontSize: '14px' }}>
                    {suggestion}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Click a suggestion to add it as a sub-goal
          </div>
        </div>
      )}

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

      {/* AI Button Hint Tooltip */}
      {showAIButtonHint && (
        <div style={{
          position: 'fixed',
          bottom: '82px',
          right: '24px',
          backgroundColor: '#FFF9C4',
          color: '#78350F',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          border: '2px solid #F59E0B',
          zIndex: 1001,
          whiteSpace: 'nowrap'
        }}>
          👆 Select a goal first
        </div>
      )}

      {/* AI Assist Button - Bottom Right */}
      <button
        onClick={() => {
          if (!selectedGoalId) {
            setShowAIButtonHint(true);
            setTimeout(() => setShowAIButtonHint(false), 2500);
            return;
          }
          handleGetAISuggestions();
        }}
          disabled={isLoadingAI}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            height: '48px',
          padding: '0 20px',
          backgroundColor: isLoadingAI ? '#9CA3AF' : selectedGoalId ? '#8b5cf6' : '#D1D5DB',
          color: selectedGoalId || isLoadingAI ? 'white' : '#6B7280',
            border: 'none',
            borderRadius: '24px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: isLoadingAI ? 'wait' : selectedGoalId ? 'pointer' : 'not-allowed',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          title={isLoadingAI ? 'AI is thinking...' : !selectedGoalId ? 'Select a goal first' : 'Get AI suggestions for this goal'}
        >
          <span style={{ fontSize: '18px' }}>{isLoadingAI ? '⏳' : '✨'}</span>
        <span>{isLoadingAI ? 'Thinking...' : 'Get ideas'}</span>
      </button>
    </div>
  );
};

export default SimpleGoalBreaker;