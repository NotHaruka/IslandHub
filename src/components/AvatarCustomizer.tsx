import React, { useEffect, useRef } from 'react';
import { IslandPlayer, PlayerAvatar } from '../types/island';
import { User, Sparkles, Shield, Crown } from 'lucide-react';

interface Props {
  username: string;
  avatar: PlayerAvatar;
  onChangeUsername: (name: string) => void;
  onChangeAvatar: (avatar: PlayerAvatar) => void;
  onClose: () => void;
}

const BODY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308'];
const HATS: PlayerAvatar['hat'][] = ['none', 'helmet', 'visor', 'crown', 'headphones', 'cap'];
const SKINS: PlayerAvatar['skin'][] = ['human', 'android', 'cyber', 'alien'];
const ACCESSORIES: PlayerAvatar['accessory'][] = ['none', 'cape', 'aura', 'wings'];

export const AvatarCustomizer: React.FC<Props> = ({
  username,
  avatar,
  onChangeUsername,
  onChangeAvatar,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + Math.sin(t) * 3;

      // Aura Effect
      if (avatar.accessory === 'aura') {
        const auraGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 38 + Math.sin(t * 2) * 4);
        auraGrad.addColorStop(0, `${avatar.bodyColor}88`);
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wings / Cape
      if (avatar.accessory === 'wings') {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(cx - 22, cy - 5, 18, 8, -Math.PI / 6 + Math.sin(t) * 0.1, 0, Math.PI * 2);
        ctx.ellipse(cx + 22, cy - 5, 18, 8, Math.PI / 6 - Math.sin(t) * 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (avatar.accessory === 'cape') {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 14, cy, 28, 22);
      }

      // Body Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 22, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = avatar.bodyColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      // Skin Tone Details
      ctx.fillStyle = avatar.skin === 'cyber' ? '#38bdf8' : avatar.skin === 'alien' ? '#84cc16' : '#fde047';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 10, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 4, cy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Hat
      if (avatar.hat === 'crown') {
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 12);
        ctx.lineTo(cx - 10, cy - 22);
        ctx.lineTo(cx - 4, cy - 16);
        ctx.lineTo(cx, cy - 24);
        ctx.lineTo(cx + 4, cy - 16);
        ctx.lineTo(cx + 10, cy - 22);
        ctx.lineTo(cx + 10, cy - 12);
        ctx.closePath();
        ctx.fill();
      } else if (avatar.hat === 'visor') {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(cx - 12, cy - 6, 24, 7);
      } else if (avatar.hat === 'helmet') {
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 15, Math.PI, 0);
        ctx.fill();
      } else if (avatar.hat === 'headphones') {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy - 5, 14, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(cx - 16, cy - 6, 6, 10);
        ctx.fillRect(cx + 10, cy - 6, 6, 10);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [avatar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-slate-200">
            <User className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-wide uppercase">Explorer Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-xs font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            Save & Close
          </button>
        </div>

        {/* Live Canvas Preview & Name */}
        <div className="flex flex-col items-center gap-3 bg-[#080b12] p-4 rounded-xl border border-slate-800">
          <canvas ref={canvasRef} width={120} height={120} className="rounded-lg" />
          <input
            type="text"
            value={username}
            onChange={(e) => onChangeUsername(e.target.value.substring(0, 16))}
            placeholder="Enter Name..."
            className="w-full text-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-400 text-slate-100"
          />
        </div>

        {/* Customization Options */}
        <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
          {/* Suit Color */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Suit Color
            </label>
            <div className="flex flex-wrap gap-2">
              {BODY_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChangeAvatar({ ...avatar, bodyColor: c })}
                  className={`w-6 h-6 rounded-full transition transform hover:scale-110 cursor-pointer ${
                    avatar.bodyColor === c ? 'ring-2 ring-emerald-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Hat */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Headwear
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HATS.map((h) => (
                <button
                  key={h}
                  onClick={() => onChangeAvatar({ ...avatar, hat: h })}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border capitalize transition cursor-pointer ${
                    avatar.hat === h
                      ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300'
                      : 'bg-[#080b12] border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Skin Type */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Species
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SKINS.map((s) => (
                <button
                  key={s}
                  onClick={() => onChangeAvatar({ ...avatar, skin: s })}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border capitalize transition cursor-pointer ${
                    avatar.skin === s
                      ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300'
                      : 'bg-[#080b12] border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Accessory */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Back Gear
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCESSORIES.map((a) => (
                <button
                  key={a}
                  onClick={() => onChangeAvatar({ ...avatar, accessory: a })}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border capitalize transition cursor-pointer ${
                    avatar.accessory === a
                      ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300'
                      : 'bg-[#080b12] border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
