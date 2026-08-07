import React from 'react';
import { IslandDefenseState } from '../types/voidHorde';
import { Trophy, AlertOctagon, RotateCcw, Shield, Sparkles, Crosshair } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  state: IslandDefenseState;
  localPlayerId: string;
  onRestart: () => void;
}

export const VictoryDefeatModal: React.FC<Props> = ({ state, localPlayerId, onRestart }) => {
  const isVictory = state.phase === 'victory';
  const playersList = Object.values(state.players).sort((a, b) => b.kills - a.kills);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-[#090d16] border-4 border-slate-700 pixel-shadow p-6 text-slate-100 text-center rounded-none">
        
        {/* Banner */}
        <div className="flex flex-col items-center mb-6">
          <div
            className={`p-4 border-2 mb-4 rounded-none ${
              isVictory
                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                : 'bg-rose-500/10 border-rose-500 text-rose-400'
            }`}
          >
            {isVictory ? <Trophy className="w-10 h-10" /> : <AlertOctagon className="w-10 h-10 animate-bounce" />}
          </div>

          <h2 className={`font-pixel-header text-sm tracking-widest uppercase ${isVictory ? 'text-amber-400' : 'text-rose-500'}`}>
            {isVictory ? 'THE VOID REPELLED!' : 'ISLAND CORE COLLAPSED'}
          </h2>
          <p className="font-pixel-text text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
            {isVictory
              ? 'Excellent tactics! You and your team successfully defended the island central core from 10 severe Void Horde breaches!'
              : 'The Void Swarm overwhelmed the central energy pedestal. Upgrade defense turrets, equip advanced weapons, and try again!'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 p-4 bg-slate-950 border-2 border-slate-800 rounded-none font-pixel-header text-[7px] text-slate-300">
          <div>
            <div className="text-slate-500 text-[6px] uppercase mb-1">WAVES CLR</div>
            <div className="text-sm font-bold text-amber-400">{state.wave - 1} / 10</div>
          </div>
          <div>
            <div className="text-slate-500 text-[6px] uppercase mb-1">TOTAL KILLS</div>
            <div className="text-sm font-bold text-sky-400">{state.totalKills}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[6px] uppercase mb-1">TEAM SCORE</div>
            <div className="text-sm font-bold text-emerald-400">{state.teamScore}</div>
          </div>
        </div>

        {/* Squad Leaderboard */}
        <div className="mb-6 text-left">
          <h3 className="font-pixel-header text-[8px] uppercase tracking-wider text-slate-400 mb-3">Squad Performance</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {playersList.map((p, idx) => (
              <div
                key={p.id}
                className="p-3 bg-slate-900/60 border border-slate-800 rounded-none flex items-center justify-between font-pixel-text text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-pixel-header text-[7px] text-slate-500">#{idx + 1}</span>
                  <span className="font-bold text-slate-200">{p.username}</span>
                  {p.id === localPlayerId && (
                    <span className="font-pixel-header text-[6px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 border border-sky-800/40">YOU</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-slate-400 font-pixel-header text-[7px]">
                  <span>
                    KILLS: <strong className="text-amber-400">{p.kills}</strong>
                  </span>
                  <span>
                    DMG: <strong className="text-sky-400">{p.damageDealt}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restart Action */}
        <button
          onClick={() => {
            soundManager.playChatMessage();
            onRestart();
          }}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-pixel-header text-[8px] tracking-widest border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> REBUILD CENTRAL CORE & PLAY AGAIN
        </button>
      </div>
    </div>
  );
};
