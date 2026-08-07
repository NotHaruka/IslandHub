import React, { useState } from 'react';
import { WeaponType, WeaponStats } from '../types/voidHorde';
import { WEAPON_DEFS } from '../config/weapons';
import { Crosshair, Shield, Zap, Sparkles, X, Check, ArrowRight } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'weapons' | 'core'>('weapons');
  const weapons: WeaponType[] = ['plasma', 'scatter', 'assault', 'rocket', 'beam', 'railgun'];
  const coreUpgradeCost = 250 * coreLevel;

  const currentWeaponStats = WEAPON_DEFS[currentWeapon as WeaponType] || WEAPON_DEFS.plasma;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-[#090d16] border-4 border-slate-700 pixel-shadow p-5 text-slate-100 rounded-none flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3.5 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border-2 border-sky-500 text-sky-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-pixel-header text-sm tracking-wide uppercase text-slate-100">DEFENSE DEPOT</h2>
              <p className="font-pixel-text text-xs text-slate-400 mt-1">Upgrade personal loadout or fortify the Island Core</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 border-2 border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer pixel-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Energy Vault (Highly visible status widget) */}
        <div className="flex items-center justify-between bg-slate-950 p-2.5 border-2 border-slate-800 mb-4 rounded-none">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-400 animate-pulse" />
            <span className="font-pixel-header text-[8px] text-slate-400">AVAILABLE ENERGY VAULT:</span>
          </div>
          <span className="font-pixel-header text-xs text-sky-400">
            {energy} <span className="text-[7px] text-slate-500">NRG</span>
          </span>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              soundManager.playChatMessage();
              setActiveTab('weapons');
            }}
            className={`flex-1 py-2.5 font-pixel-header text-[8px] uppercase tracking-wider border-2 transition cursor-pointer pixel-btn rounded-none ${
              activeTab === 'weapons'
                ? 'bg-sky-950/40 border-sky-500 text-sky-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            🔫 PERSONAL ARSENAL
          </button>

          <button
            onClick={() => {
              soundManager.playChatMessage();
              setActiveTab('core');
            }}
            className={`flex-1 py-2.5 font-pixel-header text-[8px] uppercase tracking-wider border-2 transition cursor-pointer pixel-btn rounded-none ${
              activeTab === 'core'
                ? 'bg-purple-950/40 border-purple-500 text-purple-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            💎 SHIELD CORE UPGRADES
          </button>
        </div>

        {/* Tab Content: WEAPONS */}
        {activeTab === 'weapons' && (
          <div className="space-y-4">
            {/* Compare Current Panel */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 flex items-center justify-between font-pixel-header text-[7px] text-slate-400">
              <span>CURRENT EQUIPPED: <strong className="text-sky-400">{currentWeaponStats.name.toUpperCase()}</strong></span>
              <div className="flex gap-3">
                <span>DMG: <strong className="text-slate-200">{currentWeaponStats.damage}</strong></span>
                <span>RATE: <strong className="text-slate-200">{currentWeaponStats.fireRate}/s</strong></span>
              </div>
            </div>

            {/* Weapons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
              {weapons.map((wKey) => {
                const wDef = WEAPON_DEFS[wKey];
                const isEquipped = currentWeapon === wKey;
                const canAfford = energy >= wDef.cost;

                return (
                  <div
                    key={wKey}
                    className={`p-3.5 border-2 flex flex-col justify-between transition rounded-none ${
                      isEquipped
                        ? 'bg-sky-950/20 border-sky-500'
                        : 'bg-slate-900 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-pixel-header text-[9px] text-slate-100 uppercase">{wDef.name}</span>
                        {isEquipped ? (
                          <span className="font-pixel-header text-[7px] px-2 py-0.5 bg-emerald-500 text-slate-950">
                            EQUIPPED
                          </span>
                        ) : (
                          <span
                            className={`font-pixel-header text-[7px] px-1.5 py-0.5 ${
                              canAfford
                                ? 'bg-sky-500 text-slate-950'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {wDef.cost === 0 ? 'FREE' : `${wDef.cost} NRG`}
                          </span>
                        )}
                      </div>
                      <p className="font-pixel-text text-xs text-slate-400 mb-2 leading-tight">{wDef.description}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                      <div className="font-pixel-header text-[7px] text-slate-400 space-x-2">
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
                          className={`px-3 py-1 font-pixel-header text-[7px] border-2 transition pixel-btn rounded-none ${
                            canAfford
                              ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-slate-950 shadow cursor-pointer active:scale-95'
                              : 'bg-slate-800 border-slate-900 text-slate-500 cursor-not-allowed'
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
        )}

        {/* Tab Content: CORE TECH */}
        {activeTab === 'core' && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-950/15 border-2 border-purple-800/50 rounded-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/10 border-2 border-purple-500 text-purple-300 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel-header text-xs uppercase text-slate-100">ISLAND CORE LVL {coreLevel}</span>
                    <span className="font-pixel-header text-[7px] text-purple-300">
                      ({Math.round(coreHp)} HP)
                    </span>
                  </div>
                  <p className="font-pixel-text text-sm text-slate-400 mt-1">Fortifies the Central Core to survive higher tier breach assaults.</p>
                </div>
              </div>

              <button
                disabled={energy < coreUpgradeCost}
                onClick={() => {
                  soundManager.playUpgradeBuy();
                  onUpgradeCore('health');
                }}
                className={`px-4 py-3.5 border-2 font-pixel-header text-[8px] uppercase tracking-wider flex items-center justify-center gap-2 transition pixel-btn rounded-none shrink-0 ${
                  energy >= coreUpgradeCost
                    ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-950 shadow-lg cursor-pointer active:scale-95'
                    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>UPGRADE CORES (+{coreUpgradeCost} NRG)</span>
              </button>
            </div>

            {/* Visual Core stats display */}
            <div className="p-3 bg-slate-950 border border-slate-800 text-center rounded-none font-pixel-text text-slate-400 text-sm">
              ✨ Upgrading Core increases base Max HP by <strong className="text-purple-300">+400</strong> and fully restores core structural health bars.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
