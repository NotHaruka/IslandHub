import React from 'react';
import { IslandDefenseState } from '../types/voidHorde';
import { Shield, Zap, Hammer, Radio, AlertTriangle, FastForward, Heart, Crosshair, Users, Sparkles, Volume2, VolumeX, ShieldAlert, User } from 'lucide-react';
import { WEAPON_DEFS } from '../config/weapons';
import { soundManager } from '../audio/soundManager';

interface Props {
  state: IslandDefenseState;
  localPlayerId: string;
  onOpenDepot: () => void;
  onTriggerNextWave: () => void;
  onOpenPingMenu: () => void;
  onOpenCustomizer: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  theme: string;
  onChangeTheme: (theme: string) => void;
}

export const IslandHUD: React.FC<Props> = ({
  state,
  localPlayerId,
  onOpenDepot,
  onTriggerNextWave,
  onOpenPingMenu,
  onOpenCustomizer,
  isMuted,
  onToggleMute,
  theme,
  onChangeTheme,
}) => {
  const localPlayer = state.players[localPlayerId];
  const realPlayerCount = Object.values(state.players).filter((p) => !p.isBot).length;

  const activeWeaponStats = WEAPON_DEFS[localPlayer?.weapon as keyof typeof WEAPON_DEFS] || WEAPON_DEFS.plasma;

  const phaseColors: Record<string, string> = {
    peaceful: 'text-emerald-400',
    warning: 'text-amber-400 animate-pulse',
    defense: 'text-rose-400',
    intermission: 'text-sky-400',
    victory: 'text-amber-300 font-bold',
    defeat: 'text-rose-500 font-bold',
  };

  const phaseLabels: Record<string, string> = {
    peaceful: 'PEACEFUL — BUILD UP',
    warning: 'BREACH DETECTED!',
    defense: `WAVE ${state.wave} ACTIVE`,
    intermission: `WAVE ${state.wave} SURVIVED!`,
    victory: 'VICTORY — CORES ALIVE!',
    defeat: 'CORE DESTROYED — GAME OVER',
  };

  const coreHpPercent = state.core.hp / state.core.maxHp;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-3.5 sm:p-5 select-none">
      {/* 1. TOP ARCADE PANEL */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Pixel title */}
        <div className="flex items-center gap-2 px-1 py-0.5">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="font-pixel-header text-[7px] tracking-tight uppercase text-slate-400">CO-OP SURVIVAL</span>
            <span className="font-pixel-text text-emerald-400 text-[9px] font-bold leading-none mt-0.5">
              {realPlayerCount} PLAYER(S) ACTIVE
            </span>
          </div>
        </div>

        {/* Center: Phase indicator & wave progress */}
        <div className="flex flex-col items-center p-1 max-w-sm">
          <div className="flex items-center gap-1.5 text-center">
            {state.phase === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce shrink-0" />}
            <span className={`font-pixel-header text-[8px] tracking-wider uppercase ${phaseColors[state.phase] || 'text-slate-300'}`}>
              {phaseLabels[state.phase]}
            </span>
          </div>
          {state.phaseTimer > 0 && (
            <div className="mt-0.5 flex items-center gap-1">
              <span className="font-pixel-text text-slate-500 text-[9px]">SEC REMAINING:</span>
              <span className="font-pixel-header text-amber-400 text-[8px] ml-1">
                {Math.ceil(state.phaseTimer)}S
              </span>
            </div>
          )}

          {/* Core Critical Overlay */}
          {coreHpPercent < 0.3 && (
            <div className="mt-1 px-1.5 py-0.5 text-rose-400 text-[8px] font-pixel-header flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3 h-3 text-rose-400 animate-bounce" />
              <span>CORE CRITICAL: {Math.round(coreHpPercent * 100)}%</span>
            </div>
          )}
        </div>

        {/* Right: Sound & Style Customizer Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Sprite Theme Pack Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 border border-slate-800 rounded-lg">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <select
              value={theme}
              onChange={(e) => {
                soundManager.playUpgradeBuy();
                onChangeTheme(e.target.value);
              }}
              className="bg-transparent text-slate-200 font-pixel-header text-[7px] border-none outline-none focus:ring-0 cursor-pointer pr-1 uppercase"
            >
              <option value="classic" className="bg-slate-950 text-slate-200">🟢 CLASSIC</option>
              <option value="cyberpunk" className="bg-slate-950 text-slate-200">🟣 CYBERPUNK</option>
              <option value="wasteland" className="bg-slate-950 text-slate-200">🟡 TOXIC SLUDGE</option>
              <option value="magma" className="bg-slate-950 text-slate-200">🔴 LAVA DUNGEON</option>
              <option value="frozen" className="bg-slate-950 text-slate-200">🔵 FROZEN TUNDRA</option>
            </select>
          </div>

          <button
            onClick={onOpenCustomizer}
            className="p-1.5 bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 text-amber-400 hover:text-amber-300 transition cursor-pointer rounded-lg"
            title="Change Name"
          >
            <User className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleMute}
            className="p-1.5 bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer rounded-lg"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. BOTTOM CONTROL & STATS OVERLAY (Perfect 8-Bit Panel Grid) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pointer-events-auto">
        
        {/* Left block: Character life, Shared Resources & Arsenal shop */}
        <div className="flex flex-wrap items-center gap-3.5 bg-transparent border-none p-0">
          {/* Player HP */}
          <div className="flex flex-col min-w-[110px] pr-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-emerald-400 font-pixel-header text-[7px] flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500 animate-pulse" /> HP
              </span>
              <span className="font-pixel-header text-[7px] text-slate-200">
                {Math.round(localPlayer?.hp || 100)}/{Math.round(localPlayer?.maxHp || 100)}
              </span>
            </div>
            {/* Chunky HP progress */}
            <div className="w-full h-2 bg-slate-950/60 p-0.5 border border-slate-800/40">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, ((localPlayer?.hp || 100) / (localPlayer?.maxHp || 100)) * 100))}%` }}
              />
            </div>
          </div>

          {/* Resources Badge Display */}
          <div className="flex items-center gap-2.5 font-pixel-header text-[8px] text-slate-300 py-1">
            <span className="flex items-center gap-1 text-amber-400">
              <Hammer className="w-3.5 h-3.5 text-amber-400" /> 
              <span>{state.sharedResources.scrap} <span className="text-slate-500 text-[6px]">SCRAP</span></span>
            </span>
            <span className="text-slate-750">|</span>
            <span className="flex items-center gap-1 text-sky-400">
              <Zap className="w-3.5 h-3.5 text-sky-400" /> 
              <span>{state.sharedResources.energy} <span className="text-slate-500 text-[6px]">NRG</span></span>
            </span>
          </div>

          {/* Change Weapon / Arsenal Trigger */}
          <button
            onClick={() => {
              soundManager.playChatMessage();
              onOpenDepot();
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-sky-950/30 hover:bg-sky-900/50 border border-sky-500/30 text-sky-300 font-pixel-header text-[8px] transition cursor-pointer active:scale-95"
            title="Open Depot & Change Weapons [B]"
          >
            <Crosshair className="w-3 h-3 text-sky-400 animate-spin-slow" />
            <span>
              {activeWeaponStats.name.toUpperCase()} <span className="text-sky-500 ml-0.5 font-mono text-[6px] bg-slate-950/40 px-0.5 border border-sky-850/20">[B]</span>
            </span>
          </button>
        </div>

        {/* Right: Quick Ping & Wave Progression Start */}
        <div className="flex items-center gap-1.5 bg-transparent border-none p-0 shrink-0 self-end">
          <button
            onClick={() => {
              soundManager.playPing();
              onOpenPingMenu();
            }}
            className="p-1 text-slate-400 hover:text-amber-400 border border-transparent hover:border-amber-500/20 transition cursor-pointer active:scale-95"
            title="Ping Location"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          {state.phase === 'peaceful' && (
            <button
              onClick={() => {
                soundManager.playWaveHorn();
                onTriggerNextWave();
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-pixel-header text-[8px] tracking-wider transition cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <FastForward className="w-3 h-3 text-slate-950" />
              <span>START WAVE {state.wave}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
