import React, { useRef, useState, useEffect } from 'react';

interface Props {
  onMove: (vx: number, vy: number) => void;
  onEnd?: () => void;
  onShootToggle?: (shooting: boolean, aimAngle: number) => void;
  showShootButton?: boolean;
}

export const MobileJoystick: React.FC<Props> = ({ onMove, onEnd, onShootToggle, showShootButton }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shootRef = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isShooting, setIsShooting] = useState(false);

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    setKnobPos({ x: dx, y: dy });

    const vx = dx / maxDist;
    const vy = dy / maxDist;
    onMove(vx, vy);
  };

  const handleTouchEnd = () => {
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
    onEnd?.();
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-8 pointer-events-auto touch-none select-none">
      {/* Movement Joystick */}
      <div
        ref={containerRef}
        onTouchStart={(e) => {
          setActive(true);
          handleTouchMove(e);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-28 h-28 rounded-full bg-slate-900/60 border-2 border-cyan-500/40 backdrop-blur-md flex items-center justify-center relative shadow-lg"
      >
        <div
          className="w-12 h-12 rounded-full bg-cyan-500/80 shadow-md transition-transform"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      {/* Shoot Button for Void Horde Mode */}
      {showShootButton && (
        <div
          ref={shootRef}
          onTouchStart={() => {
            setIsShooting(true);
            onShootToggle?.(true, 0);
          }}
          onTouchEnd={() => {
            setIsShooting(false);
            onShootToggle?.(false, 0);
          }}
          className={`w-20 h-20 rounded-full border-2 flex items-center justify-center font-bold text-xs uppercase tracking-wider transition ${
            isShooting
              ? 'bg-amber-500 border-amber-300 text-slate-950 scale-95 shadow-amber-500/50 shadow-lg'
              : 'bg-red-600/80 border-red-400 text-white shadow-md'
          }`}
        >
          FIRE
        </div>
      )}
    </div>
  );
};
