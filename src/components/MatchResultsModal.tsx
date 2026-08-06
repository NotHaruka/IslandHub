import React from 'react';
import { VoidHordeState, PlayerEntity } from '../types/voidHorde';
import { Trophy, Skull, Crosshair, ArrowRight, RotateCcw } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  vhState: VoidHordeState;
  localPlayerId: string;
  onReturnToIsland: () => void;
}

export const MatchResultsModal: React.FC<Props> = ({ vhState, localPlayerId, onReturnToIsland }) => {
  const isVictory = vhState.waveState === 'victory';
  const playersList = Object.values(vhState.players) as PlayerEntity[];

  const handleReturn = () => {
    soundManager.playChatMessage();
    onReturnToIsland();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl text-slate-100 flex flex-col gap-6">
        {/* Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-slate-950 border border-slate-800">
            {isVictory ? (
              <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
            ) : (
              <Skull className="w-10 h-10 text-rose-500" />
            )}
          </div>

          <h2
            className={`text-3xl font-black tracking-wide ${
              isVictory
                ? 'bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-rose-400 to-red-600 bg-clip-text text-transparent'
            }`}
          >
            {isVictory ? 'VICTORY PRESERVED!' : 'CORE OVERRUN - DEFEAT'}
          </h2>

          <p className="text-xs text-slate-400">
            {isVictory
              ? 'The Void Overlord was vanquished! The Core stands victorious.'
              : 'The Core was destroyed by the Void Horde. Squad retreat initiated.'}
          </p>
        </div>

        {/* Match Statistics */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
            <span>Squad Performance</span>
            <span className="text-cyan-400 font-mono">Waves Cleared: {vhState.wave - 1} / {vhState.maxWaves}</span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {playersList.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color || '#3b82f6' }}
                  />
                  <span className="font-bold text-slate-200">{p.username}</span>
                  {p.id === localPlayerId && (
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 rounded">
                      YOU
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-cyan-400" /> {p.kills} Kills
                  </span>
                  <span className="text-amber-400 font-bold">{p.score} PTS</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Return Button */}
        <button
          onClick={handleReturn}
          className="w-full py-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" /> RETURN TO SHARED ISLAND
        </button>
      </div>
    </div>
  );
};
