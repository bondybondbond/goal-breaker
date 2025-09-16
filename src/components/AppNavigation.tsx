import React from 'react';
import { Target, Menu, X } from 'lucide-react';
import ImportExport from './ImportExport';

interface AppNavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  currentDirection: string;
  setCurrentDirection: (direction: string) => void;
  focusedGoal: number | null;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  goals: any[];
  onReset: () => void;
  onGoalsImported: (goals: any[]) => void;
  onExportMessage: (message: string) => void;
  onViewChange: (view: string) => void;
}

const AppNavigation: React.FC<AppNavigationProps> = ({
  currentView,
  setCurrentView,
  currentDirection,
  setCurrentDirection,
  focusedGoal,
  isMenuOpen,
  setIsMenuOpen,
  goals,
  onReset,
  onGoalsImported,
  onExportMessage,
  onViewChange
}) => {
  return (
    <>
      {/* ===== HEADER SECTION ===== */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-center px-6 py-4">
          {/* Left side: Logo and Menu button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Target className="text-yellow-600" size={24} />
              <h1 className="text-xl font-bold text-gray-800">Goal Breaker</h1>
              {focusedGoal && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Focus Mode Active
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              <Menu size={20} />
              <span>Menu</span>
            </button>
          </div>

          {/* Right side: Controls and placeholders */}
          <div className="flex items-center gap-4">
            {/* Direction Toggle */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-lg border border-gray-200">
              {/* Direction Label */}
              <span className="px-2 text-sm font-medium text-gray-600">Direction</span>
              <div className="w-px h-6 bg-gray-200 mx-1"></div> {/* Separator line */}
              
              <button
                onClick={() => setCurrentDirection('right-left')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 group relative ${
                  currentDirection === 'right-left' 
                    ? 'bg-emerald-100 text-emerald-900 shadow-sm border border-emerald-200' 
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                ⬅️
                {/* Tooltip below */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Right to Left
                  <div className="text-[10px] text-gray-300">Goal on right</div>
                </div>
              </button>
              <button
                onClick={() => setCurrentDirection('left-right')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 group relative ${
                  currentDirection === 'left-right' 
                    ? 'bg-emerald-100 text-emerald-900 shadow-sm border border-emerald-200' 
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                ➡️
                {/* Tooltip below */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Left to Right
                  <div className="text-[10px] text-gray-300">Goal on left</div>
                </div>
              </button>
              <button
                onClick={() => setCurrentDirection('up-down')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 group relative ${
                  currentDirection === 'up-down' 
                    ? 'bg-emerald-100 text-emerald-900 shadow-sm border border-emerald-200' 
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                ⬇️
                {/* Tooltip below */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Up to Down
                  <div className="text-[10px] text-gray-300">Goal on top</div>
                </div>
              </button>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-lg border border-gray-200">
              <button
                onClick={() => onViewChange('canvas')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentView === 'canvas' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Canvas
              </button>
              <button
                onClick={() => onViewChange('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentView === 'list' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                List
              </button>
            </div>

            {/* Share placeholder */}
            <button className="px-4 py-2 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed transition-colors">
              🔗 share
            </button>

            {/* Sign in to save placeholder */}
            <button className="px-4 py-2 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed transition-colors">
              👤 save
            </button>
          </div>
        </div>
      </div>

      {/* ===== MENU OVERLAY ===== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute top-20 left-6 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
               onClick={(e) => e.stopPropagation()}>
            {/* Menu Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Goal Breaker</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Menu Items */}
            <div className="p-4 space-y-4">
              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-lg">📊</span>
                  <span className="font-medium">Stats</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    {goals.filter(g => g.completed).length} / {goals.length} completed
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: goals.length > 0 
                          ? `${(goals.filter(g => g.completed).length / goals.length) * 100}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* Import/Export Component */}
              <ImportExport 
                goals={goals}
                onGoalsImported={onGoalsImported}
                onExportMessage={onExportMessage}
              />
              
              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>
              
              {/* Reset */}
              <button
                onClick={() => {
                  onReset();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 p-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="text-lg">🔄</span>
                <span>Reset All Goals</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppNavigation;