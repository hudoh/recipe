'use client';

import React from 'react';

interface ServingScalerProps {
  baseServings: number;
  currentServings: number;
  onServingsChange: (servings: number) => void;
}

export default function ServingScaler({
  baseServings,
  currentServings,
  onServingsChange,
}: ServingScalerProps) {
  const scaleRatio = currentServings / baseServings;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onServingsChange(Math.max(1, currentServings - 1))}
        disabled={currentServings <= 1}
        className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sage/90 transition-colors text-xl font-bold"
      >
        −
      </button>

      <div className="flex flex-col items-center min-w-[4rem]">
        <input
          type="number"
          min="1"
          value={currentServings}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= 1) onServingsChange(v);
          }}
          className="w-16 text-center border border-espresso/20 rounded-lg bg-white py-2 text-espresso font-bold text-lg focus:outline-none focus:ring-2 focus:ring-caramel"
        />
        <span className="text-xs text-espresso/60 mt-1">servings</span>
      </div>

      <button
        onClick={() => onServingsChange(currentServings + 1)}
        className="w-10 h-10 rounded-full bg-caramel text-espresso flex items-center justify-center hover:bg-caramel/90 transition-colors text-xl font-bold"
      >
        +
      </button>

      {scaleRatio !== 1 && (
        <span className="text-sm text-espresso/60 ml-2">
          ×{scaleRatio.toFixed(2)}
        </span>
      )}
    </div>
  );
}
