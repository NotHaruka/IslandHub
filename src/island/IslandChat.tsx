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
  'Who wants to play Void Horde?',
  'Need 1 more for Wave 10!',
  'Let us squad up!',
  'GG WP!',
];

const EMOTE_LIST: { id: EmoteType; label: string }[] = [
  { id: 'wave', label: '[Wave]' },
  { id: 'laugh', label: '[Laugh]' },
  { id: 'cheer', label: '[Cheer]' },
  { id: 'point', label: '[Point]' },
  { id: 'dance', label: '[Dance]' },
  { id: 'gg', label: '[GG]' },
  { id: 'help', label: '[Help]' },
];

export const IslandChat: React.FC<Props> = ({
  messages,
  onSendChat,
  onSendEmote,
}) => {
  const [text, setText] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
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

  return (
    <div className="fixed bottom-4 left-4 pointer-events-none z-30 max-w-sm w-full flex flex-col gap-2">
      {/* Messages Window */}
      <div className="pointer-events-auto bg-[#080b12]/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 h-40 overflow-y-auto flex flex-col gap-1.5 text-xs text-slate-200 shadow-xl">
        {messages.length === 0 ? (
          <div className="text-slate-500 italic text-center my-auto text-[11px]">
            Welcome to the Shared Island! Chat with nearby players or step up to the Arcade Portal.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="leading-snug bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/50 text-[11px]">
              <span className="font-bold text-slate-300 mr-1.5">[{m.senderName}]:</span>
              <span className="text-slate-200">{m.text}</span>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Emote Selector Overlay */}
      {showEmotes && (
        <div className="pointer-events-auto bg-[#080b12] border border-slate-800 rounded-xl p-2 flex items-center gap-1.5 overflow-x-auto shadow-xl">
          {EMOTE_LIST.map((e) => (
            <button
              key={e.id}
              onClick={() => handleEmoteClick(e.id)}
              className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-300 transition whitespace-nowrap border border-slate-700/80 cursor-pointer"
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      {/* Quick Presets */}
      <div className="pointer-events-auto flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {PRESET_MESSAGES.map((msg, i) => (
          <button
            key={i}
            onClick={() => {
              onSendChat(msg, 'nearby');
              soundManager.playChatMessage();
            }}
            className="whitespace-nowrap px-2.5 py-1 bg-[#080b12]/90 hover:bg-slate-800 text-slate-300 text-[10px] font-medium rounded-lg border border-slate-800 shadow-sm transition cursor-pointer"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="pointer-events-auto flex items-center gap-2 bg-[#080b12] border border-slate-800 rounded-xl p-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => setShowEmotes(!showEmotes)}
          className="p-1.5 text-amber-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          title="Emotes"
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a chat message..."
          className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none px-1"
        />

        <button
          type="submit"
          className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

