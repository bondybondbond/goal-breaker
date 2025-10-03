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
        // Generate path based on layout type
        let pathData: string;
        const CARD_WIDTH = 160;
        const CARD_HEIGHT = 75;
        
        if (conn.layoutType === 'vertical') {
          // VERTICAL LAYOUT: PPT-style trunk with horizontal branches
          // Vertical trunk from parent → horizontal branches to each child
          const parentBottomX = conn.from.x - 65; // Bottom edge, optimal left offset
          const parentBottomY = conn.from.y; // Parent's bottom edge
          const childLeftX = conn.to.x - CARD_WIDTH / 2; // Child's left edge
          const childMidY = conn.to.y + CARD_HEIGHT / 2; // Child's vertical middle
          const trunkX = parentBottomX; // Vertical trunk line position (fixed X)
          
          // Path: DOWN from parent → RIGHT to child's left middle
          pathData = `
            M ${parentBottomX} ${parentBottomY}
            L ${trunkX} ${childMidY}
            L ${childLeftX} ${childMidY}
          `;
        } else {
          // HORIZONTAL LAYOUT: Simple straight down from BOTTOM CENTER (normal spread)
          // Start from parent's bottom center → straight down to child top center
          const parentBottomCenterX = conn.from.x; // Bottom center
          const parentBottomY = conn.from.y; // Parent's bottom edge
          
          // Path: straight down (add small jog if not vertically aligned)
          if (Math.abs(parentBottomCenterX - conn.to.x) < 5) {
            // Nearly vertical - straight line
            pathData = `M ${parentBottomCenterX} ${parentBottomY} L ${conn.to.x} ${conn.to.y}`;
          } else {
            // Add 90° jog: down → across → down
            pathData = `
              M ${parentBottomCenterX} ${parentBottomY}
              L ${parentBottomCenterX} ${(parentBottomY + conn.to.y) / 2}
              L ${conn.to.x} ${(parentBottomY + conn.to.y) / 2}
              L ${conn.to.x} ${conn.to.y}
            `;
          }
        }
        
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
            
            {/* Connection point on parent (start) */}
            {conn.layoutType === 'vertical' ? (
              <circle
                cx={conn.from.x - 65} // Bottom edge, optimal left offset
                cy={conn.from.y} // Parent's bottom
                r="2"
                fill={conn.completed ? "#10b981" : "#000000"}
                className="transition-all duration-200"
              />
            ) : (
              <circle
                cx={conn.from.x} // Parent's BOTTOM CENTER
                cy={conn.from.y} // Parent's bottom edge
                r="2"
                fill={conn.completed ? "#10b981" : "#000000"}
                className="transition-all duration-200"
              />
            )}
            
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
              /* Normal connection point on child (end) */
              <circle
                cx={conn.layoutType === 'vertical' ? conn.to.x - 80 : conn.to.x} // Left middle for vertical, top center for horizontal
                cy={conn.layoutType === 'vertical' ? conn.to.y + 37.5 : conn.to.y} // Vertical middle for vertical, top for horizontal
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
