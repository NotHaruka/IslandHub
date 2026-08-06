import React from 'react';
import { IslandDefenseState } from '../types/voidHorde';

interface Props {
  state: IslandDefenseState;
  localPlayerId: string;
}

export const Minimap: React.FC<Props> = ({ state, localPlayerId }) => {
  const mapSize = 130; // px canvas size
  const worldSize = 2400; // world bounds
  const scale = mapSize / worldSize;

  return (
    <div className="relative w-[130px] h-[130px] bg-[#0d111d]/90 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1 pointer-events-auto">
      {/* Background Ocean & Island Mass */}
      <div className="relative w-full h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800/80">
        {/* Island Polygon */}
        <div
          className="absolute bg-emerald-950/60 border border-emerald-500/30 rounded-2xl"
          style={{
            left: `${150 * scale}px`,
            top: `${150 * scale}px`,
            width: `${2100 * scale}px`,
            height: `${2100 * scale}px`,
          }}
        />

        {/* Core Dot */}
        <div
          className="absolute w-2.5 h-2.5 bg-sky-400 border border-white rounded-full animate-pulse shadow-sm -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${state.core.x * scale}px`,
            top: `${state.core.y * scale}px`,
          }}
          title="Island Core"
        />

        {/* Breach Portals */}
        {state.activeBreaches.map((b, idx) => (
          <div
            key={idx}
            className="absolute w-2 h-2 bg-purple-500 rounded-full animate-ping -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${b.x * scale}px`,
              top: `${b.y * scale}px`,
            }}
          />
        ))}

        {/* Built Structures */}
        {state.structures.map((s) => (
          <div
            key={s.id}
            className="absolute w-1.5 h-1.5 bg-amber-400 rounded-sm -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${s.x * scale}px`,
              top: `${s.y * scale}px`,
            }}
          />
        ))}

        {/* Enemies */}
        {state.enemies.map((e) => (
          <div
            key={e.id}
            className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
              e.isBoss ? 'w-3 h-3 bg-rose-500 animate-ping' : 'w-1 h-1 bg-rose-400'
            }`}
            style={{
              left: `${e.x * scale}px`,
              top: `${e.y * scale}px`,
            }}
          />
        ))}

        {/* Players */}
        {Object.values(state.players).map((p) => {
          const isSelf = p.id === localPlayerId;
          return (
            <div
              key={p.id}
              className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
                isSelf ? 'w-2.5 h-2.5 bg-emerald-400 border border-white z-10' : 'w-1.5 h-1.5 bg-sky-300'
              }`}
              style={{
                left: `${p.x * scale}px`,
                top: `${p.y * scale}px`,
              }}
            />
          );
        })}

        {/* Active Pings */}
        {state.pings.map((ping) => (
          <div
            key={ping.id}
            className="absolute w-3 h-3 border-2 border-amber-400 rounded-full animate-ping -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${ping.x * scale}px`,
              top: `${ping.y * scale}px`,
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-1 right-1 px-1 bg-slate-900/90 text-[9px] font-mono text-slate-400 rounded">
        RADAR
      </div>
    </div>
  );
};
