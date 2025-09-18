import React from "react";
import { Connection } from "../types/goal.types";

interface ConnectionLinesProps {
  connections: Connection[];
  canvasSize: { width: number; height: number };
  connectorStyle?: 'curved' | 'straight';
  direction?: string;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({ connections, canvasSize, connectorStyle = 'curved', direction = 'right-left' }) => {
  // Generate unique IDs for this component instance to avoid conflicts
  const markerId = `arrow-${Math.random().toString(36).substr(2, 9)}`;
  const markerCompletedId = `arrow-completed-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ width: canvasSize.width, height: canvasSize.height }}
    >
      {/* Arrow marker definitions with unique IDs */}
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 14 14"
          refX="12"
          refY="7"
          markerWidth="12"
          markerHeight="12"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path 
            d="M1,3 L1,11 L12,7 z" 
            fill="#6b7280" 
            stroke="#6b7280" 
            strokeWidth="1"
          />
        </marker>
        <marker
          id={markerCompletedId}
          viewBox="0 0 14 14"
          refX="12"
          refY="7"
          markerWidth="12"
          markerHeight="12"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path 
            d="M1,3 L1,11 L12,7 z" 
            fill="#10b981" 
            stroke="#10b981" 
            strokeWidth="1"
          />
        </marker>
      </defs>

      {connections.map(conn => {
        // Generate path based on connector style
        let pathData = conn.path;
        
        if (connectorStyle === 'straight') {
          // Create elbow/right-angle path
          const fromX = conn.from.x;
          const fromY = conn.from.y;
          const toX = conn.to.x;
          const toY = conn.to.y;
          
          if (direction === 'up-down') {
            // For top-down: vertical then horizontal
            const midY = fromY + (toY - fromY) * 0.5;
            pathData = `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`;
          } else {
            // For left-right and right-left: horizontal then vertical
            const midX = fromX + (toX - fromX) * 0.5;
            pathData = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
          }
        }
        // For curved, use the existing conn.path (which should be curved)
        
        return (
          <g key={conn.id}>
            <path
              d={pathData}
              stroke={conn.completed ? "#10b981" : "#6b7280"}
              strokeWidth="2"
              fill="none"
              strokeDasharray="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
              markerEnd={conn.type !== 'placeholder' ? `url(#${conn.completed ? markerCompletedId : markerId})` : undefined}
            />
            
            {/* Connection point on parent (start) */}
            <circle
              cx={conn.from.x}
              cy={conn.from.y}
              r="3"
              fill={conn.completed ? "#10b981" : "#6b7280"}
              className="transition-all duration-300"
            />
            
            {/* Different rendering for placeholder vs normal connections */}
            {conn.type === 'placeholder' ? (
              /* Placeholder indicator with count */
              <g>
                <circle
                  cx={conn.to.x}
                  cy={conn.to.y}
                  r="12"
                  fill="#f3f4f6"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
                <text
                  x={conn.to.x}
                  y={conn.to.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium fill-gray-600"
                  style={{ fontSize: '10px' }}
                >
                  {conn.hiddenCount}
                </text>
              </g>
            ) : (
              /* Normal connection point on child (end) - smaller since we have arrow now */
              <circle
                cx={conn.to.x}
                cy={conn.to.y}
                r="2"
                fill={conn.completed ? "#10b981" : "#6b7280"}
                className="transition-all duration-300"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};
