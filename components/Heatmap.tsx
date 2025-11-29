import React from 'react';
import { ScanPoint } from '../types';

interface HeatmapProps {
  data: ScanPoint[];
  width: number;
  height: number;
}

// Simple color scale for deviation
// Green = 0, Red = +10, Blue = -10
const getColor = (z: number) => {
  if (Math.abs(z) < 2) return '#22c55e'; // Green 500 (Good)
  if (z > 0) {
    // High spots (Red)
    const intensity = Math.min(255, Math.floor((z / 10) * 255));
    return `rgb(239, 68, 68, ${intensity / 255 + 0.2})`;
  } else {
    // Low spots (Blue)
    const intensity = Math.min(255, Math.floor((Math.abs(z) / 10) * 255));
    return `rgb(59, 130, 246, ${intensity / 255 + 0.2})`;
  }
};

export const Heatmap: React.FC<HeatmapProps> = ({ data, width, height }) => {
  const gridSize = Math.sqrt(data.length);
  const cellSize = Math.floor(width / gridSize);

  return (
    <div 
      className="relative bg-slate-900 border border-slate-700 overflow-hidden shadow-inner"
      style={{ width, height }}
    >
      <div 
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`
        }}
      >
        {data.map((point, i) => (
          <div
            key={i}
            title={`Deviation: ${point.z.toFixed(1)}mm`}
            style={{
              backgroundColor: getColor(point.z),
              opacity: 0.9
            }}
            className="hover:opacity-100 cursor-crosshair transition-opacity duration-75"
          />
        ))}
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white/90 p-2 rounded text-xs shadow-md backdrop-blur flex flex-col gap-1">
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500"></div> &gt; +2mm (High)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500"></div> ±2mm (Good)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500"></div> &lt; -2mm (Low)</div>
      </div>
      
      {/* Grid Overlay for Engineering look */}
      <svg className="absolute inset-0 pointer-events-none opacity-20" width="100%" height="100%">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};
