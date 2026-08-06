import React from 'react';
import { VoidHordeState } from '../types/voidHorde';
import { Shield, Heart, Skull, Zap, AlertTriangle } from 'lucide-react';

interface Props {
  vhState: VoidHordeState;
  localPlayerId: string;
}

export const VoidHordeHUD: React.FC<Props> = ({ vhState, localPlayerId }) => {
  const localPlayer = vhState.players[localPlayerId];
  const core = vhState.core;

  const coreHpPercent = Math.max(0, Math.min(100, (core.hp / core.maxHp) * 100));
  const coreShieldPercent = Math.max(0, Math.min(100, (core.shield / core.maxShield) * 100));

  const playerHpPercent = localPlayer ? Math.max(0, Math.min(100, (localPlayer.hp / localPlayer.maxHp) * 100)) : 100;
  const playerShieldPercent = localPlayer ? Math.max(0, Math.min(100, (localPlayer.shield / localPlayer.maxShield) * 100)) : 100;

  return (
    <>
      {/* Viewport Vignette Effect */}
      <div className="fixed inset-0 pointer-events-none z-20 shadow-[inset_0_0_120px_rgba(0,0,0,0.65)]" />

      <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4">
        {/* Top Center: CORE Objective & Wave Counter */}
        <div className="self-center mt-14 max-w-lg w-full bg-[#080b12]/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 px-4 shadow-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2 text-slate-200">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> CENTRAL CORE
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded font-mono font-bold">
                WAVE {vhState.wave}/{vhState.maxWaves}
              </span>
              <span className="text-rose-400 flex items-center gap-1 font-mono font-bold bg-rose-950/40 border border-rose-900/60 px-2 py-0.5 rounded">
                <Skull className="w-3 h-3" /> {vhState.enemies.length}
              </span>
            </div>
          </div>

          {/* Core Health & Shield Bar */}
          <div className="space-y-1">
            <div className="h-2.5 w-full bg-slate-950 rounded-full border border-slate-800/80 overflow-hidden relative">
              {/* Shield Overlay */}
              <div
                className="h-full bg-sky-400 transition-all duration-300 absolute left-0 top-0 opacity-70"
                style={{ width: `${coreShieldPercent}%` }}
              />
              {/* HP */}
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${coreHpPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono font-medium text-slate-400 px-0.5">
              <span>CORE HP: {Math.round(core.hp)}/{core.maxHp}</span>
              <span>SHIELD: {Math.round(core.shield)}/{core.maxShield}</span>
            </div>
          </div>

          {/* Status Warning Banner */}
          {vhState.waveState === 'preparing' && (
            <div className="text-center text-xs font-bold text-amber-300 animate-pulse">
              WAVE COMMENCING IN {Math.ceil(vhState.waveTimer)}S — HOLD DEFENSIVE PERIMETER
            </div>
          )}
          {vhState.waveState === 'boss' && (
            <div className="text-center text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> OVERLORD THREAT DETECTED
            </div>
          )}
        </div>

        {/* Bottom Left: Local Player Status */}
        <div className="bg-[#080b12]/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 max-w-xs w-full shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="text-slate-100">{localPlayer?.username || 'Operator'}</span>
            <span className="font-mono text-amber-400">PTS: {localPlayer?.score || 0}</span>
          </div>

          {/* Player HP */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-emerald-400">
                <Heart className="w-3 h-3 fill-emerald-400" /> HP
              </span>
              <span>{Math.round(localPlayer?.hp || 0)} / {localPlayer?.maxHp || 100}</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${playerHpPercent}%` }}
              />
            </div>
          </div>

          {/* Player Shield */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-sky-400">
                <Shield className="w-3 h-3 fill-sky-400" /> SHIELD
              </span>
              <span>{Math.round(localPlayer?.shield || 0)} / {localPlayer?.maxShield || 50}</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all"
                style={{ width: `${playerShieldPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
