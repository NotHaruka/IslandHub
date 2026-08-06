export interface GameMetadata {
  id: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  bannerColor: string;
  minPlayers: number;
  maxPlayers: number;
  status: 'available' | 'coming_soon';
  tags: string[];
}

export interface RoomPlayer {
  id: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  weapon: 'plasma' | 'scatter' | 'railgun';
  avatarColor: string;
}

export type RoomState = 'lobby' | 'playing' | 'ended';

export interface GameRoom {
  id: string;
  roomCode: string;
  gameId: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  players: RoomPlayer[];
  state: RoomState;
  createdAt: number;
}
