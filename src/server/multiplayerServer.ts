import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { IslandPlayer, ChatMessage, EmoteType } from '../types/island';
import {
  IslandDefenseState,
  DefensiveStructure,
  BuildPad,
  EnemyEntity,
  ProjectileEntity,
  ResourceDrop,
  PingMarker,
  StructureType,
  WeaponType,
} from '../types/voidHorde';
import { ClientMessage, ServerMessage } from '../types/networking';
import { WEAPON_DEFS } from '../config/weapons';
import { STRUCTURE_DEFS } from '../config/structures';

interface ClientConnection {
  ws: WebSocket;
  playerId: string;
  username: string;
  lastShotTime?: number;
}

export function setupMultiplayerServer(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/ws' || pathname === '/') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  const clients = new Map<WebSocket, ClientConnection>();

  // Initialize Build Pads along pathways and Core perimeter (2400 x 2400 map world size)
  const initialBuildPads: BuildPad[] = [
    // North Path
    { id: 'pad_n1', x: 1080, y: 500, radius: 24 },
    { id: 'pad_n2', x: 1320, y: 500, radius: 24 },
    { id: 'pad_n3', x: 1080, y: 850, radius: 24 },
    { id: 'pad_n4', x: 1320, y: 850, radius: 24 },
    // East Path
    { id: 'pad_e1', x: 1900, y: 1080, radius: 24 },
    { id: 'pad_e2', x: 1900, y: 1320, radius: 24 },
    { id: 'pad_e3', x: 1550, y: 1080, radius: 24 },
    { id: 'pad_e4', x: 1550, y: 1320, radius: 24 },
    // South Path
    { id: 'pad_s1', x: 1080, y: 1900, radius: 24 },
    { id: 'pad_s2', x: 1320, y: 1900, radius: 24 },
    { id: 'pad_s3', x: 1080, y: 1550, radius: 24 },
    { id: 'pad_s4', x: 1320, y: 1550, radius: 24 },
    // West Path
    { id: 'pad_w1', x: 500, y: 1080, radius: 24 },
    { id: 'pad_w2', x: 500, y: 1320, radius: 24 },
    { id: 'pad_w3', x: 850, y: 1080, radius: 24 },
    { id: 'pad_w4', x: 850, y: 1320, radius: 24 },
    // Central Plaza Perimeter
    { id: 'pad_c1', x: 1020, y: 1020, radius: 24 },
    { id: 'pad_c2', x: 1380, y: 1020, radius: 24 },
    { id: 'pad_c3', x: 1020, y: 1380, radius: 24 },
    { id: 'pad_c4', x: 1380, y: 1380, radius: 24 },
  ];

  // Global Unified Island Defense State
  let islandState: IslandDefenseState = {
    wave: 1,
    maxWaves: 10,
    phase: 'peaceful',
    phaseTimer: 30,
    enemiesSpawnedThisWave: 0,
    activeBreaches: [
      { name: 'North Breach', x: 1200, y: 250 },
      { name: 'East Breach', x: 2150, y: 1200 },
      { name: 'South Breach', x: 1200, y: 2150 },
      { name: 'West Breach', x: 250, y: 1200 },
    ],
    core: {
      x: 1200,
      y: 1200,
      radius: 55,
      hp: 1200,
      maxHp: 1200,
      shield: 600,
      maxShield: 600,
      level: 1,
      pulseTimer: 0,
    },
    players: {},
    structures: [
      // Pre-built starter auto turret
      {
        id: 'struct_init_1',
        padId: 'pad_c1',
        type: 'auto_turret',
        x: 1020,
        y: 1020,
        hp: 250,
        maxHp: 250,
        level: 1,
        range: 280,
        damage: 28,
        fireRate: 4,
        cooldown: 0,
        color: '#38bdf8',
      },
    ],
    buildPads: initialBuildPads,
    enemies: [],
    projectiles: [],
    resourceDrops: [],
    particles: [],
    damageTexts: [],
    pings: [],
    teamScore: 0,
    totalKills: 0,
    sharedResources: { energy: 450, scrap: 500 },
  };

  // Assign initial structure to pad_c1
  const padC1 = islandState.buildPads.find((p) => p.id === 'pad_c1');
  if (padC1) padC1.structureId = 'struct_init_1';

  // Ambient Island NPCs
  const botConfigs: IslandPlayer[] = [
    {
      id: 'bot_nova',
      username: 'Nova [Commander]',
      x: 1100,
      y: 1150,
      vx: 0,
      vy: 0,
      facing: 'down',
      avatar: { bodyColor: '#ec4899', hat: 'headphones', skin: 'cyber', accessory: 'aura' },
      isBot: true,
      hp: 100,
      maxHp: 100,
      shield: 50,
      maxShield: 50,
      weapon: 'plasma',
      resources: { energy: 100, scrap: 100 },
      score: 0,
      kills: 0,
      damageDealt: 0,
      isAlive: true,
      lastChat: { text: 'Prepare our defenses around the paths! Void breaches incoming!', timestamp: Date.now() },
    },
    {
      id: 'bot_atlas',
      username: 'Atlas [Engineer]',
      x: 1300,
      y: 1150,
      vx: 0,
      vy: 0,
      facing: 'left',
      avatar: { bodyColor: '#10b981', hat: 'visor', skin: 'android', accessory: 'none' },
      isBot: true,
      hp: 100,
      maxHp: 100,
      shield: 50,
      maxShield: 50,
      weapon: 'scatter',
      resources: { energy: 100, scrap: 100 },
      score: 0,
      kills: 0,
      damageDealt: 0,
      isAlive: true,
      lastChat: { text: 'I built an Auto Turret on pad C1! Gather scrap to upgrade it.', timestamp: Date.now() },
    },
  ];

  botConfigs.forEach((bot) => {
    islandState.players[bot.id] = bot;
  });

  // Helpers
  const sendTo = (ws: WebSocket, msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const broadcastAll = (msg: ServerMessage) => {
    const data = JSON.stringify(msg);
    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  };

  // Handle WebSocket Connection
  wss.on('connection', (ws: WebSocket) => {
    const playerId = `player_${Math.random().toString(36).substring(2, 9)}`;
    const clientConn: ClientConnection = {
      ws,
      playerId,
      username: 'Explorer',
    };
    clients.set(ws, clientConn);

    ws.on('message', (data: string) => {
      try {
        const msg: ClientMessage = JSON.parse(data.toString());

        switch (msg.type) {
          case 'join_island': {
            clientConn.username = msg.username || 'Explorer';

            const newPlayer: IslandPlayer = {
              id: playerId,
              username: clientConn.username,
              x: 1200 + (Math.random() * 120 - 60),
              y: 1200 + (Math.random() * 120 - 60),
              vx: 0,
              vy: 0,
              facing: 'down',
              avatar: msg.avatar || { bodyColor: '#3b82f6', hat: 'none', skin: 'human', accessory: 'none' },
              hp: 100,
              maxHp: 100,
              shield: 50,
              maxShield: 50,
              weapon: 'plasma',
              resources: { energy: 50, scrap: 50 },
              score: 0,
              kills: 0,
              damageDealt: 0,
              isAlive: true,
            };

            islandState.players[playerId] = newPlayer;

            sendTo(ws, {
              type: 'init_client',
              playerId,
              islandState,
            });

            broadcastAll({
              type: 'player_joined_island',
              player: newPlayer,
            });
            break;
          }

          case 'update_profile': {
            clientConn.username = msg.username || clientConn.username;
            const p = islandState.players[playerId];
            if (p) {
              p.username = clientConn.username;
              p.avatar = msg.avatar;
            }
            break;
          }

          case 'island_input': {
            const p = islandState.players[playerId];
            if (!p) return;

            if (p.isAlive && !p.isDowned) {
              p.x = Math.max(100, Math.min(2300, msg.x));
              p.y = Math.max(100, Math.min(2300, msg.y));
              p.vx = msg.vx;
              p.vy = msg.vy;
              p.facing = msg.facing;

              // Handle Player Shooting
              if (msg.shooting) {
                const now = Date.now();
                const wStats = WEAPON_DEFS[p.weapon as WeaponType] || WEAPON_DEFS.plasma;
                const cooldownMs = 1000 / wStats.fireRate;

                if (!clientConn.lastShotTime || now - clientConn.lastShotTime >= cooldownMs) {
                  clientConn.lastShotTime = now;

                  for (let i = 0; i < wStats.pellets; i++) {
                    const angleOffset = (Math.random() - 0.5) * wStats.spread;
                    const finalAngle = msg.aimAngle + angleOffset;

                    islandState.projectiles.push({
                      id: `proj_${now}_${Math.random().toString(36).substring(2, 6)}`,
                      ownerId: p.id,
                      isEnemy: false,
                      x: p.x,
                      y: p.y,
                      vx: Math.cos(finalAngle) * wStats.projectileSpeed,
                      vy: Math.sin(finalAngle) * wStats.projectileSpeed,
                      damage: wStats.damage,
                      radius: p.weapon === 'rocket' ? 8 : p.weapon === 'railgun' ? 6 : 4,
                      color: wStats.color,
                      pierce: p.weapon === 'railgun' ? 4 : 1,
                      life: p.weapon === 'rocket' ? 2.5 : 1.8,
                      isExplosive: p.weapon === 'rocket',
                      explosionRadius: p.weapon === 'rocket' ? 90 : 0,
                    });
                  }
                }
              }
            }
            break;
          }

          case 'chat_msg': {
            if (!msg.text || !msg.text.trim()) return;
            const text = msg.text.trim().substring(0, 180);
            const chatMsg: ChatMessage = {
              id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              senderId: playerId,
              senderName: clientConn.username,
              text,
              timestamp: Date.now(),
              channel: msg.channel || 'nearby',
            };

            const p = islandState.players[playerId];
            if (p) p.lastChat = { text, timestamp: Date.now() };

            broadcastAll({ type: 'chat_broadcast', message: chatMsg });
            break;
          }

          case 'emote': {
            const p = islandState.players[playerId];
            const emoteSymbols: Record<EmoteType, { symbol: string; label: string }> = {
              wave: { symbol: '[Wave]', label: 'waved hello!' },
              laugh: { symbol: '[Laugh]', label: 'laughs out loud!' },
              cheer: { symbol: '[Cheer]', label: 'cheers excitedly!' },
              point: { symbol: '[Point]', label: 'points ahead!' },
              dance: { symbol: '[Dance]', label: 'brings the dance moves!' },
              gg: { symbol: '[GG]', label: 'says GG WP!' },
              help: { symbol: '[Help]', label: 'requests assistance!' },
            };
            const emoteInfo = emoteSymbols[msg.emote] || emoteSymbols.wave;

            if (p) {
              p.currentEmote = { symbol: emoteInfo.symbol, label: emoteInfo.label, timestamp: Date.now() };
            }

            broadcastAll({
              type: 'emote_broadcast',
              playerId,
              emote: msg.emote,
              symbol: emoteInfo.symbol,
              label: emoteInfo.label,
            });
            break;
          }

          case 'build_structure': {
            const pad = islandState.buildPads.find((p) => p.id === msg.padId);
            if (!pad) {
              sendTo(ws, { type: 'error', message: 'Build pad not found.' });
              return;
            }
            if (pad.structureId) {
              sendTo(ws, { type: 'error', message: 'Pad already has a structure.' });
              return;
            }

            const sDef = STRUCTURE_DEFS[msg.structureType];
            if (!sDef) return;

            if (islandState.sharedResources.scrap < sDef.cost) {
              sendTo(ws, {
                type: 'error',
                message: `Not enough Scrap! Need ${sDef.cost} Scrap (You have ${islandState.sharedResources.scrap}).`,
              });
              return;
            }

            islandState.sharedResources.scrap -= sDef.cost;

            const structId = `struct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newStruct: DefensiveStructure = {
              id: structId,
              padId: pad.id,
              type: msg.structureType,
              x: pad.x,
              y: pad.y,
              hp: sDef.maxHp,
              maxHp: sDef.maxHp,
              level: 1,
              range: sDef.range,
              damage: sDef.damage,
              fireRate: sDef.fireRate,
              cooldown: 0,
              color: sDef.color,
              builderId: playerId,
            };

            pad.structureId = structId;
            islandState.structures.push(newStruct);

            islandState.damageTexts.push({
              id: `dt_${Date.now()}_${Math.random()}`,
              x: pad.x,
              y: pad.y - 30,
              text: `BUILT ${sDef.name.toUpperCase()}!`,
              color: '#38bdf8',
              life: 1.5,
            });
            break;
          }

          case 'upgrade_structure': {
            const struct = islandState.structures.find((s) => s.id === msg.structureId);
            if (!struct) return;
            if (struct.level >= 3) {
              sendTo(ws, { type: 'error', message: 'Structure already at MAX Level 3.' });
              return;
            }

            const cost = struct.level * 150;
            if (islandState.sharedResources.scrap < cost) {
              sendTo(ws, { type: 'error', message: `Not enough Scrap to upgrade! Need ${cost} Scrap.` });
              return;
            }

            islandState.sharedResources.scrap -= cost;
            struct.level += 1;
            struct.maxHp += 150;
            struct.hp = struct.maxHp;
            struct.damage = Math.round(struct.damage * 1.35);
            struct.range = Math.round(struct.range * 1.15);

            islandState.damageTexts.push({
              id: `dt_${Date.now()}_${Math.random()}`,
              x: struct.x,
              y: struct.y - 30,
              text: `UPGRADED TO LVL ${struct.level}!`,
              color: '#facc15',
              life: 1.5,
            });
            break;
          }

          case 'repair_structure': {
            const struct = islandState.structures.find((s) => s.id === msg.structureId);
            if (!struct) return;
            if (struct.hp >= struct.maxHp) {
              sendTo(ws, { type: 'error', message: 'Structure is already at 100% health.' });
              return;
            }

            const repairCost = 35;
            if (islandState.sharedResources.scrap < repairCost) {
              sendTo(ws, { type: 'error', message: `Need ${repairCost} Scrap to repair structure.` });
              return;
            }

            islandState.sharedResources.scrap -= repairCost;
            struct.hp = struct.maxHp;

            islandState.damageTexts.push({
              id: `dt_${Date.now()}_${Math.random()}`,
              x: struct.x,
              y: struct.y - 30,
              text: 'REPAIRED +100%',
              color: '#34d399',
              life: 1.2,
            });
            break;
          }

          case 'upgrade_core': {
            const cost = 250 * islandState.core.level;
            if (islandState.sharedResources.energy < cost) {
              sendTo(ws, { type: 'error', message: `Need ${cost} Void Energy to upgrade Core.` });
              return;
            }

            islandState.sharedResources.energy -= cost;
            islandState.core.level += 1;

            if (msg.upgradeType === 'health') {
              islandState.core.maxHp += 400;
              islandState.core.hp = islandState.core.maxHp;
            } else if (msg.upgradeType === 'shield') {
              islandState.core.maxShield += 300;
              islandState.core.shield = islandState.core.maxShield;
            }

            islandState.damageTexts.push({
              id: `dt_${Date.now()}_${Math.random()}`,
              x: islandState.core.x,
              y: islandState.core.y - 40,
              text: `CORE UPGRADED TO LVL ${islandState.core.level}!`,
              color: '#a855f7',
              life: 2.0,
            });
            break;
          }

          case 'buy_weapon': {
            const p = islandState.players[playerId];
            if (!p) return;

            const wStats = WEAPON_DEFS[msg.weapon];
            if (!wStats) return;

            if (p.weapon === msg.weapon) return;

            if (islandState.sharedResources.energy < wStats.cost) {
              sendTo(ws, { type: 'error', message: `Need ${wStats.cost} Void Energy to equip ${wStats.name}.` });
              return;
            }

            islandState.sharedResources.energy -= wStats.cost;
            p.weapon = msg.weapon;

            islandState.damageTexts.push({
              id: `dt_${Date.now()}_${Math.random()}`,
              x: p.x,
              y: p.y - 30,
              text: `EQUIPPED ${wStats.name.toUpperCase()}!`,
              color: '#38bdf8',
              life: 1.5,
            });
            break;
          }

          case 'trigger_next_wave': {
            if (islandState.phase === 'peaceful') {
              islandState.phase = 'warning';
              islandState.phaseTimer = 8;
              broadcastAll({ type: 'island_event', eventType: 'wave_warning' });
            }
            break;
          }

          case 'ping_location': {
            const ping: PingMarker = {
              id: `ping_${Date.now()}_${Math.random()}`,
              x: msg.x,
              y: msg.y,
              type: msg.pingType,
              senderName: clientConn.username,
              timestamp: Date.now(),
              life: 6.0,
            };
            islandState.pings.push(ping);
            broadcastAll({ type: 'ping_broadcast', ping });
            break;
          }

          case 'revive_player': {
            const targetP = islandState.players[msg.targetPlayerId];
            if (targetP && targetP.isDowned) {
              targetP.reviveProgress = (targetP.reviveProgress || 0) + 30;
              if (targetP.reviveProgress >= 100) {
                targetP.isDowned = false;
                targetP.hp = Math.round(targetP.maxHp * 0.5);
                targetP.shield = targetP.maxShield;
                targetP.reviveProgress = 0;

                islandState.damageTexts.push({
                  id: `dt_${Date.now()}_${Math.random()}`,
                  x: targetP.x,
                  y: targetP.y - 30,
                  text: 'REVIVED!',
                  color: '#34d399',
                  life: 1.5,
                });
              }
            }
            break;
          }

          case 'restart_game': {
            if (islandState.phase === 'defeat' || islandState.phase === 'victory') {
              islandState.wave = 1;
              islandState.phase = 'peaceful';
              islandState.phaseTimer = 25;
              islandState.enemiesSpawnedThisWave = 0;
              islandState.core.hp = islandState.core.maxHp;
              islandState.core.shield = islandState.core.maxShield;
              islandState.enemies = [];
              islandState.projectiles = [];
              islandState.resourceDrops = [];
              islandState.sharedResources = { energy: 400, scrap: 500 };

              Object.values(islandState.players).forEach((p) => {
                p.hp = p.maxHp;
                p.shield = p.maxShield;
                p.isAlive = true;
                p.isDowned = false;
                p.x = 1200 + (Math.random() * 80 - 40);
                p.y = 1200 + (Math.random() * 80 - 40);
              });

              broadcastAll({ type: 'island_state_sync', islandState });
            }
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket msg error:', err);
      }
    });

    ws.on('close', () => {
      delete islandState.players[playerId];
      clients.delete(ws);
      broadcastAll({ type: 'player_left_island', playerId });
    });
  });

  // Server Main Loop (30 Hz)
  const dt = 1 / 30;
  setInterval(() => {
    const now = Date.now();

    // 1. Ambient Bot movement & speech during peaceful phases
    botConfigs.forEach((bot) => {
      const p = islandState.players[bot.id];
      if (p) {
        p.x += Math.sin(now / 1800 + (bot.id === 'bot_nova' ? 0 : 3)) * 0.6;
        p.y += Math.cos(now / 1800 + (bot.id === 'bot_nova' ? 0 : 3)) * 0.6;
      }
    });

    // 2. Island Phase State Machine
    if (islandState.phaseTimer > 0) {
      islandState.phaseTimer -= dt;

      if (islandState.phaseTimer <= 0) {
        if (islandState.phase === 'peaceful') {
          islandState.phase = 'warning';
          islandState.phaseTimer = 10;
          broadcastAll({ type: 'island_event', eventType: 'wave_warning', data: { wave: islandState.wave } });
        } else if (islandState.phase === 'warning') {
          islandState.phase = 'defense';
          islandState.enemiesSpawnedThisWave = 0;
          broadcastAll({ type: 'island_event', eventType: 'wave_start', data: { wave: islandState.wave } });
        } else if (islandState.phase === 'intermission') {
          islandState.wave += 1;
          islandState.enemiesSpawnedThisWave = 0;
          if (islandState.wave > islandState.maxWaves) {
            islandState.phase = 'victory';
            broadcastAll({ type: 'island_event', eventType: 'victory' });
          } else {
            islandState.phase = 'peaceful';
            islandState.phaseTimer = 30;
          }
        }
      }
    }

    // Passive Core & Player Shield Regeneration in Peaceful Phase
    if (islandState.phase === 'peaceful') {
      islandState.core.hp = Math.min(islandState.core.maxHp, islandState.core.hp + 20 * dt);
      islandState.core.shield = Math.min(islandState.core.maxShield, islandState.core.shield + 25 * dt);

      Object.values(islandState.players).forEach((p) => {
        if (!p.isDowned) {
          p.hp = Math.min(p.maxHp, p.hp + 15 * dt);
          p.shield = Math.min(p.maxShield, p.shield + 20 * dt);
        }
      });

      // Spawn periodic ambient resource deposits on island
      if (Math.random() < 0.05 && islandState.resourceDrops.length < 15) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 700;
        islandState.resourceDrops.push({
          id: `res_${Date.now()}_${Math.random()}`,
          type: Math.random() < 0.5 ? 'energy' : 'scrap',
          amount: Math.floor(25 + Math.random() * 35),
          x: 1200 + Math.cos(angle) * dist,
          y: 1200 + Math.sin(angle) * dist,
          life: 40.0,
        });
      }
    }

    // 3. Enemy Spawner in 'defense' phase
    if (islandState.phase === 'defense') {
      const targetEnemyCount = islandState.wave * 12 + 6;

      if (islandState.enemiesSpawnedThisWave < targetEnemyCount && Math.random() < 0.35) {
        islandState.enemiesSpawnedThisWave += 1;

        // Pick breach portal based on wave
        const breachIndex = Math.floor(Math.random() * islandState.activeBreaches.length);
        const breach = islandState.activeBreaches[breachIndex];

        const sx = breach.x + (Math.random() * 60 - 30);
        const sy = breach.y + (Math.random() * 60 - 30);

        const rand = Math.random();
        let eType: EnemyEntity['type'] = 'swarmer';
        let hp = 70 + islandState.wave * 18;
        let speed = 120 + Math.random() * 20;
        let radius = 15;
        let color = '#ef4444';
        let damage = 14;

        if (islandState.wave === 10 && !islandState.enemies.some((e) => e.isBoss)) {
          // Spawn Boss Void Overlord on Wave 10
          eType = 'overlord';
          hp = 4500;
          speed = 60;
          radius = 55;
          color = '#a855f7';
          damage = 50;
          islandState.enemies.push({
            id: `boss_overlord_${Date.now()}`,
            type: eType,
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp,
            maxHp: hp,
            speed,
            radius,
            damage,
            color,
            attackCooldown: 0,
            targetType: 'core',
            isBoss: true,
          });
          broadcastAll({ type: 'island_event', eventType: 'boss_spawn' });
        } else {
          if (rand > 0.82 && islandState.wave >= 5) {
            eType = 'commander';
            hp = 350 + islandState.wave * 45;
            speed = 70;
            radius = 26;
            color = '#a855f7';
            damage = 28;
          } else if (rand > 0.65 && islandState.wave >= 3) {
            eType = 'tank';
            hp = 280 + islandState.wave * 35;
            speed = 60;
            radius = 24;
            color = '#0284c7';
            damage = 22;
          } else if (rand > 0.45 && islandState.wave >= 2) {
            eType = 'spitter';
            hp = 100 + islandState.wave * 15;
            speed = 90;
            radius = 17;
            color = '#f59e0b';
            damage = 16;
          } else if (rand > 0.28) {
            eType = 'runner';
            hp = 85 + islandState.wave * 12;
            speed = 165;
            radius = 14;
            color = '#e11d48';
            damage = 15;
          }

          islandState.enemies.push({
            id: `e_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: eType,
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp,
            maxHp: hp,
            speed,
            radius,
            damage,
            color,
            attackCooldown: 0,
            targetType: eType === 'runner' ? 'core' : Math.random() < 0.6 ? 'core' : 'player',
          });
        }
      }

      // Check if wave cleared: ALL wave enemies spawned AND all defeated
      if (
        islandState.enemiesSpawnedThisWave >= targetEnemyCount &&
        islandState.enemies.length === 0
      ) {
        islandState.phase = 'intermission';
        islandState.phaseTimer = 12;

        // Reward team resources
        const energyReward = 150 + islandState.wave * 40;
        const scrapReward = 200 + islandState.wave * 50;
        islandState.sharedResources.energy += energyReward;
        islandState.sharedResources.scrap += scrapReward;

        islandState.damageTexts.push({
          id: `dt_${Date.now()}_${Math.random()}`,
          x: islandState.core.x,
          y: islandState.core.y - 50,
          text: `WAVE ${islandState.wave} CLEARED! +${scrapReward} SCRAP`,
          color: '#facc15',
          life: 3.0,
        });

        broadcastAll({ type: 'island_event', eventType: 'wave_complete', data: { wave: islandState.wave } });
      }
    }

    // 4. Update Defensive Structures AI & Attacks
    islandState.structures.forEach((struct) => {
      struct.cooldown = Math.max(0, struct.cooldown - dt);

      if (struct.type === 'repair_station') {
        if (struct.cooldown <= 0) {
          struct.cooldown = 1.0;
          // Pulse repair to nearby damaged structures and Core
          islandState.structures.forEach((other) => {
            const dist = Math.hypot(other.x - struct.x, other.y - struct.y);
            if (dist < struct.range && other.hp < other.maxHp) {
              other.hp = Math.min(other.maxHp, other.hp + 30);
            }
          });

          const coreDist = Math.hypot(islandState.core.x - struct.x, islandState.core.y - struct.y);
          if (coreDist < struct.range && islandState.core.hp < islandState.core.maxHp) {
            islandState.core.hp = Math.min(islandState.core.maxHp, islandState.core.hp + 20);
          }
        }
      } else if (struct.type === 'slow_field') {
        // Slow field applies aura directly to nearby enemies in distance checks
      } else if (struct.type === 'auto_turret' || struct.type === 'heavy_cannon' || struct.type === 'laser_turret') {
        if (struct.cooldown <= 0 && islandState.enemies.length > 0) {
          // Find nearest enemy in range
          let target: EnemyEntity | null = null;
          let minDist = struct.range;

          islandState.enemies.forEach((e) => {
            const dist = Math.hypot(e.x - struct.x, e.y - struct.y);
            if (dist < minDist) {
              minDist = dist;
              target = e;
            }
          });

          if (target) {
            struct.cooldown = 1 / struct.fireRate;
            const aimAngle = Math.atan2((target as EnemyEntity).y - struct.y, (target as EnemyEntity).x - struct.x);

            islandState.projectiles.push({
              id: `turret_proj_${Date.now()}_${Math.random()}`,
              ownerId: struct.id,
              isEnemy: false,
              x: struct.x,
              y: struct.y,
              vx: Math.cos(aimAngle) * 750,
              vy: Math.sin(aimAngle) * 750,
              damage: struct.damage,
              radius: struct.type === 'heavy_cannon' ? 7 : 4,
              color: struct.color,
              pierce: struct.type === 'heavy_cannon' ? 2 : 1,
              life: 1.5,
              isExplosive: struct.type === 'heavy_cannon',
              explosionRadius: struct.type === 'heavy_cannon' ? 80 : 0,
            });
          }
        }
      }
    });

    // 5. Update Enemies Logic & Pathfinding
    for (let i = islandState.enemies.length - 1; i >= 0; i--) {
      const enemy = islandState.enemies[i];
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

      // Check Slow Field modifiers
      let currentSpeed = enemy.speed;
      islandState.structures.forEach((s) => {
        if (s.type === 'slow_field') {
          const sDist = Math.hypot(enemy.x - s.x, enemy.y - s.y);
          if (sDist < s.range) {
            currentSpeed *= 0.5;
          }
        }
      });

      // Target determination
      let targetX = islandState.core.x;
      let targetY = islandState.core.y;

      if (enemy.targetType === 'player') {
        const alivePlayers = Object.values(islandState.players).filter((p) => p.isAlive && !p.isDowned);
        if (alivePlayers.length > 0) {
          targetX = alivePlayers[0].x;
          targetY = alivePlayers[0].y;
        }
      }

      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 15) {
        enemy.vx = (dx / dist) * currentSpeed;
        enemy.vy = (dy / dist) * currentSpeed;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }

      // Enemy Attacks Core
      const coreDist = Math.hypot(enemy.x - islandState.core.x, enemy.y - islandState.core.y);
      if (coreDist < enemy.radius + islandState.core.radius) {
        if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 1.0;
          const dmg = enemy.damage;
          if (islandState.core.shield > 0) {
            islandState.core.shield = Math.max(0, islandState.core.shield - dmg);
          } else {
            islandState.core.hp = Math.max(0, islandState.core.hp - dmg);
          }

          islandState.damageTexts.push({
            id: `dt_${Date.now()}_${Math.random()}`,
            x: islandState.core.x + (Math.random() * 40 - 20),
            y: islandState.core.y - 30,
            text: `-${dmg}`,
            color: '#ef4444',
            life: 1.0,
          });

          broadcastAll({ type: 'island_event', eventType: 'core_hit' });

          if (islandState.core.hp <= 0) {
            islandState.phase = 'defeat';
            broadcastAll({ type: 'island_event', eventType: 'defeat' });
          }
        }
      }

      // Enemy Attacks Structures
      islandState.structures.forEach((struct) => {
        const sDist = Math.hypot(enemy.x - struct.x, enemy.y - struct.y);
        if (sDist < enemy.radius + 24 && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 0.9;
          struct.hp -= enemy.damage;

          if (struct.hp <= 0) {
            const pad = islandState.buildPads.find((p) => p.id === struct.padId);
            if (pad) pad.structureId = undefined;
            broadcastAll({ type: 'island_event', eventType: 'structure_destroyed' });
          }
        }
      });

      // Filter destroyed structures
      islandState.structures = islandState.structures.filter((s) => s.hp > 0);

      // Enemy Attacks Players
      Object.values(islandState.players).forEach((p) => {
        if (!p.isAlive || p.isDowned) return;
        const pDist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        if (pDist < enemy.radius + 18 && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 0.8;
          if (p.shield > 0) {
            p.shield = Math.max(0, p.shield - enemy.damage);
          } else {
            p.hp = Math.max(0, p.hp - enemy.damage);
            if (p.hp <= 0) {
              p.isDowned = true;
              p.reviveProgress = 0;
            }
          }
        }
      });
    }

    // 6. Update Projectiles & Hits
    for (let i = islandState.projectiles.length - 1; i >= 0; i--) {
      const proj = islandState.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;

      if (proj.life <= 0 || proj.x < 0 || proj.x > 2400 || proj.y < 0 || proj.y > 2400) {
        islandState.projectiles.splice(i, 1);
        continue;
      }

      // Check Projectile vs Enemy
      if (!proj.isEnemy) {
        for (let j = islandState.enemies.length - 1; j >= 0; j--) {
          const enemy = islandState.enemies[j];
          const edist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);

          if (edist < enemy.radius + proj.radius) {
            const isCrit = Math.random() < 0.22;
            const dmg = isCrit ? Math.round(proj.damage * 1.5) : proj.damage;
            enemy.hp -= dmg;

            const shooter = islandState.players[proj.ownerId];
            if (shooter) shooter.damageDealt += dmg;

            islandState.damageTexts.push({
              id: `dt_${Date.now()}_${Math.random()}`,
              x: enemy.x + (Math.random() * 20 - 10),
              y: enemy.y - 15,
              text: `${dmg}`,
              color: isCrit ? '#facc15' : '#ffffff',
              life: 0.8,
              isCrit,
            });

            // Handle Explosive Rockets
            if (proj.isExplosive && proj.explosionRadius) {
              islandState.enemies.forEach((otherE) => {
                const splashDist = Math.hypot(otherE.x - proj.x, otherE.y - proj.y);
                if (splashDist < proj.explosionRadius! && otherE.id !== enemy.id) {
                  otherE.hp -= Math.round(dmg * 0.7);
                }
              });
            }

            proj.pierce -= 1;
            if (proj.pierce <= 0) {
              islandState.projectiles.splice(i, 1);
            }

            if (enemy.hp <= 0) {
              if (shooter) {
                shooter.kills += 1;
                shooter.score += enemy.isBoss ? 3000 : enemy.isElite ? 600 : 120;
              }
              islandState.teamScore += enemy.isBoss ? 3000 : enemy.isElite ? 600 : 120;
              islandState.totalKills += 1;

              // Drop Resources upon enemy death
              islandState.resourceDrops.push({
                id: `res_${Date.now()}_${Math.random()}`,
                type: Math.random() < 0.5 ? 'energy' : 'scrap',
                amount: enemy.isBoss ? 200 : enemy.isElite ? 80 : 25,
                x: enemy.x,
                y: enemy.y,
                life: 30.0,
              });

              if (enemy.isBoss) {
                islandState.phase = 'victory';
                broadcastAll({ type: 'island_event', eventType: 'victory' });
              }

              islandState.enemies.splice(j, 1);
            }
            break;
          }
        }
      }
    }

    // 7. Auto Collect Resource Drops when players are nearby
    for (let i = islandState.resourceDrops.length - 1; i >= 0; i--) {
      const drop = islandState.resourceDrops[i];
      drop.life -= dt;

      let collected = false;
      Object.values(islandState.players).forEach((p) => {
        if (!p.isDowned && Math.hypot(p.x - drop.x, p.y - drop.y) < 55) {
          collected = true;
          if (drop.type === 'energy') {
            islandState.sharedResources.energy += drop.amount;
          } else {
            islandState.sharedResources.scrap += drop.amount;
          }
        }
      });

      if (collected || drop.life <= 0) {
        islandState.resourceDrops.splice(i, 1);
      }
    }

    // 8. Decay Damage Texts & Pings
    for (let i = islandState.damageTexts.length - 1; i >= 0; i--) {
      const dtObj = islandState.damageTexts[i];
      dtObj.y -= 25 * dt;
      dtObj.life -= dt;
      if (dtObj.life <= 0) islandState.damageTexts.splice(i, 1);
    }

    for (let i = islandState.pings.length - 1; i >= 0; i--) {
      const ping = islandState.pings[i];
      ping.life -= dt;
      if (ping.life <= 0) islandState.pings.splice(i, 1);
    }

    // 9. Sync full island state to clients at 30 Hz
    broadcastAll({ type: 'island_state_sync', islandState });
  }, 1000 / 30);
}
