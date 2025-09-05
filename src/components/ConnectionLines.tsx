import React from "react";
import { Connection } from "../types/goal.types";

interface ConnectionLinesProps {
  connections: Connection[];
  canvasSize: { width: number; height: number };
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({ connections, canvasSize }) => {
  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ width: canvasSize.width, height: canvasSize.height }}
    >
      {connections.map(conn => (
        <g key={conn.id}>
          <path
            d={conn.path}
            stroke={conn.completed ? "#10b981" : "#6b7280"}
            strokeWidth="2"
            fill="none"
            className="transition-all duration-300"
            strokeDasharray={conn.completed ? "0" : "5,5"}
          />
          {/* Connection point on parent (left side) */}
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
            /* Normal connection point on child (right side) */
            <circle
              cx={conn.to.x}
              cy={conn.to.y}
              r="3"
              fill={conn.completed ? "#10b981" : "#6b7280"}
              className="transition-all duration-300"
            />
          )}
        </g>
      ))}
    </svg>
  );
};
