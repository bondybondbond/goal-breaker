import { Goal } from '../types/goal.types';

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
    const emoji = goal.completed ? '✅' : '📝';
    const escapedText = goal.text.replace(/"/g, '\\"'); // Escape quotes
    const displayText = goal.text || (goal.level === 0 ? 'Main Goal' : 'Untitled Task');
    lines.push(`    ${nodeId}["${emoji} ${escapedText || displayText}"]`);
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
