import React from 'react';
import { GameRoom, RoomPlayer } from '../types/gameHub';
import { WeaponType, WeaponStats } from '../types/voidHorde';
import { Crown, CheckCircle2, Shield, Play, LogOut, Crosshair, Zap, Radio, Users } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  room: GameRoom;
  localPlayerId: string;
  onToggleReady: (weapon?: WeaponType) => void;
  onSelectWeapon: (weapon: WeaponType) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const WEAPONS: Record<WeaponType, WeaponStats> = {
  plasma: {
    id: 'plasma',
    name: 'Plasma Blaster',
    description: 'Rapid-fire energy blaster with high accuracy and reliable single-target DPS.',
    damage: 35,
    fireRate: 8,
    projectileSpeed: 700,
    spread: 0.08,
    pellets: 1,
    color: '#38bdf8',
    energyCost: 0,
  },
  scatter: {
    id: 'scatter',
    name: 'Scatter Cannon',
    description: 'Fires 5 energy pellets in a wide cone. Devastating for horde crowd control.',
    damage: 22,
    fireRate: 3.5,
    projectileSpeed: 550,
    spread: 0.35,
    pellets: 5,
    color: '#fbbf24',
    energyCost: 0,
  },
  railgun: {
    id: 'railgun',
    name: 'Void Railgun',
    description: 'High-power piercing beam that penetrates multiple lined-up Void enemies.',
    damage: 180,
    fireRate: 1.8,
    projectileSpeed: 1100,
    spread: 0.01,
    pellets: 1,
    color: '#c084fc',
    energyCost: 0,
  },
};

export const RoomLobby: React.FC<Props> = ({
  room,
  localPlayerId,
  onToggleReady,
  onSelectWeapon,
  onStartGame,
  onLeaveRoom,
}) => {
  const localPlayer = room.players.find((p) => p.id === localPlayerId);
  const isHost = localPlayer?.isHost || false;

  const handleWeaponChange = (w: WeaponType) => {
    onSelectWeapon(w);
    soundManager.playChatMessage();
  };

  const handleStart = () => {
    soundManager.playWaveHorn();
    onStartGame();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800/90 flex items-center justify-between bg-[#080b12]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 border border-slate-700/80 rounded-xl text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide text-slate-100">{room.name}</h2>
                <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono">
                  #{room.roomCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">Tactical Squad Lobby ({room.players.length}/{room.maxPlayers} Members)</p>
            </div>
          </div>

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 hover:bg-rose-950/60 hover:border-rose-800 text-rose-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Leave Lobby
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 p-6 gap-6 overflow-y-auto bg-[#0b0f19]">
          {/* Left Column: Player Slots */}
          <div className="md:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" /> Squad Roster
            </h3>

            <div className="space-y-2.5">
              {Array.from({ length: room.maxPlayers }).map((_, idx) => {
                const player = room.players[idx];
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                      player
                        ? 'bg-[#080b12] border-slate-800 shadow-sm'
                        : 'bg-[#080b12]/30 border-slate-800/40 border-dashed text-slate-600'
                    }`}
                  >
                    {player ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shadow-inner"
                            style={{ backgroundColor: player.avatarColor }}
                          >
                            {player.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-200">{player.username}</span>
                              {player.isHost && (
                                <span className="text-amber-400" title="Squad Host">
                                  <Crown className="w-3.5 h-3.5 fill-amber-400" />
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono capitalize">
                              {WEAPONS[player.weapon]?.name || 'Plasma Blaster'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {player.isReady ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                              <CheckCircle2 className="w-3 h-3" /> READY
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded font-mono">
                              PREPARING
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs italic text-slate-600 mx-auto">Empty Slot — Waiting for player</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Weapon Selection & Match Start */}
          <div className="md:col-span-7 flex flex-col justify-between gap-6 bg-[#080b12] p-5 border border-slate-800 rounded-2xl">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" /> Primary Weapon Loadout
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(WEAPONS) as WeaponType[]).map((wKey) => {
                  const w = WEAPONS[wKey];
                  const isSelected = localPlayer?.weapon === wKey;
                  return (
                    <button
                      key={wKey}
                      onClick={() => handleWeaponChange(wKey)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-emerald-400 text-slate-100 shadow-md'
                          : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-xs text-slate-200">{w.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{w.description}</p>
                      </div>

                      {/* Stat Bars */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5 text-[10px] font-mono text-slate-400">
                        <div className="space-y-0.5">
                          <div className="flex justify-between"><span>DMG</span><span>{w.damage}</span></div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, (w.damage / 200) * 100)}%` }} />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between"><span>FIRE RATE</span><span>{w.fireRate}/s</span></div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (w.fireRate / 10) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Launch Bar */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => onToggleReady()}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition cursor-pointer ${
                  localPlayer?.isReady
                    ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300'
                    : 'bg-amber-400 hover:bg-amber-300 border-amber-300 text-slate-950 shadow-sm'
                }`}
              >
                {localPlayer?.isReady ? 'READY TO DEPLOY' : 'TOGGLE READY'}
              </button>

              {isHost ? (
                <button
                  onClick={handleStart}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition bg-emerald-500 hover:bg-emerald-400 text-slate-950 transform active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" /> LAUNCH MATCH
                </button>
              ) : (
                <div className="text-xs text-slate-400 font-medium text-center italic flex-1">
                  Waiting for host to launch...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
