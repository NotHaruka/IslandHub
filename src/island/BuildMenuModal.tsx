import React from 'react';
import { BuildPad, DefensiveStructure, StructureType } from '../types/voidHorde';
import { STRUCTURE_DEFS } from '../config/structures';
import { Shield, Hammer, Wrench, Zap, Crosshair, Sparkles, X, ChevronUp } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  pad: BuildPad | null;
  existingStructure: DefensiveStructure | null;
  scrap: number;
  onBuild: (padId: string, structureType: StructureType) => void;
  onUpgrade: (structureId: string) => void;
  onRepair: (structureId: string) => void;
  onClose: () => void;
}

export const BuildMenuModal: React.FC<Props> = ({
  pad,
  existingStructure,
  scrap,
  onBuild,
  onUpgrade,
  onRepair,
  onClose,
}) => {
  if (!pad) return null;

  const structureTypes: StructureType[] = [
    'auto_turret',
    'heavy_cannon',
    'laser_turret',
    'slow_field',
    'shield_generator',
    'repair_station',
    'barricade',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#090d16] border-4 border-slate-700 pixel-shadow p-6 text-slate-100 rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border-2 border-amber-500 text-amber-400">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-pixel-header text-sm tracking-wide uppercase text-slate-100">
                {existingStructure ? 'UNIT PROFILE' : 'CONSTRUCT DEFENSE'}
              </h2>
              <p className="font-pixel-text text-xs text-slate-400 mt-1">
                {existingStructure ? 'Manage, upgrade, or repair defensive structures' : 'Construct turrets and utility installations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 border-2 border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer pixel-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Structure Management Mode */}
        {existingStructure ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#0d1525] border-2 border-slate-800 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel-header text-xs text-slate-100 uppercase">
                    {STRUCTURE_DEFS[existingStructure.type].name}
                  </span>
                  <span className="font-pixel-header text-[8px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    LVL {existingStructure.level}
                  </span>
                </div>
                <p className="font-pixel-text text-sm text-slate-400 mt-1">{STRUCTURE_DEFS[existingStructure.type].description}</p>
                
                {/* Health Bar */}
                <div className="mt-3 w-60">
                  <div className="flex justify-between font-pixel-header text-[7px] text-slate-400 mb-1">
                    <span>UNIT HEALTH</span>
                    <span>
                      {Math.round(existingStructure.hp)} / {existingStructure.maxHp}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-950 border border-slate-800 p-0.5">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(existingStructure.hp / existingStructure.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Column */}
              <div className="font-pixel-header text-[8px] space-y-1.5 text-slate-300 bg-slate-950/60 p-2.5 border border-slate-800/80 min-w-[120px]">
                <div>
                  DMG: <span className="text-amber-400 font-bold">{existingStructure.damage}</span>
                </div>
                <div>
                  RNG: <span className="text-sky-400 font-bold">{existingStructure.range}px</span>
                </div>
                <div>
                  SPD: <span className="text-emerald-400 font-bold">{existingStructure.fireRate}/s</span>
                </div>
              </div>
            </div>

            {/* Upgrade & Repair Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                disabled={existingStructure.level >= 3 || scrap < existingStructure.level * 150}
                onClick={() => {
                  soundManager.playUpgradeBuy();
                  onUpgrade(existingStructure.id);
                }}
                className={`flex items-center justify-between p-4 border-2 text-left font-bold transition pixel-btn rounded-none ${
                  existingStructure.level >= 3
                    ? 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    : scrap >= existingStructure.level * 150
                    ? 'bg-amber-950/20 border-amber-500 text-amber-200 hover:bg-amber-900/40 cursor-pointer active:scale-95'
                    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-pixel-header text-[9px] uppercase">
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                    <span>
                      {existingStructure.level >= 3 ? 'MAX LEVEL' : `UPGRADE TO L${existingStructure.level + 1}`}
                    </span>
                  </div>
                  <div className="font-pixel-text text-xs text-slate-400 mt-1">
                    +35% DMG, +15% Range, +150 HP
                  </div>
                </div>
                {existingStructure.level < 3 && (
                  <span className="font-pixel-header text-[7px] px-2 py-1 bg-amber-500 text-slate-950 rounded-none shrink-0">
                    {existingStructure.level * 150} SCRAP
                  </span>
                )}
              </button>

              <button
                disabled={existingStructure.hp >= existingStructure.maxHp || scrap < 35}
                onClick={() => {
                  soundManager.playRepair();
                  onRepair(existingStructure.id);
                }}
                className={`flex items-center justify-between p-4 border-2 text-left font-bold transition pixel-btn rounded-none ${
                  existingStructure.hp >= existingStructure.maxHp
                    ? 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    : scrap >= 35
                    ? 'bg-emerald-950/20 border-emerald-500 text-emerald-200 hover:bg-emerald-900/40 cursor-pointer active:scale-95'
                    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-pixel-header text-[9px] uppercase">
                    <Wrench className="w-4 h-4 text-emerald-400" />
                    <span>
                      {existingStructure.hp >= existingStructure.maxHp ? 'FULL HEALTH' : 'REPAIR'}
                    </span>
                  </div>
                  <div className="font-pixel-text text-xs text-slate-400 mt-1">Restores unit to 100% capacity</div>
                </div>
                {existingStructure.hp < existingStructure.maxHp && (
                  <span className="font-pixel-header text-[7px] px-2 py-1 bg-emerald-500 text-slate-950 rounded-none shrink-0">
                    35 SCRAP
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Build Choice Selection Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
            {structureTypes.map((sType) => {
              const def = STRUCTURE_DEFS[sType];
              const canAfford = scrap >= def.cost;

              return (
                <div
                  key={sType}
                  onClick={() => {
                    if (canAfford) {
                      soundManager.playBuildStructure();
                      onBuild(pad.id, sType);
                    }
                  }}
                  className={`p-3 border-2 flex flex-col justify-between transition cursor-pointer pixel-btn rounded-none ${
                    canAfford
                      ? 'bg-slate-900/90 border-slate-700 hover:border-amber-500 hover:bg-slate-850/80'
                      : 'bg-[#060a12] border-slate-900 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-pixel-header text-[9px] text-slate-100 uppercase">{def.name}</span>
                      <span
                        className={`font-pixel-header text-[7px] px-1.5 py-0.5 ${
                          canAfford
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {def.cost} SCRAP
                      </span>
                    </div>
                    <p className="font-pixel-text text-xs text-slate-400 leading-tight mb-2">{def.description}</p>
                  </div>

                  <div className="flex items-center justify-between font-pixel-header text-[7px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                    <span>
                      DMG: <strong className="text-slate-200">{def.damage}</strong>
                    </span>
                    <span>
                      RNG: <strong className="text-sky-300">{def.range}</strong>
                    </span>
                    <span>
                      HP: <strong className="text-emerald-300">{def.maxHp}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
