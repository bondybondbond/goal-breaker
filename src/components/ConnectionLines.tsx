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
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ 
        width: canvasSize.width, 
        height: canvasSize.height,
        zIndex: 0  // Behind cards
      }}
    >
      {/* Arrow marker definitions with unique IDs */}
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path 
            d="M0,0 L0,10 L10,5 z" 
            fill="#000000" 
          />
        </marker>
        <marker
          id={markerCompletedId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path 
            d="M0,0 L0,10 L10,5 z" 
            fill="#10b981" 
          />
        </marker>
      </defs>

{connections.map(conn => {
        // Generate simple straight line path
        const pathData = `M ${conn.from.x} ${conn.from.y} L ${conn.to.x} ${conn.to.y}`;
        
        return (
          <g key={conn.id}>
            <path
              d={pathData}
              stroke={conn.completed ? "#10b981" : "#000000"}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              className="transition-all duration-300"
              markerEnd={conn.type !== 'placeholder' ? `url(#${conn.completed ? markerCompletedId : markerId})` : undefined}
            />
            
            {/* Connection point on parent (start) - minimal */}
            <circle
              cx={conn.from.x}
              cy={conn.from.y}
              r="2"
              fill={conn.completed ? "#10b981" : "#000000"}
              className="transition-all duration-200"
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
              /* Normal connection point on child (end) - minimal */
              <circle
                cx={conn.to.x}
                cy={conn.to.y}
                r="2"
                fill={conn.completed ? "#10b981" : "#000000"}
                className="transition-all duration-200"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};
