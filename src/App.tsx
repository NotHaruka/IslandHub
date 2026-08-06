import React, { useEffect, useState, useRef } from 'react';
import { networkClient } from './networking/NetworkClient';
import { IslandPlayer, ChatMessage, PlayerAvatar } from './types/island';
import { GameRoom } from './types/gameHub';
import { VoidHordeState } from './types/voidHorde';
import { ServerMessage } from './types/networking';

import { IslandCanvas } from './island/IslandCanvas';
import { IslandChat } from './island/IslandChat';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { GameHubModal } from './gameHub/GameHubModal';
import { RoomLobby } from './gameHub/RoomLobby';
import { VoidHordeCanvas } from './voidHorde/VoidHordeCanvas';
import { VoidHordeHUD } from './voidHorde/VoidHordeHUD';
import { VoidHordeUpgrades } from './voidHorde/VoidHordeUpgrades';
import { MatchResultsModal } from './components/MatchResultsModal';
import { MobileJoystick } from './components/MobileJoystick';

import { Gamepad2, Volume2, VolumeX, Sparkles, Radio, AlertCircle } from 'lucide-react';
import { soundManager } from './audio/soundManager';

export default function App() {
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [username, setUsername] = useState<string>(() => 'Explorer_' + Math.floor(Math.random() * 899 + 100));
  const [avatar, setAvatar] = useState<PlayerAvatar>({
    bodyColor: '#38bdf8',
    hat: 'none',
    skin: 'human',
    accessory: 'none',
  });

  const [screen, setScreen] = useState<'island' | 'game_hub' | 'room_lobby' | 'void_horde'>('island');
  const [islandPlayers, setIslandPlayers] = useState<IslandPlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [vhState, setVhState] = useState<VoidHordeState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [touchShooting, setTouchShooting] = useState(false);

  // Input States
  const keysPressed = useRef<Record<string, boolean>>({});
  const [keysState, setKeysState] = useState<Record<string, boolean>>({});
  const [joystickVel, setJoystickVel] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Detect Touch / Mobile Screen
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing in chat
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      keysPressed.current[e.code] = true;
      setKeysState({ ...keysPressed.current });

      // Shortcut E to open Game Hub portal when near
      if (e.code === 'KeyE' && screen === 'island') {
        const p = islandPlayers.find((pl) => pl.id === localPlayerId);
        if (p) {
          const dist = Math.hypot(p.x - 700, p.y - 220);
          if (dist < 120) {
            setScreen('game_hub');
            soundManager.playChatMessage();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      setKeysState({ ...keysPressed.current });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen, islandPlayers, localPlayerId]);

  // Connect to Network WebSocket & Subscribe
  useEffect(() => {
    networkClient.connect(username, avatar);

    const unsubscribe = networkClient.subscribe((msg: ServerMessage) => {
      switch (msg.type) {
        case 'init_client':
          setLocalPlayerId(msg.playerId);
          setIslandPlayers(msg.islandPlayers);
          setRooms(msg.rooms);
          break;

        case 'island_state_sync':
          setIslandPlayers(msg.players);
          break;

        case 'chat_broadcast':
          setChatMessages((prev) => [...prev.slice(-49), msg.message]);
          break;

        case 'rooms_updated':
          setRooms(msg.rooms);
          break;

        case 'room_joined':
          setCurrentRoom(msg.room);
          if (msg.room.state === 'playing') {
            setScreen('void_horde');
          } else {
            setScreen('room_lobby');
          }
          break;

        case 'room_updated':
          setCurrentRoom(msg.room);
          if (msg.room.state === 'playing') {
            setScreen('void_horde');
          } else if (msg.room.state === 'lobby') {
            setScreen('room_lobby');
          }
          break;

        case 'game_started':
          setVhState(msg.initialVhState);
          setScreen('void_horde');
          break;

        case 'vh_state_sync':
          setVhState(msg.vhState);
          break;

        case 'vh_event':
          if (msg.eventType === 'wave_start') soundManager.playWaveHorn();
          else if (msg.eventType === 'core_hit' || msg.eventType === 'boss_spawn') soundManager.playCoreAlarm();
          break;

        case 'error':
          setErrorMessage(msg.message);
          setTimeout(() => setErrorMessage(null), 4000);
          break;

        case 'room_left':
          setScreen('island');
          setCurrentRoom(null);
          setVhState(null);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update Avatar Profile
  const handleUpdateAvatar = (newUsername: string, newAvatar: PlayerAvatar) => {
    setUsername(newUsername);
    setAvatar(newAvatar);
    networkClient.updateProfile(newUsername, newAvatar);
  };

  // Sound Mute Toggle
  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsAudioMuted(muted);
  };

  // Island Portal Trigger
  const handleInteractPortal = () => {
    soundManager.playChatMessage();
    setScreen('game_hub');
  };

  // Game Hub Handlers
  const handleQuickPlay = (gameId: string) => {
    soundManager.playChatMessage();
    const openRoom = rooms.find((r) => r.gameId === gameId && r.state === 'lobby' && r.players.length < r.maxPlayers);
    if (openRoom) {
      networkClient.joinRoom(openRoom.id);
    } else {
      networkClient.createRoom(gameId, `${username}'s Squad`, 4, true);
    }
  };

  const handleCreateRoom = (gameId: string, name: string, maxPlayers: number) => {
    soundManager.playChatMessage();
    networkClient.createRoom(gameId, name, maxPlayers);
  };

  const handleJoinRoom = (roomId: string) => {
    soundManager.playChatMessage();
    networkClient.joinRoom(roomId);
  };

  const handleLeaveRoom = () => {
    soundManager.playChatMessage();
    networkClient.leaveRoom();
    setScreen('island');
    setCurrentRoom(null);
  };

  const handleToggleReady = (weapon?: any) => {
    networkClient.toggleReady(weapon);
  };

  const handleSelectWeapon = (weapon: any) => {
    networkClient.selectWeapon(weapon);
  };

  const handleStartGame = () => {
    networkClient.startGame();
  };

  const handleSelectUpgrade = (upgradeId: string) => {
    networkClient.selectUpgrade(upgradeId);
  };

  const handleReturnToIsland = () => {
    networkClient.returnToIsland();
    setScreen('island');
    setCurrentRoom(null);
    setVhState(null);
  };

  const realPlayerCount = islandPlayers.filter((p) => !p.isBot).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Server Error Toast Banner */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER BAR HUD */}
      <div className="fixed top-0 left-0 right-0 z-40 p-4 flex items-center justify-between pointer-events-none">
        {/* Left: App Branding & Status */}
        <div className="flex items-center gap-3 bg-[#0d111d]/90 backdrop-blur-md border border-slate-800 p-2.5 px-4 rounded-xl shadow-lg pointer-events-auto">
          <div className="p-1.5 bg-slate-800 border border-slate-700/80 rounded-lg text-emerald-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-slate-100 uppercase">
              Shared Island
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE ({realPlayerCount})</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {screen === 'island' && (
            <button
              onClick={() => {
                soundManager.playChatMessage();
                setScreen('game_hub');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition transform active:scale-95 uppercase tracking-wider cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" /> MULTIPLAYER ARCADE
            </button>
          )}

          <button
            onClick={() => setShowAvatarCustomizer(!showAvatarCustomizer)}
            className="p-2 bg-[#0d111d]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 rounded-lg text-slate-300 transition shadow-sm cursor-pointer"
            title="Customize Explorer Avatar"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            className="p-2 bg-[#0d111d]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 rounded-lg text-slate-300 transition shadow-sm cursor-pointer"
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN ACTIVE VIEW RENDERER */}
      {screen === 'island' && (
        <>
          <IslandCanvas
            localPlayerId={localPlayerId}
            players={islandPlayers}
            onInteractPortal={handleInteractPortal}
            onMoveInput={(x, y, vx, vy, facing) => networkClient.moveIsland(x, y, vx, vy, facing)}
            keysPressed={keysState}
            joystickVel={joystickVel}
          />

          <IslandChat
            messages={chatMessages}
            onSendChat={(txt, channel) => networkClient.sendChat(txt, channel)}
            onSendMessage={(txt, channel) => networkClient.sendChat(txt, channel)}
            onSendEmote={(emote) => networkClient.sendEmote(emote)}
          />
        </>
      )}

      {screen === 'game_hub' && (
        <GameHubModal
          rooms={rooms}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onQuickPlay={handleQuickPlay}
          onClose={() => setScreen('island')}
        />
      )}

      {screen === 'room_lobby' && currentRoom && (
        <RoomLobby
          room={currentRoom}
          localPlayerId={localPlayerId}
          onToggleReady={handleToggleReady}
          onSelectWeapon={handleSelectWeapon}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {screen === 'void_horde' && vhState && (
        <>
          <VoidHordeCanvas
            vhState={vhState}
            localPlayerId={localPlayerId}
            onSendInput={(x, y, vx, vy, shooting, aimAngle) =>
              networkClient.sendVhInput(x, y, vx, vy, shooting, aimAngle)
            }
            keysPressed={keysState}
            joystickVel={joystickVel}
            touchShooting={touchShooting}
          />

          <VoidHordeHUD vhState={vhState} localPlayerId={localPlayerId} />

          {/* Intermission Upgrade Modal */}
          {vhState.waveState === 'intermission' && (
            <VoidHordeUpgrades
              onSelectUpgrade={handleSelectUpgrade}
              timer={vhState.waveTimer}
              hasSelected={vhState.players[localPlayerId]?.hasSelectedUpgrade}
            />
          )}

          {/* Victory / Defeat End Game Modal */}
          {(vhState.waveState === 'victory' || vhState.waveState === 'defeat') && (
            <MatchResultsModal
              vhState={vhState}
              localPlayerId={localPlayerId}
              onReturnToIsland={handleReturnToIsland}
            />
          )}
        </>
      )}

      {/* 3. AVATAR CUSTOMIZER DRAWER */}
      {showAvatarCustomizer && (
        <AvatarCustomizer
          username={username}
          avatar={avatar}
          onSave={handleUpdateAvatar}
          onClose={() => setShowAvatarCustomizer(false)}
        />
      )}

      {/* 4. MOBILE / TOUCH CONTROLS */}
      {isTouchDevice && (
        <div className="fixed bottom-6 left-6 z-40 pointer-events-auto">
          <MobileJoystick
            onMove={(x, y) => setJoystickVel({ x, y })}
            onEnd={() => setJoystickVel({ x: 0, y: 0 })}
          />
        </div>
      )}

      {/* Touch Attack Button for Void Horde Mode */}
      {isTouchDevice && screen === 'void_horde' && (
        <button
          onTouchStart={() => setTouchShooting(true)}
          onTouchEnd={() => setTouchShooting(false)}
          className="fixed bottom-8 right-8 z-40 w-20 h-20 bg-rose-500/80 active:bg-rose-600 border-2 border-rose-300 rounded-full flex items-center justify-center shadow-2xl text-white font-black text-xs uppercase tracking-wider backdrop-blur-md pointer-events-auto active:scale-95 transition"
        >
          FIRE
        </button>
      )}
    </div>
  );
}
