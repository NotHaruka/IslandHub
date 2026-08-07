import React, { useState } from 'react';
import { PlayerAvatar } from '../types/island';
import { User, X } from 'lucide-react';

interface Props {
  username: string;
  avatar: PlayerAvatar;
  onSave: (username: string, avatar: PlayerAvatar) => void;
  onClose: () => void;
}

export const AvatarCustomizer: React.FC<Props> = ({
  username,
  avatar,
  onSave,
  onClose,
}) => {
  const [currentUsername, setCurrentUsername] = useState(username);

  const handleSaveAndClose = () => {
    onSave(currentUsername.trim() || 'Explorer', avatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-100 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-slate-200">
            <User className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-wide uppercase font-pixel-header">Change Username</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Block */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-pixel-header text-slate-400 uppercase tracking-wider">
            Enter New Callsign:
          </label>
          <input
            type="text"
            value={currentUsername}
            onChange={(e) => setCurrentUsername(e.target.value.substring(0, 16))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveAndClose();
            }}
            placeholder="Defender Call Sign..."
            className="w-full text-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-pixel-text tracking-wide focus:outline-none focus:border-emerald-400 text-slate-100 placeholder-slate-600 transition"
            autoFocus
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndClose}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition cursor-pointer"
          >
            Save Callsign
          </button>
        </div>
      </div>
    </div>
  );
};
