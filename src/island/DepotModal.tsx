import React from 'react';
import { WeaponType, WeaponStats } from '../types/voidHorde';
import { WEAPON_DEFS } from '../config/weapons';
import { Crosshair, Shield, Zap, Sparkles, X, Check, ShieldAlert } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  currentWeapon: string;
  energy: number;
  coreLevel: number;
  coreHp: number;
  coreMaxHp: number;
  onBuyWeapon: (weapon: WeaponType) => void;
  onUpgradeCore: (type: 'health' | 'shield' | 'turret') => void;
  onClose: () => void;
}

export const DepotModal: React.FC<Props> = ({
  currentWeapon,
  energy,
  coreLevel,
  coreHp,
  coreMaxHp,
  onBuyWeapon,
  onUpgradeCore,
  onClose,
}) => {
  const weapons: WeaponType[] = ['plasma', 'scatter', 'assault', 'rocket', 'beam', 'railgun'];
  const coreUpgradeCost = 250 * coreLevel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0d111d] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Crosshair className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide uppercase text-slate-100">Defense Depot & Arsenal</h2>
              <p className="text-xs text-slate-400">Equip personal heavy weapons and boost island Core tech</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Tech Upgrade Bar */}
        <div className="mb-6 p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase text-slate-100">ISLAND CORE LVL {coreLevel}</span>
                <span className="text-xs font-mono text-purple-300">
                  ({Math.round(coreHp)} / {coreMaxHp} HP)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Increase maximum Core health and energy barrier</p>
            </div>
          </div>

          <button
            disabled={energy < coreUpgradeCost}
            onClick={() => {
              soundManager.playUpgradeBuy();
              onUpgradeCore('health');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition ${
              energy >= coreUpgradeCost
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg cursor-pointer active:scale-95'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>UPGRADE CORE ({coreUpgradeCost} ENERGY)</span>
          </button>
        </div>

        {/* Weapons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {weapons.map((wKey) => {
            const wDef = WEAPON_DEFS[wKey];
            const isEquipped = currentWeapon === wKey;
            const canAfford = energy >= wDef.cost;

            return (
              <div
                key={wKey}
                className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                  isEquipped
                    ? 'bg-sky-950/30 border-sky-500/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-100 uppercase">{wDef.name}</span>
                    {isEquipped ? (
                      <span className="flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                        <Check className="w-3 h-3" /> EQUIPPED
                      </span>
                    ) : (
                      <span
                        className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-md ${
                          canAfford
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {wDef.cost === 0 ? 'FREE' : `${wDef.cost} ENERGY`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{wDef.description}</p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                  <div className="text-[11px] font-mono text-slate-400 space-x-3">
                    <span>
                      DMG: <strong className="text-slate-200">{wDef.damage}</strong>
                    </span>
                    <span>
                      RATE: <strong className="text-sky-300">{wDef.fireRate}/s</strong>
                    </span>
                  </div>

                  {!isEquipped && (
                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        soundManager.playUpgradeBuy();
                        onBuyWeapon(wKey);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                        canAfford
                          ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow cursor-pointer active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      EQUIP
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
