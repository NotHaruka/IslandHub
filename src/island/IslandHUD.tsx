import React from 'react';
import { IslandDefenseState } from '../types/voidHorde';
import { Shield, Zap, Hammer, Radio, AlertTriangle, FastForward, Heart, Crosshair, Users, MapPin } from 'lucide-react';
import { WEAPON_DEFS } from '../config/weapons';
import { soundManager } from '../audio/soundManager';

interface Props {
  state: IslandDefenseState;
  localPlayerId: string;
  onOpenDepot: () => void;
  onTriggerNextWave: () => void;
  onOpenPingMenu: () => void;
}

export const IslandHUD: React.FC<Props> = ({
  state,
  localPlayerId,
  onOpenDepot,
  onTriggerNextWave,
  onOpenPingMenu,
}) => {
  const localPlayer = state.players[localPlayerId];
  const realPlayerCount = Object.values(state.players).filter((p) => !p.isBot).length;

  const activeWeaponStats = WEAPON_DEFS[localPlayer?.weapon as keyof typeof WEAPON_DEFS] || WEAPON_DEFS.plasma;

  const phaseColors: Record<string, string> = {
    peaceful: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40',
    warning: 'border-amber-500/50 text-amber-300 bg-amber-950/50 animate-pulse',
    defense: 'border-rose-500/60 text-rose-300 bg-rose-950/60',
    intermission: 'border-sky-500/50 text-sky-300 bg-sky-950/50',
    victory: 'border-amber-400/60 text-amber-200 bg-amber-950/60',
    defeat: 'border-rose-600/60 text-rose-300 bg-rose-950/60',
  };

  const phaseLabels: Record<string, string> = {
    peaceful: 'PEACEFUL PHASE — Gather Resources & Build Defenses',
    warning: '⚠ VOID BREACH DETECTED — Prepare Your Positions!',
    defense: `WAVE ${state.wave} ACTIVE — Defend the Core!`,
    intermission: `WAVE ${state.wave} SURVIVED! — Claiming Rewards`,
    victory: 'VICTORY — Void Horde Defeated!',
    defeat: 'CORE DESTROYED — Island Fall',
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4">
      {/* 1. TOP STATUS BAR */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: App Branding & Online Players */}
        <div className="flex items-center gap-3 bg-[#0d111d]/90 backdrop-blur-md border border-slate-800 p-2.5 px-4 rounded-xl shadow-xl pointer-events-auto">
          <div className="p-1.5 bg-slate-800 border border-slate-700/80 rounded-lg text-emerald-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-slate-100 uppercase">Multiplayer Island</h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CO-OP SQUAD ({realPlayerCount})</span>
            </div>
          </div>
        </div>

        {/* Center: Phase Banner & Timer */}
        <div
          className={`flex flex-col items-center p-2.5 px-6 rounded-xl border backdrop-blur-md shadow-2xl transition ${
            phaseColors[state.phase] || phaseColors.peaceful
          }`}
        >
          <div className="text-xs font-black tracking-widest uppercase flex items-center gap-2">
            {state.phase === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{phaseLabels[state.phase]}</span>
          </div>

          {state.phaseTimer > 0 && (
            <div className="text-[11px] font-mono font-bold mt-0.5 opacity-90">
              NEXT PHASE IN: <span className="text-white text-xs">{Math.ceil(state.phaseTimer)}s</span>
            </div>
          )}
        </div>

        {/* Right: Core Health Bar HUD */}
        <div className="bg-[#0d111d]/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl pointer-events-auto min-w-[220px]">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200 mb-1">
            <div className="flex items-center gap-1.5 text-sky-400">
              <Zap className="w-4 h-4" /> CORE STATUS
            </div>
            <span>{Math.round((state.core.hp / state.core.maxHp) * 100)}%</span>
          </div>

          {/* Health Progress */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                state.core.hp / state.core.maxHp < 0.3
                  ? 'bg-rose-500 animate-pulse'
                  : state.core.hp / state.core.maxHp < 0.6
                  ? 'bg-amber-400'
                  : 'bg-sky-400'
              }`}
              style={{ width: `${(state.core.hp / state.core.maxHp) * 100}%` }}
            />
          </div>

          {/* Shield Progress */}
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-indigo-400 transition-all duration-300"
              style={{ width: `${(state.core.shield / state.core.maxShield) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. BOTTOM CONTROL BAR */}
      <div className="flex items-end justify-between gap-4">
        {/* Left: Player HP, Shield, Resources & Active Weapon */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Player HP & Shield */}
          <div className="bg-[#0d111d]/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl min-w-[180px]">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200 mb-1">
              <span className="text-emerald-400 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-emerald-400" /> HEALTH
              </span>
              <span>{Math.round(localPlayer?.hp || 100)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{ width: `${((localPlayer?.hp || 100) / (localPlayer?.maxHp || 100)) * 100}%` }}
              />
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all duration-200"
                style={{ width: `${((localPlayer?.shield || 50) / (localPlayer?.maxShield || 50)) * 100}%` }}
              />
            </div>
          </div>

          {/* Team Resources Display */}
          <div className="bg-[#0d111d]/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
                <Hammer className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">SCRAP</div>
                <div className="font-bold text-amber-300 text-sm">{state.sharedResources.scrap}</div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className="p-1 bg-sky-500/10 border border-sky-500/30 rounded text-sky-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">VOID ENERGY</div>
                <div className="font-bold text-sky-300 text-sm">{state.sharedResources.energy}</div>
              </div>
            </div>
          </div>

          {/* Active Weapon Button (Opens Arsenal Depot) */}
          <button
            onClick={() => {
              soundManager.playChatMessage();
              onOpenDepot();
            }}
            className="bg-[#0d111d]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl flex items-center gap-3 transition cursor-pointer text-left active:scale-95"
            title="Open Arsenal & Defense Depot"
          >
            <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">EQUIPPED WEAPON</div>
              <div className="font-bold text-xs text-slate-100 uppercase">{activeWeaponStats.name}</div>
            </div>
          </button>
        </div>

        {/* Right: Fast-Forward Wave & Quick Ping Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Ping Button */}
          <button
            onClick={() => {
              soundManager.playPing();
              onOpenPingMenu();
            }}
            className="px-4 py-3 bg-[#0d111d]/90 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer active:scale-95 uppercase tracking-wider"
            title="Tactical Map Ping"
          >
            <MapPin className="w-4 h-4 text-amber-400" /> TACTICAL PING
          </button>

          {/* Fast Forward Peaceful Phase */}
          {state.phase === 'peaceful' && (
            <button
              onClick={() => {
                soundManager.playWaveHorn();
                onTriggerNextWave();
              }}
              className="px-4 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition transform active:scale-95 flex items-center gap-2 uppercase tracking-wider cursor-pointer"
            >
              <FastForward className="w-4 h-4" /> START WAVE {state.wave} NOW
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
