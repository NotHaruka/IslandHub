import { IslandPlayer, ChatMessage, EmoteType } from './island';
import { IslandDefenseState, StructureType, WeaponType } from './voidHorde';

// Client -> Server messages
export type ClientMessage =
  | { type: 'join_island'; username: string; avatar: IslandPlayer['avatar'] }
  | { type: 'update_profile'; username: string; avatar: IslandPlayer['avatar'] }
  | { type: 'island_input'; x: number; y: number; vx: number; vy: number; facing: IslandPlayer['facing']; shooting: boolean; aimAngle: number }
  | { type: 'chat_msg'; text: string; channel: 'nearby' | 'global' }
  | { type: 'emote'; emote: EmoteType }
  | { type: 'build_structure'; padId: string; structureType: StructureType }
  | { type: 'upgrade_structure'; structureId: string }
  | { type: 'repair_structure'; structureId: string }
  | { type: 'upgrade_core'; upgradeType: 'health' | 'shield' | 'turret' }
  | { type: 'buy_weapon'; weapon: WeaponType }
  | { type: 'trigger_next_wave' }
  | { type: 'revive_player'; targetPlayerId: string }
  | { type: 'ping_location'; x: number; y: number; pingType: 'help' | 'defend' | 'build' | 'resource' }
  | { type: 'collect_resource'; resourceId: string }
  | { type: 'restart_game' };

// Server -> Client messages
export type ServerMessage =
  | { type: 'init_client'; playerId: string; islandState: IslandDefenseState }
  | { type: 'player_joined_island'; player: IslandPlayer }
  | { type: 'player_left_island'; playerId: string }
  | { type: 'island_state_sync'; islandState: IslandDefenseState }
  | { type: 'chat_broadcast'; message: ChatMessage }
  | { type: 'emote_broadcast'; playerId: string; emote: EmoteType; symbol: string; label: string }
  | { type: 'ping_broadcast'; ping: IslandDefenseState['pings'][0] }
  | {
      type: 'island_event';
      eventType: 'wave_warning' | 'wave_start' | 'wave_complete' | 'boss_spawn' | 'victory' | 'defeat' | 'core_hit' | 'structure_destroyed' | 'cryo_pulse' | 'repair_pulse';
      data?: any;
    }
  | { type: 'error'; message: string };
