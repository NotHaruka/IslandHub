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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-[#0d111d] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 text-center">
        {/* Banner */}
        <div className="flex flex-col items-center mb-6">
          <div
            className={`p-4 rounded-2xl border mb-3 ${
              isVictory
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {isVictory ? <Trophy className="w-12 h-12" /> : <AlertOctagon className="w-12 h-12" />}
          </div>

          <h2 className="text-2xl font-black uppercase tracking-wider text-slate-100">
            {isVictory ? 'THE VOID HORDE REPELLED!' : 'THE ISLAND CORE HAS FALLEN'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            {isVictory
              ? 'Congratulations! You and your squad successfully defended the island against all 10 Void Waves!'
              : 'Enemies overwhelmed the Core defenses. Rebuild the island tech and try again!'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-slate-900/80 border border-slate-800 rounded-xl font-mono text-xs">
          <div>
            <div className="text-slate-400 text-[10px] uppercase">SURVIVED WAVES</div>
            <div className="text-lg font-bold text-amber-400">{state.wave - 1} / 10</div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px] uppercase">TOTAL KILLS</div>
            <div className="text-lg font-bold text-sky-400">{state.totalKills}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px] uppercase">TEAM SCORE</div>
            <div className="text-lg font-bold text-emerald-400">{state.teamScore}</div>
          </div>
        </div>

        {/* Squad Leaderboard */}
        <div className="mb-6 text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Squad Performance</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {playersList.map((p, idx) => (
              <div
                key={p.id}
                className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between font-mono text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold">#{idx + 1}</span>
                  <span className="font-bold text-slate-200">{p.username}</span>
                  {p.id === localPlayerId && (
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded">YOU</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <span>
                    Kills: <strong className="text-amber-400">{p.kills}</strong>
                  </span>
                  <span>
                    Dmg: <strong className="text-sky-400">{p.damageDealt}</strong>
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
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> REBUILD CORE & PLAY AGAIN
        </button>
      </div>
    </div>
  );
};
