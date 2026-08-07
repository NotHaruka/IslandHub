import { IslandPlayer } from './island';

export type WeaponType = 'plasma' | 'scatter' | 'railgun' | 'assault' | 'rocket' | 'beam';

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
  cost: number;
}

export type EnemyType = 'swarmer' | 'runner' | 'berserker' | 'spitter' | 'tank' | 'commander' | 'overlord';

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
  targetType: 'core' | 'structure' | 'player';
  targetId?: string;
  isElite?: boolean;
  isBoss?: boolean;
}

export type StructureType =
  | 'auto_turret'
  | 'heavy_cannon'
  | 'laser_turret'
  | 'slow_field'
  | 'shield_generator'
  | 'repair_station'
  | 'barricade';

export interface StructureDef {
  type: StructureType;
  name: string;
  description: string;
  cost: number;
  maxHp: number;
  range: number;
  damage: number;
  fireRate: number; // shots/sec
  color: string;
}

export interface DefensiveStructure {
  id: string;
  padId: string;
  type: StructureType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  range: number;
  damage: number;
  fireRate: number;
  cooldown: number;
  color: string;
  builderId?: string;
  targetId?: string;
}

export interface BuildPad {
  id: string;
  x: number;
  y: number;
  radius: number;
  structureId?: string;
}

export interface CoreEntity {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  level: number;
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
  isExplosive?: boolean;
  explosionRadius?: number;
  weaponType?: WeaponType;
}

export interface ResourceDrop {
  id: string;
  type: 'energy' | 'scrap';
  amount: number;
  x: number;
  y: number;
  life: number;
}

export interface PingMarker {
  id: string;
  x: number;
  y: number;
  type: 'help' | 'defend' | 'build' | 'resource';
  senderName: string;
  timestamp: number;
  life: number;
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

export type IslandPhase = 'peaceful' | 'warning' | 'defense' | 'intermission' | 'victory' | 'defeat';

export interface IslandDefenseState {
  wave: number;
  maxWaves: number;
  phase: IslandPhase;
  phaseTimer: number;
  enemiesSpawnedThisWave: number;
  activeBreaches: Array<{ name: string; x: number; y: number }>;
  core: CoreEntity;
  players: Record<string, IslandPlayer>;
  structures: DefensiveStructure[];
  buildPads: BuildPad[];
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  resourceDrops: ResourceDrop[];
  particles: ParticleEffect[];
  damageTexts: DamageText[];
  pings: PingMarker[];
  teamScore: number;
  totalKills: number;
  sharedResources: { energy: number; scrap: number };
}
