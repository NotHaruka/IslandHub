import { IslandPlayer, ChatMessage, EmoteType } from './island';
import { GameRoom, RoomPlayer } from './gameHub';
import { VoidHordeState, WeaponType } from './voidHorde';

// Client -> Server messages
export type ClientMessage =
  | { type: 'join_island'; username: string; avatar: IslandPlayer['avatar'] }
  | { type: 'move_island'; x: number; y: number; vx: number; vy: number; facing: IslandPlayer['facing'] }
  | { type: 'chat_msg'; text: string; channel: 'nearby' | 'global' }
  | { type: 'emote'; emote: EmoteType }
  | { type: 'create_room'; gameId: string; name: string; maxPlayers: number; autoStart?: boolean }
  | { type: 'join_room'; roomId: string }
  | { type: 'leave_room' }
  | { type: 'toggle_ready'; weapon?: WeaponType }
  | { type: 'select_weapon'; weapon: WeaponType }
  | { type: 'start_game' }
  | { type: 'vh_player_input'; x: number; y: number; vx: number; vy: number; shooting: boolean; aimAngle: number }
  | { type: 'vh_select_upgrade'; upgradeId: string }
  | { type: 'return_to_island' };

// Server -> Client messages
export type ServerMessage =
  | { type: 'init_client'; playerId: string; islandPlayers: IslandPlayer[]; rooms: GameRoom[] }
  | { type: 'player_joined_island'; player: IslandPlayer }
  | { type: 'player_left_island'; playerId: string }
  | { type: 'island_state_sync'; players: IslandPlayer[] }
  | { type: 'chat_broadcast'; message: ChatMessage }
  | { type: 'emote_broadcast'; playerId: string; emote: EmoteType; symbol: string; label: string }
  | { type: 'rooms_updated'; rooms: GameRoom[] }
  | { type: 'room_joined'; room: GameRoom; player: RoomPlayer }
  | { type: 'room_updated'; room: GameRoom }
  | { type: 'room_left' }
  | { type: 'game_started'; roomId: string; initialVhState: VoidHordeState }
  | { type: 'vh_state_sync'; vhState: VoidHordeState }
  | { type: 'vh_event'; eventType: 'wave_start' | 'wave_complete' | 'boss_spawn' | 'victory' | 'defeat' | 'core_hit' | 'upgrade_phase'; data?: any }
  | { type: 'error'; message: string };
