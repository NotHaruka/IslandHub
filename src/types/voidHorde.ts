export type WeaponType = 'plasma' | 'scatter' | 'railgun';

export interface WeaponStats {
  id: WeaponType;
  name: string;
  description: string;
  damage: number;
  fireRate: number; // shots per sec
  projectileSpeed: number;
  spread: number;
  pellets: number;
  color: string;
  energyCost: number;
}

export type EnemyType = 'swarmer' | 'berserker' | 'spitter' | 'tank' | 'commander' | 'overlord';

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  color: string;
  attackCooldown: number;
  targetType: 'core' | 'player';
  targetId?: string;
  isElite?: boolean;
  isBoss?: boolean;
}

export interface PlayerEntity {
  id: string;
  username: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  weapon: WeaponType;
  score: number;
  kills: number;
  damageDealt: number;
  isAlive: boolean;
  color: string;
  turretUnlocked?: boolean;
  turretAngle?: number;
}

export interface CoreEntity {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  pulseTimer: number;
}

export interface ProjectileEntity {
  id: string;
  ownerId: string;
  isEnemy: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  pierce: number;
  life: number;
}

export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'offense' | 'defense' | 'core' | 'utility';
  effect: (player: PlayerEntity, core: CoreEntity) => void;
}

export interface ParticleEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

export interface DamageText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  isCrit?: boolean;
}

export interface VoidHordeState {
  roomId: string;
  wave: number;
  maxWaves: number;
  waveState: 'preparing' | 'spawning' | 'intermission' | 'boss' | 'victory' | 'defeat';
  waveTimer: number;
  core: CoreEntity;
  players: Record<string, PlayerEntity>;
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  particles: ParticleEffect[];
  damageTexts: DamageText[];
  score: number;
  totalKills: number;
}
