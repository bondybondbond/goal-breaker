import React from 'react';
import { Plus, Check, X, Target } from 'lucide-react';
import { getLevelStyle } from '../utils/styleHelpers';
import { GRID } from '../utils/gridHelpers';

interface ListViewProps {
  goals: any[];
  toggleComplete: (id: number) => void;
  updateGoal: (id: number, text: string) => void;
  startEditing: (id: number) => void;
  deleteGoal: (id: number) => void;
  addSubGoal: (parentId: number) => void;
  setGoals: (goals: any[]) => void;
  canvasSize: { width: number; height: number };
}

const ListView: React.FC<ListViewProps> = ({
  goals,
  toggleComplete,
  updateGoal,
  startEditing,
  deleteGoal,
  addSubGoal,
  setGoals,
  canvasSize
}) => {
  const renderGoalItem = (goal: any, depth = 0) => {
    const children = goals.filter(g => g.parentId === goal.id);
    const levelStyle = getLevelStyle(goal.level, goal.completed);
    
    return (
      <div key={goal.id} className="space-y-2">
        <div 
          className={`flex items-center gap-3 p-3 rounded-lg border-2 ${levelStyle.border} ${levelStyle.bg} transition-all hover:shadow-md`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <button
            onClick={() => toggleComplete(goal.id)}
            className={`p-1 rounded transition-colors ${
              goal.completed 
                ? 'bg-green-500 text-white' 
                : 'bg-white border-2 border-gray-300 hover:border-green-400'
            }`}
          >
            <Check size={14} />
          </button>
          
          {goal.isEditing ? (
            <div className="flex-1 relative">
              <input
                type="text"
                defaultValue={goal.text}
                className="w-full p-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                placeholder={goal.level === 0 ? "What's your main goal?" : "Enter task..."}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if ((e.target as HTMLInputElement).value.trim()) {
                      updateGoal(goal.id, (e.target as HTMLInputElement).value);
                    }
                  }
                  if (e.key === 'Escape') {
                    if (goal.level > 0 && !goal.text) {
                      deleteGoal(goal.id);
                    } else {
                      updateGoal(goal.id, goal.text || '');
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    updateGoal(goal.id, value);
                  } else if (goal.level > 0) {
                    deleteGoal(goal.id);
                  } else {
                    updateGoal(goal.id, '');
                  }
                }}
              />
            </div>
          ) : (
            <p 
              className={`flex-1 cursor-pointer p-2 rounded transition-colors ${
                goal.completed ? 'line-through text-green-700' : `hover:bg-gray-200 ${levelStyle.color}`
              } ${goal.level === 0 ? 'font-bold text-lg' : 'font-medium'}`}
              onClick={() => startEditing(goal.id)}
            >
              {goal.text || (goal.level === 0 ? "Click to define your main goal..." : "Click to add task...")}
            </p>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => addSubGoal(goal.id)}
              className="text-purple-600 hover:bg-purple-100 p-1 rounded"
            >
              <Plus size={16} />
            </button>
            
            {goal.level > 0 && (
              <button
                onClick={() => deleteGoal(goal.id)}
                className="text-red-600 hover:bg-red-100 p-1 rounded"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {children.length > 0 && (
          <div className="space-y-2">
            {children.map(child => renderGoalItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" style={{ marginTop: '80px' }}>
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div 
            className="p-6 border-4 border-dashed border-yellow-300 rounded-xl text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
            onClick={() => {
              const newGoal = {
                id: 1,
                text: '',
                completed: false,
                level: 0,
                gridRow: 0,
                parentId: null,
                position: {
                  x: (canvasSize.width - GRID.CARD_WIDTH) / 2,
                  y: (canvasSize.height - GRID.CARD_HEIGHT) / 2
                },
                children: [],
                isEditing: true
              };
              setGoals([newGoal]);
            }}
          >
            <Target className="mx-auto mb-3 text-yellow-600" size={48} />
            <h2 className="text-xl font-bold text-yellow-800 mb-2">Start Breaking Down Your Goal</h2>
            <p className="text-yellow-700">Click here to define your main goal and start breaking it down</p>
          </div>
        ) : (
          goals
            .filter(goal => goal.level === 0)
            .map(rootGoal => renderGoalItem(rootGoal))
        )}
      </div>
    </div>
  );
};

export default ListView;
