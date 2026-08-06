import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { IslandPlayer, ChatMessage, EmoteType } from '../types/island';
import { GameRoom, RoomPlayer } from '../types/gameHub';
import { VoidHordeState, EnemyEntity, ProjectileEntity, PlayerEntity, WeaponType, WeaponStats } from '../types/voidHorde';
import { ClientMessage, ServerMessage } from '../types/networking';
import { WEAPON_DEFS } from '../config/weapons';

interface ClientConnection {
  ws: WebSocket;
  playerId: string;
  username: string;
  roomId?: string;
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

  // In-memory server state
  const islandPlayers = new Map<string, IslandPlayer>();
  const rooms = new Map<string, GameRoom>();
  const vhStates = new Map<string, VoidHordeState>();

  // Ambient Island Bots (to ensure social vitality)
  const BOT_IDS = ['bot_nova', 'bot_atlas', 'bot_cyber_sam'];
  const botConfigs: IslandPlayer[] = [
    {
      id: 'bot_nova',
      username: 'Nova [NPC]',
      x: 600,
      y: 500,
      vx: 0,
      vy: 0,
      facing: 'down',
      avatar: { bodyColor: '#ec4899', hat: 'headphones', skin: 'cyber', accessory: 'aura' },
      isBot: true,
      lastChat: { text: 'Welcome to Island Hub! Void Horde is ready at the Arcade portal!', timestamp: Date.now() },
    },
    {
      id: 'bot_atlas',
      username: 'Atlas [NPC]',
      x: 820,
      y: 650,
      vx: 0,
      vy: 0,
      facing: 'left',
      avatar: { bodyColor: '#10b981', hat: 'visor', skin: 'android', accessory: 'none' },
      isBot: true,
      lastChat: { text: 'Looking for a squad to beat Wave 10 Boss!', timestamp: Date.now() },
    },
    {
      id: 'bot_cyber_sam',
      username: 'Sam [Guide]',
      x: 480,
      y: 720,
      vx: 0,
      vy: 0,
      facing: 'right',
      avatar: { bodyColor: '#8b5cf6', hat: 'crown', skin: 'human', accessory: 'cape' },
      isBot: true,
      lastChat: { text: 'Step onto the Game Arcade portal to enter Void Horde!', timestamp: Date.now() },
    },
  ];

  botConfigs.forEach((bot) => islandPlayers.set(bot.id, bot));

  // Helper broadcast
  const sendTo = (ws: WebSocket, msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const getCleanRoomsList = () => {
    return Array.from(rooms.values()).filter((r) => r.players.length > 0);
  };

  const broadcastAll = (msg: ServerMessage) => {
    const data = JSON.stringify(msg);
    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  };

  const broadcastRoom = (roomId: string, msg: ServerMessage) => {
    const data = JSON.stringify(msg);
    clients.forEach((client) => {
      if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  };

  // Clean helper to leave current room
  const leaveCurrentRoom = (clientConn: ClientConnection) => {
    if (!clientConn.roomId) return;
    const room = rooms.get(clientConn.roomId);
    if (room) {
      room.players = room.players.filter((p) => p.id !== clientConn.playerId);
      if (room.players.length === 0) {
        rooms.delete(room.id);
        vhStates.delete(room.id);
      } else {
        if (room.hostId === clientConn.playerId) {
          room.hostId = room.players[0].id;
          room.players[0].isHost = true;
          room.players[0].isReady = true;
        }
        broadcastRoom(room.id, { type: 'room_updated', room });
      }
    }
    clientConn.roomId = undefined;
  };

  const startMatchInRoom = (room: GameRoom) => {
    room.state = 'playing';

    const initialVhPlayers: Record<string, PlayerEntity> = {};
    const numPlayers = room.players.length;

    room.players.forEach((rp, idx) => {
      const angle = (idx / numPlayers) * Math.PI * 2;
      initialVhPlayers[rp.id] = {
        id: rp.id,
        username: rp.username,
        x: 1000 + Math.cos(angle) * 120,
        y: 1000 + Math.sin(angle) * 120,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        shield: 50,
        maxShield: 50,
        weapon: rp.weapon,
        score: 0,
        kills: 0,
        damageDealt: 0,
        isAlive: true,
        color: rp.avatarColor,
      };
    });

    const initialVhState: VoidHordeState = {
      roomId: room.id,
      wave: 1,
      maxWaves: 10,
      waveState: 'preparing',
      waveTimer: 5,
      core: {
        x: 1000,
        y: 1000,
        radius: 45,
        hp: 1000,
        maxHp: 1000,
        shield: 500,
        maxShield: 500,
        pulseTimer: 0,
      },
      players: initialVhPlayers,
      enemies: [],
      projectiles: [],
      particles: [],
      damageTexts: [],
      score: 0,
      totalKills: 0,
    };

    vhStates.set(room.id, initialVhState);

    broadcastRoom(room.id, {
      type: 'game_started',
      roomId: room.id,
      initialVhState,
    });

    broadcastAll({ type: 'rooms_updated', rooms: getCleanRoomsList() });
  };

  wss.on('connection', (ws: WebSocket) => {
    let clientConn: ClientConnection = {
      ws,
      playerId: `player_${Math.random().toString(36).substring(2, 9)}`,
      username: 'Explorer',
    };
    clients.set(ws, clientConn);

    ws.on('message', (data: string) => {
      try {
        const msg: ClientMessage = JSON.parse(data.toString());

        switch (msg.type) {
          case 'join_island': {
            clientConn.username = msg.username || 'Explorer';
            leaveCurrentRoom(clientConn);

            const newPlayer: IslandPlayer = {
              id: clientConn.playerId,
              username: clientConn.username,
              x: 500 + (Math.random() * 80 - 40),
              y: 500 + (Math.random() * 80 - 40),
              vx: 0,
              vy: 0,
              facing: 'down',
              avatar: msg.avatar || { bodyColor: '#3b82f6', hat: 'none', skin: 'human', accessory: 'none' },
            };

            islandPlayers.set(clientConn.playerId, newPlayer);

            sendTo(ws, {
              type: 'init_client',
              playerId: clientConn.playerId,
              islandPlayers: Array.from(islandPlayers.values()),
              rooms: getCleanRoomsList(),
            });

            broadcastAll({
              type: 'player_joined_island',
              player: newPlayer,
            });
            break;
          }

          case 'update_profile': {
            clientConn.username = msg.username || clientConn.username;
            const player = islandPlayers.get(clientConn.playerId);
            if (player) {
              player.username = clientConn.username;
              player.avatar = msg.avatar;
            }
            if (clientConn.roomId) {
              const room = rooms.get(clientConn.roomId);
              if (room) {
                const rp = room.players.find((p) => p.id === clientConn.playerId);
                if (rp) {
                  rp.username = clientConn.username;
                  rp.avatarColor = msg.avatar.bodyColor;
                  broadcastRoom(room.id, { type: 'room_updated', room });
                }
              }
            }
            break;
          }

          case 'move_island': {
            const player = islandPlayers.get(clientConn.playerId);
            if (player) {
              player.x = msg.x;
              player.y = msg.y;
              player.vx = msg.vx;
              player.vy = msg.vy;
              player.facing = msg.facing;
            }
            break;
          }

          case 'chat_msg': {
            if (!msg.text || !msg.text.trim()) return;
            const text = msg.text.trim().substring(0, 180);
            const chatMsg: ChatMessage = {
              id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              senderId: clientConn.playerId,
              senderName: clientConn.username,
              text,
              timestamp: Date.now(),
              channel: msg.channel || 'nearby',
            };

            const p = islandPlayers.get(clientConn.playerId);
            if (p) {
              p.lastChat = { text, timestamp: Date.now() };
            }

            if (clientConn.roomId) {
              broadcastRoom(clientConn.roomId, { type: 'chat_broadcast', message: chatMsg });
            } else {
              broadcastAll({ type: 'chat_broadcast', message: chatMsg });
            }
            break;
          }

          case 'emote': {
            const p = islandPlayers.get(clientConn.playerId);
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
              playerId: clientConn.playerId,
              emote: msg.emote,
              symbol: emoteInfo.symbol,
              label: emoteInfo.label,
            });
            break;
          }

          case 'create_room': {
            // Leave any prior room cleanly first
            leaveCurrentRoom(clientConn);

            const roomId = `room_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
            const roomCode = Math.floor(1000 + Math.random() * 9000).toString();

            const hostPlayer: RoomPlayer = {
              id: clientConn.playerId,
              username: clientConn.username,
              isHost: true,
              isReady: true,
              weapon: 'plasma',
              avatarColor: islandPlayers.get(clientConn.playerId)?.avatar.bodyColor || '#3b82f6',
            };

            const newRoom: GameRoom = {
              id: roomId,
              roomCode,
              gameId: msg.gameId || 'void_horde',
              name: msg.name || `${clientConn.username}'s Squad`,
              hostId: clientConn.playerId,
              maxPlayers: Math.min(Math.max(msg.maxPlayers || 4, 1), 4),
              players: [hostPlayer],
              state: 'lobby',
              createdAt: Date.now(),
            };

            rooms.set(roomId, newRoom);
            clientConn.roomId = roomId;

            sendTo(ws, { type: 'room_joined', room: newRoom, player: hostPlayer });
            if (msg.autoStart) {
              startMatchInRoom(newRoom);
            } else {
              broadcastAll({ type: 'rooms_updated', rooms: getCleanRoomsList() });
            }
            break;
          }

          case 'join_room': {
            const room = rooms.get(msg.roomId);
            if (!room) {
              sendTo(ws, { type: 'error', message: 'Room not found.' });
              return;
            }
            if (room.players.length >= room.maxPlayers) {
              sendTo(ws, { type: 'error', message: 'Room is full.' });
              return;
            }
            if (room.state !== 'lobby') {
              sendTo(ws, { type: 'error', message: 'Match already in progress.' });
              return;
            }

            // Leave old room if in one
            leaveCurrentRoom(clientConn);

            const roomPlayer: RoomPlayer = {
              id: clientConn.playerId,
              username: clientConn.username,
              isHost: false,
              isReady: false,
              weapon: 'plasma',
              avatarColor: islandPlayers.get(clientConn.playerId)?.avatar.bodyColor || '#10b981',
            };

            room.players.push(roomPlayer);
            clientConn.roomId = room.id;

            sendTo(ws, { type: 'room_joined', room, player: roomPlayer });
            broadcastRoom(room.id, { type: 'room_updated', room });
            broadcastAll({ type: 'rooms_updated', rooms: getCleanRoomsList() });
            break;
          }

          case 'leave_room': {
            leaveCurrentRoom(clientConn);
            sendTo(ws, { type: 'room_left' });
            broadcastAll({ type: 'rooms_updated', rooms: getCleanRoomsList() });
            break;
          }

          case 'toggle_ready': {
            if (!clientConn.roomId) return;
            const room = rooms.get(clientConn.roomId);
            if (room) {
              const rp = room.players.find((p) => p.id === clientConn.playerId);
              if (rp) {
                rp.isReady = !rp.isReady;
                if (msg.weapon) rp.weapon = msg.weapon;
                broadcastRoom(room.id, { type: 'room_updated', room });
              }
            }
            break;
          }

          case 'select_weapon': {
            if (!clientConn.roomId) return;
            const room = rooms.get(clientConn.roomId);
            if (room) {
              const rp = room.players.find((p) => p.id === clientConn.playerId);
              if (rp) {
                rp.weapon = msg.weapon;
                broadcastRoom(room.id, { type: 'room_updated', room });
              }
            }
            break;
          }

          case 'start_game': {
            if (!clientConn.roomId) return;
            const room = rooms.get(clientConn.roomId);
            if (!room) return;
            if (room.hostId !== clientConn.playerId) {
              sendTo(ws, { type: 'error', message: 'Only the squad host can launch the match.' });
              return;
            }
            const unreadyPlayers = room.players.filter((p) => !p.isReady);
            if (unreadyPlayers.length > 0) {
              sendTo(ws, { type: 'error', message: `Cannot launch match: ${unreadyPlayers.map((p) => p.username).join(', ')} not ready.` });
              return;
            }

            startMatchInRoom(room);
            break;
          }

          case 'vh_player_input': {
            if (!clientConn.roomId) return;
            const vhState = vhStates.get(clientConn.roomId);
            if (!vhState) return;

            const player = vhState.players[clientConn.playerId];
            if (!player || !player.isAlive) return;

            // Update player position
            player.x = Math.max(50, Math.min(1950, msg.x));
            player.y = Math.max(50, Math.min(1950, msg.y));
            player.vx = msg.vx;
            player.vy = msg.vy;

            // Handle shooting
            if (msg.shooting) {
              const now = Date.now();
              const wStats = WEAPON_DEFS[player.weapon] || WEAPON_DEFS.plasma;
              const cooldownMs = 1000 / wStats.fireRate;

              if (!clientConn.lastShotTime || now - clientConn.lastShotTime >= cooldownMs) {
                clientConn.lastShotTime = now;

                for (let i = 0; i < wStats.pellets; i++) {
                  const angleOffset = (Math.random() - 0.5) * wStats.spread;
                  const finalAngle = msg.aimAngle + angleOffset;

                  vhState.projectiles.push({
                    id: `proj_${now}_${Math.random().toString(36).substring(2, 6)}`,
                    ownerId: player.id,
                    isEnemy: false,
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(finalAngle) * wStats.projectileSpeed,
                    vy: Math.sin(finalAngle) * wStats.projectileSpeed,
                    damage: wStats.damage,
                    radius: player.weapon === 'railgun' ? 6 : 4,
                    color: wStats.color,
                    pierce: player.weapon === 'railgun' ? 4 : 1,
                    life: 1.8,
                  });
                }
              }
            }
            break;
          }

          case 'vh_select_upgrade': {
            if (!clientConn.roomId) return;
            const vhState = vhStates.get(clientConn.roomId);
            if (!vhState || vhState.waveState !== 'intermission') return;

            const p = vhState.players[clientConn.playerId];
            if (p && !p.hasSelectedUpgrade) {
              p.hasSelectedUpgrade = true;
              if (msg.upgradeId === 'core_shield') {
                vhState.core.maxHp += 200;
                vhState.core.hp = Math.min(vhState.core.maxHp, vhState.core.hp + 300);
                vhState.core.shield = vhState.core.maxShield;
              } else if (msg.upgradeId === 'player_hp') {
                p.maxHp += 40;
                p.hp = p.maxHp;
                p.maxShield += 25;
                p.shield = p.maxShield;
              } else if (msg.upgradeId === 'turret_drone') {
                p.turretUnlocked = true;
              }
            }
            break;
          }

          case 'return_to_island': {
            leaveCurrentRoom(clientConn);
            sendTo(ws, {
              type: 'init_client',
              playerId: clientConn.playerId,
              islandPlayers: Array.from(islandPlayers.values()),
              rooms: getCleanRoomsList(),
            });
            broadcastAll({ type: 'rooms_updated', rooms: getCleanRoomsList() });
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket msg error:', err);
      }
    });

    ws.on('close', () => {
      islandPlayers.delete(clientConn.playerId);
      leaveCurrentRoom(clientConn);
      clients.delete(ws);
      broadcastAll({ type: 'player_left_island', playerId: clientConn.playerId });
      broadcastAll({ type: 'rooms_updated', rooms: getCleanRoomsList() });
    });
  });

  // Server Ticks
  // 1. Island Tick (20 Hz)
  setInterval(() => {
    // Ambient Bot simple movement logic
    const now = Date.now();
    botConfigs.forEach((bot) => {
      const p = islandPlayers.get(bot.id);
      if (p) {
        p.x += Math.sin(now / 1500 + (bot.id === 'bot_nova' ? 0 : 2)) * 0.8;
        p.y += Math.cos(now / 1500 + (bot.id === 'bot_nova' ? 0 : 2)) * 0.8;
      }
    });

    broadcastAll({
      type: 'island_state_sync',
      players: Array.from(islandPlayers.values()),
    });
  }, 50);

  // 2. Void Horde Match Loop (30 Hz)
  const dt = 1 / 30;
  setInterval(() => {
    vhStates.forEach((vhState, roomId) => {
      if (vhState.waveState === 'victory' || vhState.waveState === 'defeat') return;

      // Wave state timer logic
      if (vhState.waveTimer > 0) {
        vhState.waveTimer -= dt;
        if (vhState.waveTimer <= 0) {
          if (vhState.waveState === 'preparing') {
            vhState.waveState = 'spawning';
            broadcastRoom(roomId, { type: 'vh_event', eventType: 'wave_start', data: { wave: vhState.wave } });
          } else if (vhState.waveState === 'intermission') {
            vhState.wave += 1;
            if (vhState.wave === vhState.maxWaves) {
              vhState.waveState = 'boss';
              vhState.waveTimer = 3;
              // Spawn Boss Void Overlord
              vhState.enemies.push({
                id: `boss_overlord_${Date.now()}`,
                type: 'overlord',
                x: 1000,
                y: 200,
                vx: 0,
                vy: 0,
                hp: 3500,
                maxHp: 3500,
                speed: 60,
                radius: 50,
                damage: 40,
                color: '#dc2626',
                attackCooldown: 0,
                targetType: 'core',
                isBoss: true,
              });
              broadcastRoom(roomId, { type: 'vh_event', eventType: 'boss_spawn' });
            } else {
              vhState.waveState = 'preparing';
              vhState.waveTimer = 4;
            }
          }
        }
      }

      // Enemy Spawner in 'spawning' wave state
      if (vhState.waveState === 'spawning') {
        const totalEnemiesTarget = vhState.wave * 12 + 8;
        if (vhState.enemies.length < totalEnemiesTarget && Math.random() < 0.2) {
          const spawnAngle = Math.random() * Math.PI * 2;
          const dist = 950;
          const sx = 1000 + Math.cos(spawnAngle) * dist;
          const sy = 1000 + Math.sin(spawnAngle) * dist;

          const rand = Math.random();
          let eType: EnemyEntity['type'] = 'swarmer';
          let hp = 60 + vhState.wave * 15;
          let speed = 110 + Math.random() * 20;
          let radius = 14;
          let color = '#ef4444';
          let damage = 12;

          if (rand > 0.82 && vhState.wave >= 6) {
            eType = 'commander';
            hp = 320 + vhState.wave * 40;
            speed = 70;
            radius = 24;
            color = '#a855f7';
            damage = 25;
          } else if (rand > 0.65 && vhState.wave >= 4) {
            eType = 'tank';
            hp = 250 + vhState.wave * 30;
            speed = 55;
            radius = 22;
            color = '#0284c7';
            damage = 20;
          } else if (rand > 0.45 && vhState.wave >= 2) {
            eType = 'spitter';
            hp = 90 + vhState.wave * 12;
            speed = 85;
            radius = 16;
            color = '#f59e0b';
            damage = 15;
          } else if (rand > 0.25) {
            eType = 'berserker';
            hp = 120 + vhState.wave * 20;
            speed = 130;
            radius = 18;
            color = '#dc2626';
            damage = 18;
          }

          vhState.enemies.push({
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
            targetType: Math.random() < 0.6 ? 'core' : 'player',
          });
        }

        // Check if wave cleared
        if (vhState.enemies.length === 0 && vhState.waveTimer <= 0) {
          vhState.waveState = 'intermission';
          vhState.waveTimer = 10; // 10s intermission upgrade choice
          Object.values(vhState.players).forEach((p) => {
            p.hasSelectedUpgrade = false;
          });
          broadcastRoom(roomId, { type: 'vh_event', eventType: 'upgrade_phase' });
        }
      }

      // Process Player Orbiting Turrets
      Object.values(vhState.players).forEach((p) => {
        if (p.isAlive && p.turretUnlocked) {
          p.turretAngle = (p.turretAngle || 0) + dt * 3;
          const tx = p.x + Math.cos(p.turretAngle) * 35;
          const ty = p.y + Math.sin(p.turretAngle) * 35;

          if (Math.random() < 0.15 && vhState.enemies.length > 0) {
            const nearestE = vhState.enemies[0];
            const aimAngle = Math.atan2(nearestE.y - ty, nearestE.x - tx);
            vhState.projectiles.push({
              id: `turret_proj_${Date.now()}_${Math.random()}`,
              ownerId: p.id,
              isEnemy: false,
              x: tx,
              y: ty,
              vx: Math.cos(aimAngle) * 600,
              vy: Math.sin(aimAngle) * 600,
              damage: 20,
              radius: 3,
              color: '#38bdf8',
              pierce: 1,
              life: 1.2,
            });
          }
        }
      });

      // Update Enemies
      vhState.enemies.forEach((enemy) => {
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

        // Determine target
        let targetX = vhState.core.x;
        let targetY = vhState.core.y;

        if (enemy.targetType === 'player') {
          const alivePlayers = Object.values(vhState.players).filter((p) => p.isAlive);
          if (alivePlayers.length > 0) {
            targetX = alivePlayers[0].x;
            targetY = alivePlayers[0].y;
          }
        }

        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 10) {
          enemy.vx = (dx / dist) * enemy.speed;
          enemy.vy = (dy / dist) * enemy.speed;
          enemy.x += enemy.vx * dt;
          enemy.y += enemy.vy * dt;
        }

        // Enemy Attack Core
        const coreDist = Math.sqrt(
          (enemy.x - vhState.core.x) * (enemy.x - vhState.core.x) +
            (enemy.y - vhState.core.y) * (enemy.y - vhState.core.y)
        );

        if (coreDist < enemy.radius + vhState.core.radius) {
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 1.0;
            const dmg = enemy.damage;
            if (vhState.core.shield > 0) {
              vhState.core.shield = Math.max(0, vhState.core.shield - dmg);
            } else {
              vhState.core.hp = Math.max(0, vhState.core.hp - dmg);
            }

            vhState.damageTexts.push({
              id: `dt_${Date.now()}_${Math.random()}`,
              x: vhState.core.x + (Math.random() * 40 - 20),
              y: vhState.core.y - 30,
              text: `-${dmg}`,
              color: '#ef4444',
              life: 1.0,
            });

            broadcastRoom(roomId, { type: 'vh_event', eventType: 'core_hit' });

            if (vhState.core.hp <= 0) {
              vhState.waveState = 'defeat';
              broadcastRoom(roomId, { type: 'vh_event', eventType: 'defeat' });
            }
          }
        }

        // Enemy Attack Players
        Object.values(vhState.players).forEach((p) => {
          if (!p.isAlive) return;
          const pDist = Math.sqrt((enemy.x - p.x) * (enemy.x - p.x) + (enemy.y - p.y) * (enemy.y - p.y));
          if (pDist < enemy.radius + 18) {
            if (enemy.attackCooldown <= 0) {
              enemy.attackCooldown = 0.8;
              if (p.shield > 0) {
                p.shield = Math.max(0, p.shield - enemy.damage);
              } else {
                p.hp = Math.max(0, p.hp - enemy.damage);
                if (p.hp <= 0) p.isAlive = false;
              }
            }
          }
        });
      });

      // Update Projectiles & Collisions
      for (let i = vhState.projectiles.length - 1; i >= 0; i--) {
        const proj = vhState.projectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life -= dt;

        if (proj.life <= 0 || proj.x < 0 || proj.x > 2000 || proj.y < 0 || proj.y > 2000) {
          vhState.projectiles.splice(i, 1);
          continue;
        }

        // Check Projectile vs Enemy
        if (!proj.isEnemy) {
          for (let j = vhState.enemies.length - 1; j >= 0; j--) {
            const enemy = vhState.enemies[j];
            const edx = enemy.x - proj.x;
            const edy = enemy.y - proj.y;
            const edist = Math.sqrt(edx * edx + edy * edy);

            if (edist < enemy.radius + proj.radius) {
              const isCrit = Math.random() < 0.2;
              const dmg = isCrit ? Math.round(proj.damage * 1.5) : proj.damage;
              enemy.hp -= dmg;

              const shooter = vhState.players[proj.ownerId];
              if (shooter) shooter.damageDealt += dmg;

              vhState.damageTexts.push({
                id: `dt_${Date.now()}_${Math.random()}`,
                x: enemy.x + (Math.random() * 20 - 10),
                y: enemy.y - 15,
                text: `${dmg}`,
                color: isCrit ? '#facc15' : '#ffffff',
                life: 0.8,
                isCrit,
              });

              // Create hit particles
              vhState.particles.push({
                x: proj.x,
                y: proj.y,
                vx: (Math.random() - 0.5) * 120,
                vy: (Math.random() - 0.5) * 120,
                color: proj.color,
                radius: 3,
                life: 0.3,
                maxLife: 0.3,
              });

              proj.pierce -= 1;
              if (proj.pierce <= 0) {
                vhState.projectiles.splice(i, 1);
              }

              if (enemy.hp <= 0) {
                if (shooter) {
                  shooter.kills += 1;
                  shooter.score += enemy.isBoss ? 2000 : enemy.isElite ? 500 : 100;
                }
                vhState.score += enemy.isBoss ? 2000 : enemy.isElite ? 500 : 100;
                vhState.totalKills += 1;

                if (enemy.isBoss) {
                  vhState.waveState = 'victory';
                  broadcastRoom(roomId, { type: 'vh_event', eventType: 'victory' });
                }

                vhState.enemies.splice(j, 1);
              }
              break;
            }
          }
        }
      }

      // Update Particles & Damage Texts
      for (let i = vhState.particles.length - 1; i >= 0; i--) {
        const pt = vhState.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) vhState.particles.splice(i, 1);
      }

      for (let i = vhState.damageTexts.length - 1; i >= 0; i--) {
        const dtObj = vhState.damageTexts[i];
        dtObj.y -= 25 * dt;
        dtObj.life -= dt;
        if (dtObj.life <= 0) vhState.damageTexts.splice(i, 1);
      }

      // Sync state to room clients
      broadcastRoom(roomId, { type: 'vh_state_sync', vhState });
    });
  }, 1000 / 30);
}
