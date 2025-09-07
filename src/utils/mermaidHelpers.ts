import { Goal } from '../types/goal.types';
import { gridToPosition, calculateChildPosition, standardizeGoalPositions } from './gridHelpers';

/**
 * Convert goals structure to Mermaid diagram format
 * @param mainGoal - The main goal text (can be empty if using goals array)
 * @param goals - Array of goal objects
 * @returns Mermaid diagram string
 */
export const exportToMermaid = (mainGoal: string, goals: Goal[]): string => {
  if (goals.length === 0) return '';
  
  const lines: string[] = ['graph TD'];
  
  // Generate unique node IDs (A, B, C, etc.)
  const getNodeId = (index: number): string => {
    return String.fromCharCode(65 + index); // A, B, C, D...
  };
  
  // Sort goals by level and creation order for consistent output
  const sortedGoals = [...goals].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.id - b.id;
  });
  
  // Create mapping of goal.id to node ID
  const goalToNodeId = new Map<number, string>();
  sortedGoals.forEach((goal, index) => {
    goalToNodeId.set(goal.id, getNodeId(index));
  });
  
  // Add goal nodes
  sortedGoals.forEach((goal) => {
    const nodeId = goalToNodeId.get(goal.id);
    const escapedText = goal.text.replace(/"/g, '\"'); // Escape quotes
    const displayText = goal.text || (goal.level === 0 ? 'Main Goal' : 'Untitled Task');
    const finalText = goal.completed ? `✅ ${escapedText || displayText}` : escapedText || displayText;
    lines.push(`    ${nodeId}["${finalText}"]`);
  });
  
  // Add connections
  sortedGoals.forEach((goal) => {
    const childNodeId = goalToNodeId.get(goal.id);
    
    if (goal.parentId !== null) {
      // Connect to parent goal
      const parentNodeId = goalToNodeId.get(goal.parentId);
      if (parentNodeId) {
        lines.push(`    ${parentNodeId} --> ${childNodeId}`);
      }
    }
  });
  
  return lines.join('\n');
};;

/**
 * Copy text to clipboard with fallback for older browsers
 * @param text - Text to copy
 * @returns Promise<boolean> - Success status
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};


/**
 * Parse Mermaid diagram format and convert to goals structure
 * @param mermaidCode - The Mermaid diagram string
 * @returns Object with success status and either goals array or error message
 */
export const importFromMermaid = (mermaidCode: string): { 
  success: boolean; 
  goals?: Goal[]; 
  error?: string 
} => {
  try {
    const lines = mermaidCode.trim().split('\n');
    
    // Validate basic format
    if (lines.length === 0 || !lines[0].trim().startsWith('graph TD')) {
      return { 
        success: false, 
        error: 'Invalid format: Must start with "graph TD"' 
      };
    }

    const nodes = new Map<string, { text: string; completed: boolean }>();
    const connections = new Map<string, string[]>(); // parent -> children
    const nodeOrder: string[] = [];

    // Parse nodes and connections
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse node definitions: A["✅ Task text"] or A["📝 Task text"] or A["Task text"]
      const nodeMatch = line.match(/^\s*([A-Z]+)\["(.*?)"\]$/);
      if (nodeMatch) {
        const [, nodeId, fullText] = nodeMatch;
        
        // Check if text starts with ✅ (completed)
        const isCompleted = fullText.startsWith('✅');
        
        // Clean text: remove ✅ or 📝 emojis and trim
        let cleanText = fullText;
        if (cleanText.startsWith('✅ ')) {
          cleanText = cleanText.substring(2).trim();
        } else if (cleanText.startsWith('📝 ')) {
          cleanText = cleanText.substring(2).trim();
        }
        
        nodes.set(nodeId, { 
          text: cleanText.replace(/\\"/g, '"'), 
          completed: isCompleted 
        });
        nodeOrder.push(nodeId);
        continue;
      }

      // Parse connections: A --> B
      const connectionMatch = line.match(/^\s*([A-Z]+)\s+-->\s+([A-Z]+)$/);
      if (connectionMatch) {
        const [, parent, child] = connectionMatch;
        if (!connections.has(parent)) {
          connections.set(parent, []);
        }
        connections.get(parent)!.push(child);
        continue;
      }
    }

    // Validate we have at least one node
    if (nodes.size === 0) {
      return { 
        success: false, 
        error: 'No valid nodes found. Please check the format.' 
      };
    }

    // Validate maximum depth (4 levels)
    const validateDepth = (nodeId: string, currentDepth: number = 0): boolean => {
      if (currentDepth > 3) return false; // Max 4 levels (0-3)
      
      const children = connections.get(nodeId) || [];
      return children.every(child => validateDepth(child, currentDepth + 1));
    };

    // Find root nodes (nodes with no parent)
    const rootNodes = nodeOrder.filter(nodeId => 
      !Array.from(connections.values()).some(children => children.includes(nodeId))
    );

    // Validate depth for each root
    if (!rootNodes.every(root => validateDepth(root))) {
      return { 
        success: false, 
        error: 'Maximum 4 levels supported. Please simplify your structure.' 
      };
    }

    // Convert to Goal structure
    const goals: Goal[] = [];
    let nextId = 1;
    
    // Use viewport dimensions for proper positioning
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight - 80; // Account for header
    
    // Build level-based structure first
    const levelNodes = new Map<number, string[]>();
    
    // Recursive function to assign levels
    const assignLevels = (nodeId: string, level: number): void => {
      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level)!.push(nodeId);
      
      const children = connections.get(nodeId) || [];
      children.forEach(child => assignLevels(child, level + 1));
    };
    
    // Start with root nodes
    rootNodes.forEach(rootId => assignLevels(rootId, 0));
    
    // Create goals with temporary positions
    const nodeToGoalId = new Map<string, number>();
    
    for (const [level, nodeIds] of levelNodes.entries()) {
      nodeIds.forEach((nodeId, rowIndex) => {
        const nodeData = nodes.get(nodeId);
        if (!nodeData) return;
        
        const goalId = nextId++;
        nodeToGoalId.set(nodeId, goalId);
        
        // Find parent ID if this isn't a root node
        let parentId: number | null = null;
        for (const [parentNodeId, children] of connections.entries()) {
          if (children.includes(nodeId)) {
            parentId = nodeToGoalId.get(parentNodeId) || null;
            break;
          }
        }
        
        const goal: Goal = {
          id: goalId,
          text: nodeData.text,
          completed: nodeData.completed,
          level,
          gridRow: rowIndex,
          parentId,
          position: { x: 0, y: 0 }, // Temporary position
          children: []
        };
        
        goals.push(goal);
      });
    }
    
    // Apply standardized positioning to ensure consistent layout
    const positionedGoals = standardizeGoalPositions(goals, canvasWidth, canvasHeight);

    // Update children arrays
    positionedGoals.forEach(goal => {
      goal.children = positionedGoals.filter(g => g.parentId === goal.id);
    });

    return { success: true, goals: positionedGoals };

  } catch (error) {
    return { 
      success: false, 
      error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};
