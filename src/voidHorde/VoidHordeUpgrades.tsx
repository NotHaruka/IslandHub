import React, { useState } from 'react';
import { Shield, Zap, Bot, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  onSelectUpgrade: (upgradeId: string) => void;
  timer: number;
  hasSelected?: boolean;
}

const renderUpgradeIcon = (id: string) => {
  if (id === 'core_shield') return <Zap className="w-6 h-6 text-cyan-400" />;
  if (id === 'player_hp') return <Shield className="w-6 h-6 text-emerald-400" />;
  return <Bot className="w-6 h-6 text-purple-400" />;
};

const UPGRADE_OPTIONS = [
  {
    id: 'core_shield',
    title: 'CORE RE-OVERCHARGE',
    description: 'Instantly repairs Core HP by +300 and increases Core Max Shielding.',
    color: 'from-cyan-900 to-blue-950 border-cyan-500',
  },
  {
    id: 'player_hp',
    title: 'NANO-REPAIR SUIT',
    description: 'Increases Player Max HP by +40 and Max Shield by +25.',
    color: 'from-emerald-900 to-teal-950 border-emerald-500',
  },
  {
    id: 'turret_drone',
    title: 'AUTOMATED COMPANION TURRET',
    description: 'Deploys an automated orbital drone that fires plasma bolts at approaching Void foes.',
    color: 'from-purple-900 to-indigo-950 border-purple-500',
  },
];

export const VoidHordeUpgrades: React.FC<Props> = ({ onSelectUpgrade, timer, hasSelected }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isAlreadySelected = hasSelected || selectedId !== null;

  const handleSelect = (id: string) => {
    if (isAlreadySelected) return;
    setSelectedId(id);
    soundManager.playUpgradeBuy();
    onSelectUpgrade(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-cyan-400 bg-cyan-950 border border-cyan-800 px-3 py-1 rounded-full">
            INTERMISSION UPGRADE PHASE ({Math.ceil(timer)}s)
          </span>
          <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-300 to-amber-300 bg-clip-text text-transparent">
            SELECT TACTICAL UPGRADE
          </h2>
          <p className="text-xs text-slate-400">
            {isAlreadySelected ? 'Upgrade confirmed! Preparing for next wave...' : 'Choose one tactical enhancement before the next Void wave!'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {UPGRADE_OPTIONS.map((opt) => {
            const isThisChosen = selectedId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={isAlreadySelected}
                className={`p-5 rounded-2xl border bg-gradient-to-br ${opt.color} text-left flex flex-col justify-between gap-4 transition shadow-xl ${
                  isAlreadySelected
                    ? isThisChosen
                      ? 'ring-2 ring-emerald-400 scale-105'
                      : 'opacity-50 cursor-not-allowed'
                    : 'transform hover:scale-105 cursor-pointer group'
                }`}
              >
                <div className="space-y-2">
                  <div className="p-2.5 bg-black/40 rounded-xl inline-block">{renderUpgradeIcon(opt.id)}</div>
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300">{opt.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{opt.description}</p>
                </div>

                <div
                  className={`py-2 px-3 rounded-xl text-center text-xs font-black tracking-wider uppercase transition ${
                    isThisChosen
                      ? 'bg-emerald-500 text-slate-950 flex items-center justify-center gap-1'
                      : isAlreadySelected
                      ? 'bg-slate-800 text-slate-500'
                      : 'bg-white/10 group-hover:bg-cyan-400 group-hover:text-slate-950'
                  }`}
                >
                  {isThisChosen ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> EQUIPPED
                    </>
                  ) : isAlreadySelected ? (
                    'SELECTION LOCKED'
                  ) : (
                    'EQUIP UPGRADE'
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
