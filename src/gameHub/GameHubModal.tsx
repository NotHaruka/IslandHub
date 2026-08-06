import React, { useState } from 'react';
import { GameMetadata, GameRoom } from '../types/gameHub';
import { Gamepad2, Users, Plus, Shield, ArrowRight, Lock, Play, Zap, Crosshair, Rocket } from 'lucide-react';

interface Props {
  rooms: GameRoom[];
  onCreateRoom: (gameId: string, roomName: string, maxPlayers: number) => void;
  onJoinRoom: (roomId: string) => void;
  onQuickPlay: (gameId: string) => void;
  onClose: () => void;
}

const AVAILABLE_GAMES: (Omit<GameMetadata, 'icon'> & { iconType: 'zap' | 'crosshair' | 'rocket' })[] = [
  {
    id: 'void_horde',
    title: 'VOID HORDE',
    tagline: 'Cooperative Sci-Fi Horde Defense',
    description: 'Protect the central Core against relentless waves of Void abominations. Gear up, upgrade weapons, and fight together!',
    iconType: 'zap',
    bannerColor: 'from-cyan-900 to-indigo-950 border-cyan-500/50',
    minPlayers: 1,
    maxPlayers: 4,
    status: 'available',
    tags: ['Action', 'Co-Op', 'Shooter', 'Waves'],
  },
  {
    id: 'nexus_arena',
    title: 'NEXUS ARENA',
    tagline: 'Cybernetic 2v2 PVP Combat',
    description: 'High-octane tactical arena battle between cyber champions. Master abilities and control power nodes.',
    iconType: 'crosshair',
    bannerColor: 'from-slate-900 to-slate-950 border-slate-800',
    minPlayers: 2,
    maxPlayers: 4,
    status: 'coming_soon',
    tags: ['PVP', 'Arena', 'Competitive'],
  },
  {
    id: 'star_racer',
    title: 'STAR RACER',
    tagline: 'Arcade Anti-Gravity Racing',
    description: 'Blaze through neon race tracks on custom hoverbikes. Deploy power-ups and drift around hyper-loops.',
    iconType: 'rocket',
    bannerColor: 'from-slate-900 to-slate-950 border-slate-800',
    minPlayers: 2,
    maxPlayers: 8,
    status: 'coming_soon',
    tags: ['Racing', 'Arcade', 'Speed'],
  },
];

const renderGameIcon = (iconType: string) => {
  if (iconType === 'zap') return <Zap className="w-5 h-5 text-amber-400" />;
  if (iconType === 'crosshair') return <Crosshair className="w-5 h-5 text-purple-400" />;
  return <Rocket className="w-5 h-5 text-cyan-400" />;
};

export const GameHubModal: React.FC<Props> = ({ rooms, onCreateRoom, onJoinRoom, onQuickPlay, onClose }) => {
  const [selectedGameId, setSelectedGameId] = useState<string>('void_horde');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('Void Squad');
  const [maxPlayers, setMaxPlayers] = useState(4);

  const selectedGame = AVAILABLE_GAMES.find((g) => g.id === selectedGameId) || AVAILABLE_GAMES[0];
  const activeGameRooms = rooms.filter((r) => r.gameId === selectedGameId && r.state === 'lobby');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(selectedGameId, roomName.trim() || 'Void Squad', maxPlayers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800/90 flex items-center justify-between bg-[#080b12]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/80 text-amber-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-slate-100 uppercase">
                Arcade Matchmaker
              </h2>
              <p className="text-xs text-slate-400">Select a game mode or hop directly into an open lobby</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            Back to Island
          </button>
        </div>

        {/* Content Body: Sidebar & Game Details */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Game Selection List (Left Column) */}
          <div className="md:col-span-4 border-r border-slate-800/90 p-4 space-y-2 bg-[#080b12]/60 overflow-y-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-2">
              Game Modes
            </span>

            {AVAILABLE_GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGameId(game.id)}
                className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                  selectedGameId === game.id
                    ? 'bg-slate-900 border-l-4 border-l-emerald-400 border-slate-700 text-slate-100 shadow-md'
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <div className="p-2 bg-slate-800/80 rounded-lg">{renderGameIcon(game.iconType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs tracking-wide text-slate-200 truncate">{game.title}</h3>
                    {game.status === 'coming_soon' && (
                      <span className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Soon
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{game.tagline}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Game Details & Active Rooms (Right Column) */}
          <div className="md:col-span-8 p-6 flex flex-col gap-6 overflow-y-auto bg-[#0b0f19]">
            {/* Banner Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#0d1322] border border-slate-800 shadow-xl flex flex-col justify-between gap-4 relative overflow-hidden">
              <div className="space-y-2 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700">{renderGameIcon(selectedGame.iconType)}</div>
                  <h3 className="text-xl font-bold tracking-wide text-slate-100">{selectedGame.title}</h3>
                </div>
                <p className="text-xs text-slate-300 max-w-lg leading-relaxed">{selectedGame.description}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 z-10 border-t border-slate-800/80">
                <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1.5 font-mono text-slate-300">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> {selectedGame.minPlayers}-{selectedGame.maxPlayers} Players
                  </span>
                  <div className="flex gap-1.5">
                    {selectedGame.tags.map((t) => (
                      <span key={t} className="bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedGame.status === 'available' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onQuickPlay(selectedGame.id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition transform active:scale-95 uppercase tracking-wider cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> QUICK HOP IN
                    </button>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> CREATE SQUAD
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Active Rooms Browser */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Open Squad Lobbies ({activeGameRooms.length})
                </h4>
              </div>

              {activeGameRooms.length === 0 ? (
                <div className="bg-[#080b12] border border-slate-800/80 rounded-xl p-8 text-center text-slate-400 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-300">No public squad lobbies active right now.</p>
                  <p className="text-[11px] text-slate-500">Click "Quick Hop In" to instantly spawn a solo/co-op match, or create a custom squad.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeGameRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-3.5 bg-[#080b12] border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between transition group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs text-slate-200">{room.name}</h5>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            #{room.roomCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-400" />
                          {room.players.length} / {room.maxPlayers} Members
                        </p>
                      </div>

                      <button
                        onClick={() => onJoinRoom(room.id)}
                        className="px-3.5 py-1.5 bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-200 font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        JOIN
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-slate-100"
          >
            <h3 className="text-base font-bold text-slate-100">Create Void Horde Squad</h3>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-400 block mb-1.5">
                Squad Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value.substring(0, 24))}
                className="w-full bg-[#080b12] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-400 text-slate-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-400 block mb-1.5">
                Max Players
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setMaxPlayers(num)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      maxPlayers === num
                        ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300'
                        : 'bg-[#080b12] border-slate-800 text-slate-400'
                    }`}
                  >
                    {num} {num === 1 ? 'Solo' : 'Players'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm cursor-pointer uppercase tracking-wider"
              >
                CREATE SQUAD
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
