import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, EmoteType } from '../types/island';
import { Send, Smile } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  messages: ChatMessage[];
  onSendChat: (text: string, channel: 'nearby' | 'global') => void;
  onSendEmote: (emote: EmoteType) => void;
}

const PRESET_MESSAGES = [
  'Hey everyone!',
  'GG WP!',
  'Need backup here!',
  'Defend the Core!',
  'Scrap collected!',
];

const EMOTE_LIST: { id: EmoteType; label: string }[] = [
  { id: 'wave', label: '[WAVE]' },
  { id: 'laugh', label: '[LAUGH]' },
  { id: 'cheer', label: '[CHEER]' },
  { id: 'point', label: '[POINT]' },
  { id: 'dance', label: '[DANCE]' },
  { id: 'gg', label: '[GG]' },
  { id: 'help', label: '[HELP]' },
];

export const IslandChat: React.FC<Props> = ({
  messages,
  onSendChat,
  onSendEmote,
}) => {
  const [text, setText] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    onSendChat(text, 'nearby');
    soundManager.playChatMessage();
    setText('');
  };

  const handleEmoteClick = (emote: EmoteType) => {
    onSendEmote(emote);
    soundManager.playEmoteChime();
    setShowEmotes(false);
  };

  if (isCollapsed) {
    return (
      <div className="fixed top-[85px] left-4 z-30 pointer-events-auto select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="px-2 py-1 bg-slate-950/70 border border-slate-800/60 text-sky-400 hover:text-sky-300 font-pixel-header text-[7px] tracking-wider transition cursor-pointer active:scale-95 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping shrink-0" />
          <span>[ SHOW CHAT ]</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-[85px] left-4 pointer-events-none z-30 max-w-xs sm:max-w-[280px] w-full flex flex-col gap-1.5 select-none">
      {/* Header bar */}
      <div className="pointer-events-auto flex items-center justify-between px-1">
        <span className="font-pixel-header text-[7px] text-slate-500 tracking-wider">COMMS LOG</span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="font-pixel-header text-[7px] text-slate-500 hover:text-rose-400 cursor-pointer transition"
          title="Minimize Chat"
        >
          [ HIDE ]
        </button>
      </div>

      {/* Messages Window */}
      <div className="pointer-events-auto bg-slate-950/60 border border-slate-800/50 backdrop-blur-[2px] p-2 h-28 overflow-y-auto flex flex-col gap-1 text-xs text-slate-200 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)]">
        {messages.length === 0 ? (
          <div className="text-slate-500 italic text-center my-auto font-pixel-text text-[9px] leading-relaxed">
            Welcome to the retro island! Use WASD/Arrows to move, Mouse to aim & shoot. Build structures on Pads, buy weapons at the Depot, and defend the Core!
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="leading-snug bg-slate-900/40 p-1 border border-slate-850/40 text-[10px] font-pixel-text">
              <span className="font-pixel-header text-[8px] text-sky-400 mr-1.5">[{m.senderName}]:</span>
              <span className="text-slate-200">{m.text}</span>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Emote Selector Overlay */}
      {showEmotes && (
        <div className="pointer-events-auto bg-slate-950/70 border border-slate-800/50 backdrop-blur-[2px] p-1.5 flex items-center gap-1.5 overflow-x-auto">
          {EMOTE_LIST.map((e) => (
            <button
              key={e.id}
              onClick={() => handleEmoteClick(e.id)}
              className="bg-slate-900/60 hover:bg-slate-800/80 px-2.5 py-1 text-[8px] font-pixel-header text-emerald-300 border border-slate-800/40 whitespace-nowrap cursor-pointer active:scale-95"
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      {/* Quick Presets */}
      <div className="pointer-events-auto flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {PRESET_MESSAGES.map((msg, i) => (
          <button
            key={i}
            onClick={() => {
              onSendChat(msg, 'nearby');
              soundManager.playChatMessage();
            }}
            className="whitespace-nowrap px-2 py-0.5 bg-slate-950/50 hover:bg-slate-900/70 text-slate-400 hover:text-slate-200 text-[7px] font-pixel-header border border-slate-850/40 transition cursor-pointer active:scale-95"
          >
            {msg.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/60 border border-slate-800/60 p-1 backdrop-blur-[2px] shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)]">
        <button
          type="button"
          onClick={() => setShowEmotes(!showEmotes)}
          className="p-1 text-amber-400 hover:text-amber-300 rounded-none cursor-pointer"
          title="Emotes"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="TYPE MSG..."
          className="flex-1 bg-transparent text-[9px] text-slate-100 placeholder-slate-600 focus:outline-none px-0.5 font-pixel-text uppercase"
        />

        <button
          type="submit"
          className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-pixel-header text-[7px] cursor-pointer active:scale-95"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
