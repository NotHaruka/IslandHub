export interface PlayerAvatar {
  bodyColor: string;
  hat: 'none' | 'helmet' | 'visor' | 'crown' | 'headphones' | 'cap';
  skin: 'human' | 'android' | 'cyber' | 'alien';
  accessory: 'none' | 'cape' | 'aura' | 'wings';
}

export interface IslandPlayer {
  id: string;
  username: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'up' | 'down' | 'left' | 'right';
  avatar: PlayerAvatar;
  isBot?: boolean;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  weapon: string;
  resources: { energy: number; scrap: number };
  score: number;
  kills: number;
  damageDealt: number;
  isAlive: boolean;
  isDowned?: boolean;
  reviveProgress?: number; // 0 to 100
  aimAngle?: number;
  isShooting?: boolean;
  lastChat?: { text: string; timestamp: number };
  currentEmote?: { symbol: string; label: string; timestamp: number };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  channel: 'nearby' | 'global' | 'system';
}

export type EmoteType = 'wave' | 'laugh' | 'cheer' | 'point' | 'dance' | 'gg' | 'help';

export interface EmoteDefinition {
  id: EmoteType;
  symbol: string;
  label: string;
}

