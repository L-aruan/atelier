'use client';
import { useState, useRef, useCallback } from 'react';

interface CompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function CompareSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = '原图',
  afterLabel = '处理后',
}: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-lg cursor-col-resize select-none bg-gray-100"
      onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 h-full object-contain"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
          draggable={false}
        />
      </div>
      <div className="absolute top-0 bottom-0" style={{ left: `${position}%`, transform: 'translateX(-50%)' }}>
        <div className="w-0.5 h-full bg-white shadow-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 text-xs font-bold">
          ⇔
        </div>
      </div>
      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {beforeLabel}
      </div>
      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {afterLabel}
      </div>
    </div>
  );
}
