import React, { useState } from 'react';
import { X } from 'lucide-react';
import { exportToMermaid, copyToClipboard, importFromMermaid } from '../utils/mermaidHelpers';

interface ImportExportProps {
  goals: any[];
  onGoalsImported: (goals: any[]) => void;
  onExportMessage: (message: string) => void;
}

const ImportExport: React.FC<ImportExportProps> = ({ 
  goals, 
  onGoalsImported, 
  onExportMessage 
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState('');

  // Export functionality
  const handleExport = async () => {
    try {
      // Find the main goal (level 0 goals)
      const mainGoals = goals.filter(g => g.level === 0);
      
      if (mainGoals.length === 0 && goals.length === 0) {
        onExportMessage('❌ No goals to export');
        return;
      }
      
      // For now, use the first main goal as the primary one
      // In the future, we might want to handle multiple main goals
      const primaryMainGoal = mainGoals.length > 0 ? mainGoals[0].text : 'Untitled Goal';
      
      // Generate mermaid diagram
      const mermaidCode = exportToMermaid(primaryMainGoal, goals);
      
      if (!mermaidCode) {
        onExportMessage('❌ No content to export');
        return;
      }
      
      // Copy to clipboard
      const success = await copyToClipboard(mermaidCode);
      
      if (success) {
        onExportMessage('✅ Mermaid code copied!');
      } else {
        onExportMessage('❌ Failed to copy');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      onExportMessage('❌ Export failed');
    }
  };

  // Import functionality
  const handleImportClick = () => {
    if (goals.length > 0) {
      // Show confirmation dialog
      const confirmed = window.confirm(
        'You have existing goals. Importing will replace your current structure. Continue?'
      );
      if (!confirmed) {
        return;
      }
    }
    setIsImportModalOpen(true);
    setImportText('');
    setImportMessage('');
  };

  const handleImportCancel = () => {
    setIsImportModalOpen(false);
    setImportText('');
    setImportMessage('');
  };

  const handleImportConfirm = () => {
    if (!importText.trim()) {
      setImportMessage('❌ Please enter Mermaid code');
      return;
    }

    const result = importFromMermaid(importText);
    
    if (!result.success) {
      setImportMessage(`❌ ${result.error}`);
      return;
    }

    // Import successful - pass goals to parent
    onGoalsImported(result.goals || []);
    setIsImportModalOpen(false);
    setImportMessage('');
    setImportText('');
    
    // Show success message briefly
    onExportMessage('✅ Goals imported successfully!');
  };

  return (
    <>
      {/* Menu Items for Export and Import */}
      <div className="space-y-4">
        {/* Export to Mermaid */}
        <button
          onClick={handleExport}
          disabled={goals.length === 0}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
            goals.length === 0
              ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
              : 'text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📤</span>
            <span>Export to Mermaid</span>
          </div>
          <span className="text-sm">Copy</span>
        </button>
        
        {/* Import */}
        <button
          onClick={handleImportClick}
          className="w-full flex items-center justify-between p-3 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📥</span>
            <span>Import</span>
          </div>
          <span className="text-sm">Paste Code</span>
        </button>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Import Mermaid Code</h2>
              <p className="text-sm text-gray-600 mt-1">
                Paste your Mermaid diagram code below. This will replace your current goals.
              </p>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mermaid Code:
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="flex-1 w-full p-3 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Example:
graph TD
    A["Main Goal"]
    B["Sub Task 1"]
    C["✅ Completed Task"]
    A --> B
    A --> C`}
                />
              </div>
              
              {/* Error/Success Message */}
              {importMessage && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{importMessage}</p>
                </div>
              )}
              
              {/* Validation Tips */}
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium mb-1">Format Requirements:</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Must start with "graph TD"</li>
                  <li>• Use format: A["Task Name"] or A["✅ Completed Task"]</li>
                  <li>• Connections: A --&gt; B</li>
                  <li>• Maximum 4 levels deep</li>
                </ul>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={handleImportCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Import Goals
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportExport;