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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0d111d] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Hammer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide uppercase text-slate-100">
                {existingStructure ? 'Structure Management' : 'Construct Defense'}
              </h2>
              <p className="text-xs text-slate-400">
                {existingStructure ? 'Upgrade or repair the defensive unit' : 'Select a turret or utility structure for this pad'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Structure Management Mode */}
        {existingStructure ? (
          <div className="space-y-6">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-100 uppercase">
                    {STRUCTURE_DEFS[existingStructure.type].name}
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                    LVL {existingStructure.level}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{STRUCTURE_DEFS[existingStructure.type].description}</p>
                {/* Health Bar */}
                <div className="mt-3 w-64">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>STRUCTURE HEALTH</span>
                    <span>
                      {Math.round(existingStructure.hp)} / {existingStructure.maxHp}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(existingStructure.hp / existingStructure.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Column */}
              <div className="text-right font-mono text-xs space-y-1 text-slate-300">
                <div>
                  Damage: <span className="text-amber-400 font-bold">{existingStructure.damage}</span>
                </div>
                <div>
                  Range: <span className="text-sky-400 font-bold">{existingStructure.range}px</span>
                </div>
                <div>
                  Fire Rate: <span className="text-emerald-400 font-bold">{existingStructure.fireRate}/s</span>
                </div>
              </div>
            </div>

            {/* Upgrade & Repair Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={existingStructure.level >= 3 || scrap < existingStructure.level * 150}
                onClick={() => {
                  soundManager.playUpgradeBuy();
                  onUpgrade(existingStructure.id);
                }}
                className={`flex items-center justify-between p-4 rounded-xl border text-left font-bold transition ${
                  existingStructure.level >= 3
                    ? 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    : scrap >= existingStructure.level * 150
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20 cursor-pointer active:scale-95'
                    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-sm uppercase">
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                    <span>
                      {existingStructure.level >= 3 ? 'MAX LEVEL' : `Upgrade to Level ${existingStructure.level + 1}`}
                    </span>
                  </div>
                  <div className="text-xs font-normal text-slate-400 mt-0.5">
                    +35% Damage, +15% Range, +150 Max HP
                  </div>
                </div>
                {existingStructure.level < 3 && (
                  <span className="font-mono text-xs px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-md shrink-0">
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
                className={`flex items-center justify-between p-4 rounded-xl border text-left font-bold transition ${
                  existingStructure.hp >= existingStructure.maxHp
                    ? 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    : scrap >= 35
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 cursor-pointer active:scale-95'
                    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-sm uppercase">
                    <Wrench className="w-4 h-4 text-emerald-400" />
                    <span>
                      {existingStructure.hp >= existingStructure.maxHp ? 'FULL HEALTH' : 'Repair Structure'}
                    </span>
                  </div>
                  <div className="text-xs font-normal text-slate-400 mt-0.5">Restores 100% structure health</div>
                </div>
                {existingStructure.hp < existingStructure.maxHp && (
                  <span className="font-mono text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-md shrink-0">
                    35 SCRAP
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Build Choice Selection Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
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
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition cursor-pointer ${
                    canAfford
                      ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 active:scale-98'
                      : 'bg-slate-950/60 border-slate-900/60 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-slate-100 uppercase">{def.name}</span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                          canAfford
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {def.cost} SCRAP
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{def.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
                    <span>
                      DMG: <strong className="text-slate-200">{def.damage}</strong>
                    </span>
                    <span>
                      RNG: <strong className="text-sky-300">{def.range}px</strong>
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
