import React, { useEffect, useState, useRef } from 'react';
import { networkClient } from './networking/NetworkClient';
import { IslandPlayer, ChatMessage, PlayerAvatar } from './types/island';
import { IslandDefenseState, BuildPad, DefensiveStructure, StructureType, WeaponType } from './types/voidHorde';
import { ServerMessage } from './types/networking';

import { IslandCanvas } from './island/IslandCanvas';
import { IslandHUD } from './island/IslandHUD';
import { IslandChat } from './island/IslandChat';
import { BuildMenuModal } from './island/BuildMenuModal';
import { DepotModal } from './island/DepotModal';
import { Minimap } from './island/Minimap';
import { VictoryDefeatModal } from './island/VictoryDefeatModal';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { MobileJoystick } from './components/MobileJoystick';

import { Volume2, VolumeX, Sparkles, Radio, AlertCircle } from 'lucide-react';
import { soundManager } from './audio/soundManager';

export default function App() {
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [username, setUsername] = useState<string>(() => 'Defender_' + Math.floor(Math.random() * 899 + 100));
  const [avatar, setAvatar] = useState<PlayerAvatar>({
    bodyColor: '#38bdf8',
    hat: 'none',
    skin: 'human',
    accessory: 'none',
  });

  const [islandState, setIslandState] = useState<IslandDefenseState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & UI overlays
  const [selectedPad, setSelectedPad] = useState<{ pad: BuildPad; existingStruct: DefensiveStructure | null } | null>(
    null
  );
  const [showDepot, setShowDepot] = useState(false);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [touchShooting, setTouchShooting] = useState(false);

  // Controls & Inputs
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
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      keysPressed.current[e.code] = true;
      setKeysState({ ...keysPressed.current });
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
  }, []);

  // Connect to Network WebSocket & Subscribe
  useEffect(() => {
    networkClient.connect(username, avatar);

    const unsubscribe = networkClient.subscribe((msg: ServerMessage) => {
      switch (msg.type) {
        case 'init_client':
          setLocalPlayerId(msg.playerId);
          setIslandState(msg.islandState);
          break;

        case 'island_state_sync':
          setIslandState(msg.islandState);
          break;

        case 'chat_broadcast':
          setChatMessages((prev) => [...prev.slice(-49), msg.message]);
          break;

        case 'ping_broadcast':
          soundManager.playPing();
          break;

        case 'island_event':
          if (msg.eventType === 'wave_warning') soundManager.playWaveHorn();
          else if (msg.eventType === 'wave_start') soundManager.playWaveHorn();
          else if (msg.eventType === 'boss_spawn' || msg.eventType === 'core_hit') soundManager.playCoreAlarm();
          else if (msg.eventType === 'wave_complete') soundManager.playUpgradeBuy();
          break;

        case 'error':
          setErrorMessage(msg.message);
          setTimeout(() => setErrorMessage(null), 4000);
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

  const handleSelectPad = (pad: BuildPad, existingStruct: DefensiveStructure | null) => {
    setSelectedPad({ pad, existingStruct });
  };

  const handleBuildStructure = (padId: string, structureType: StructureType) => {
    networkClient.buildStructure(padId, structureType);
    setSelectedPad(null);
  };

  const handleUpgradeStructure = (structureId: string) => {
    networkClient.upgradeStructure(structureId);
    setSelectedPad(null);
  };

  const handleRepairStructure = (structureId: string) => {
    networkClient.repairStructure(structureId);
    setSelectedPad(null);
  };

  const handleUpgradeCore = (type: 'health' | 'shield' | 'turret') => {
    networkClient.upgradeCore(type);
  };

  const handleBuyWeapon = (weapon: WeaponType) => {
    networkClient.buyWeapon(weapon);
  };

  const localPlayer = islandState?.players[localPlayerId];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Server Error Toast Banner */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Active Island Game Canvas & Overlay UI */}
      {islandState && (
        <>
          <IslandCanvas
            localPlayerId={localPlayerId}
            state={islandState}
            onSendInput={(x, y, vx, vy, facing, shooting, aimAngle) =>
              networkClient.sendIslandInput(x, y, vx, vy, facing, shooting, aimAngle)
            }
            onSelectPad={handleSelectPad}
            onRevivePlayer={(targetId) => networkClient.revivePlayer(targetId)}
            onCollectResource={(resId) => networkClient.collectResource(resId)}
            keysPressed={keysState}
            joystickVel={joystickVel}
            touchShooting={touchShooting}
          />

          <IslandHUD
            state={islandState}
            localPlayerId={localPlayerId}
            onOpenDepot={() => setShowDepot(true)}
            onTriggerNextWave={() => networkClient.triggerNextWave()}
            onOpenPingMenu={() =>
              networkClient.pingLocation(localPlayer?.x || 1200, localPlayer?.y || 1200, 'defend')
            }
          />

          <IslandChat
            messages={chatMessages}
            onSendChat={(txt, channel) => networkClient.sendChat(txt, channel)}
            onSendEmote={(emote) => networkClient.sendEmote(emote)}
          />

          {/* Minimap Radar */}
          <div className="fixed bottom-4 right-4 z-30">
            <Minimap state={islandState} localPlayerId={localPlayerId} />
          </div>

          {/* Build Menu Modal */}
          {selectedPad && (
            <BuildMenuModal
              pad={selectedPad.pad}
              existingStructure={
                islandState.structures.find((s) => s.id === selectedPad.pad.structureId) || null
              }
              scrap={islandState.sharedResources.scrap}
              onBuild={handleBuildStructure}
              onUpgrade={handleUpgradeStructure}
              onRepair={handleRepairStructure}
              onClose={() => setSelectedPad(null)}
            />
          )}

          {/* Arsenal & Depot Modal */}
          {showDepot && (
            <DepotModal
              currentWeapon={localPlayer?.weapon || 'plasma'}
              energy={islandState.sharedResources.energy}
              coreLevel={islandState.core.level}
              coreHp={islandState.core.hp}
              coreMaxHp={islandState.core.maxHp}
              onBuyWeapon={handleBuyWeapon}
              onUpgradeCore={handleUpgradeCore}
              onClose={() => setShowDepot(false)}
            />
          )}

          {/* Victory or Defeat Summary Overlay */}
          {(islandState.phase === 'victory' || islandState.phase === 'defeat') && (
            <VictoryDefeatModal
              state={islandState}
              localPlayerId={localPlayerId}
              onRestart={() => networkClient.restartGame()}
            />
          )}
        </>
      )}

      {/* Top Controls: Profile Customizer & Mute */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setShowAvatarCustomizer(!showAvatarCustomizer)}
          className="p-2.5 bg-[#0d111d]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 rounded-xl text-slate-300 transition shadow-lg cursor-pointer"
          title="Customize Avatar Profile"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
        </button>

        <button
          onClick={toggleMute}
          className="p-2.5 bg-[#0d111d]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 rounded-xl text-slate-300 transition shadow-lg cursor-pointer"
          title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Avatar Customizer Modal */}
      {showAvatarCustomizer && (
        <AvatarCustomizer
          username={username}
          avatar={avatar}
          onSave={handleUpdateAvatar}
          onClose={() => setShowAvatarCustomizer(false)}
        />
      )}

      {/* Mobile Touch Controls */}
      {isTouchDevice && (
        <>
          <div className="fixed bottom-6 left-6 z-40 pointer-events-auto">
            <MobileJoystick
              onMove={(x, y) => setJoystickVel({ x, y })}
              onEnd={() => setJoystickVel({ x: 0, y: 0 })}
            />
          </div>

          <button
            onTouchStart={() => setTouchShooting(true)}
            onTouchEnd={() => setTouchShooting(false)}
            className="fixed bottom-8 right-8 z-40 w-20 h-20 bg-amber-500/80 active:bg-amber-600 border-2 border-amber-300 rounded-full flex items-center justify-center shadow-2xl text-slate-950 font-black text-xs uppercase tracking-wider backdrop-blur-md pointer-events-auto active:scale-95 transition"
          >
            FIRE
          </button>
        </>
      )}
    </div>
  );
}
