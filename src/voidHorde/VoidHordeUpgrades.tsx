import React from 'react';
import { Shield, Zap, Bot } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  onSelectUpgrade: (upgradeId: string) => void;
  timer: number;
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

export const VoidHordeUpgrades: React.FC<Props> = ({ onSelectUpgrade, timer }) => {
  const handleSelect = (id: string) => {
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
          <p className="text-xs text-slate-400">Choose one tactical enhancement before the next Void wave!</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {UPGRADE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`p-5 rounded-2xl border bg-gradient-to-br ${opt.color} text-left flex flex-col justify-between gap-4 transition transform hover:scale-105 shadow-xl group`}
            >
              <div className="space-y-2">
                <div className="p-2.5 bg-black/40 rounded-xl inline-block">{renderUpgradeIcon(opt.id)}</div>
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300">{opt.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{opt.description}</p>
              </div>

              <div className="py-2 px-3 bg-white/10 rounded-xl text-center text-xs font-black tracking-wider uppercase group-hover:bg-cyan-400 group-hover:text-slate-950 transition">
                EQUIP UPGRADE
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
