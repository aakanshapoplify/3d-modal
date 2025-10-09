import React from 'react';

interface PanoramicToolbarProps {
  autoRotate: boolean;
  speed: number; // degrees per second
  onToggleAutoRotate: (next: boolean) => void;
  onChangeSpeed: (speed: number) => void;
}

export default function PanoramicToolbar({ autoRotate, speed, onToggleAutoRotate, onChangeSpeed }: PanoramicToolbarProps) {
  return (
    <div className="absolute top-4 right-4 z-40">
      <div className="bg-gradient-to-br from-black/80 to-gray-900/80 backdrop-blur rounded-2xl p-3 border border-white/10 shadow-xl text-white w-64">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Auto-Rotate</div>
          <button
            onClick={() => onToggleAutoRotate(!autoRotate)}
            className={`px-2 py-1 rounded-md transition-all ${autoRotate ? 'bg-purple-500 text-white' : 'bg-white/6 text-gray-200'}`}
          >
            {autoRotate ? 'On' : 'Off'}
          </button>
        </div>

        <div className="text-xs text-gray-300 mb-2">Rotation Speed</div>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={speed}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
            disabled={!autoRotate}
            className="w-full"
          />
          <div className="w-12 text-right text-sm font-medium">{speed}°/s</div>
        </div>
      </div>
    </div>
  );
}
