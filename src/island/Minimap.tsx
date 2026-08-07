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
    <div className="relative w-[134px] h-[134px] bg-slate-950/60 border border-slate-800/60 backdrop-blur-[2px] overflow-hidden p-0.5 pointer-events-auto shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]">
      {/* Background Ocean & Island Mass */}
      <div className="relative w-full h-full bg-slate-950/40 overflow-hidden border border-slate-900/50">
        {/* Island Box (Checkered retro grid zone) */}
        <div
          className="absolute bg-emerald-950/40 border border-emerald-500/20"
          style={{
            left: `${150 * scale}px`,
            top: `${150 * scale}px`,
            width: `${2100 * scale}px`,
            height: `${2100 * scale}px`,
          }}
        />

        {/* Core Dot (Square central power beacon) */}
        <div
          className="absolute w-2 h-2 bg-sky-400 border border-white animate-pulse -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${state.core.x * scale}px`,
            top: `${state.core.y * scale}px`,
          }}
          title="Central Core"
        />

        {/* Breach Portals */}
        {state.activeBreaches.map((b, idx) => (
          <div
            key={idx}
            className="absolute w-2 h-2 bg-purple-500 animate-ping -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${b.x * scale}px`,
              top: `${b.y * scale}px`,
            }}
          />
        ))}

        {/* Built Structures (Square fort pixels) */}
        {state.structures.map((s) => (
          <div
            key={s.id}
            className="absolute w-1.5 h-1.5 bg-amber-400 border border-amber-600 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${s.x * scale}px`,
              top: `${s.y * scale}px`,
            }}
          />
        ))}

        {/* Enemies (Red pixel swarm) */}
        {state.enemies.map((e) => (
          <div
            key={e.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${
              e.isBoss ? 'w-2.5 h-2.5 bg-rose-500 animate-bounce' : 'w-1 h-1 bg-rose-400'
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
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                isSelf ? 'w-2 h-2 bg-emerald-400 border border-white z-10 animate-pulse' : 'w-1.5 h-1.5 bg-sky-300'
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
            className="absolute w-3 h-3 border border-amber-400 animate-ping -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${ping.x * scale}px`,
              top: `${ping.y * scale}px`,
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-1 right-1 px-1 bg-slate-900/90 text-[7px] font-pixel-header text-slate-500">
        RADAR
      </div>
    </div>
  );
};
