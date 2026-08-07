import React, { useEffect, useRef } from 'react';
import { IslandDefenseState, BuildPad, DefensiveStructure, EnemyEntity } from '../types/voidHorde';
import { IslandPlayer } from '../types/island';
import { soundManager } from '../audio/soundManager';
import { networkClient } from '../networking/NetworkClient';

interface ActiveCanvasPulse {
  id: string;
  type: 'cryo' | 'repair';
  x: number;
  y: number;
  maxRange: number;
  progress: number;
}

interface Props {
  localPlayerId: string;
  state: IslandDefenseState;
  onSendInput: (
    x: number,
    y: number,
    vx: number,
    vy: number,
    facing: IslandPlayer['facing'],
    shooting: boolean,
    aimAngle: number
  ) => void;
  onSelectPad: (pad: BuildPad, existingStruct: DefensiveStructure | null) => void;
  onRevivePlayer: (targetId: string) => void;
  onCollectResource: (resId: string) => void;
  keysPressed: Record<string, boolean>;
  joystickVel: { x: number; y: number };
  touchShooting?: boolean;
  theme?: string;
}

export const IslandCanvas: React.FC<Props> = ({
  localPlayerId,
  state,
  onSendInput,
  onSelectPad,
  onRevivePlayer,
  onCollectResource,
  keysPressed,
  joystickVel,
  touchShooting = false,
  theme = 'classic',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<{ x: number; y: number; facing: IslandPlayer['facing'] }>({
    x: 1200,
    y: 1200,
    facing: 'down',
  });

  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);
  const aimAngleRef = useRef<number>(0);

  // Keep refs for latest props to prevent animation loop tear-down
  const stateRef = useRef(state);
  stateRef.current = state;

  const keysPressedRef = useRef(keysPressed);
  keysPressedRef.current = keysPressed;

  const joystickVelRef = useRef(joystickVel);
  joystickVelRef.current = joystickVel;

  const touchShootingRef = useRef(touchShooting);
  touchShootingRef.current = touchShooting;

  const onSendInputRef = useRef(onSendInput);
  onSendInputRef.current = onSendInput;

  const pulsesRef = useRef<ActiveCanvasPulse[]>([]);

  // Sound, visual state refs for particle systems, screen shakes, and damage vignette flashes (VFX)
  const localParticlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    radius: number;
    life: number;
    maxLife: number;
    gravity?: number;
  }>>([]);

  const shakeIntensityRef = useRef<number>(0);
  const flashAlphaRef = useRef<number>(0);

  const prevProjectilesSet = useRef<Set<string>>(new Set());
  const prevExplosivesRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevKills = useRef<number>(0);
  const prevCoreHp = useRef<number>(2000);
  const prevPlayerHp = useRef<number>(100);
  const prevStructsRef = useRef<Map<string, number>>(new Map());
  const prevReviveRef = useRef<Map<string, number>>(new Map());

  // Subscribe to cryo & repair pulses in the canvas
  useEffect(() => {
    const unsubscribe = networkClient.subscribe((msg) => {
      if (msg.type === 'island_event') {
        if (msg.eventType === 'cryo_pulse') {
          const data = msg.data as { structId: string; x: number; y: number; range: number };
          if (data) {
            pulsesRef.current.push({
              id: `${Date.now()}_${Math.random()}`,
              type: 'cryo',
              x: data.x,
              y: data.y,
              maxRange: data.range,
              progress: 0,
            });
            // Little audio alert context
            soundManager.playChatMessage();
          }
        } else if (msg.eventType === 'repair_pulse') {
          const data = msg.data as { structId: string; x: number; y: number; range: number };
          if (data) {
            pulsesRef.current.push({
              id: `${Date.now()}_${Math.random()}`,
              type: 'repair',
              x: data.x,
              y: data.y,
              maxRange: data.range,
              progress: 0,
            });
            soundManager.playUpgradeBuy();
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Mouse Input Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDownRef.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isMouseDownRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Player Movement & Aim Loop (60 FPS local movement + 30 Hz network dispatch)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastNetSendTime = 0;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const keys = keysPressedRef.current;
      const jVel = joystickVelRef.current;
      const canvas = canvasRef.current;

      const localP = stateRef.current.players[localPlayerId];
      if (localP) {
        const errX = localP.x - posRef.current.x;
        const errY = localP.y - posRef.current.y;
        const errDist = Math.hypot(errX, errY);
        if (errDist > 120) {
          posRef.current.x = localP.x;
          posRef.current.y = localP.y;
        } else if (errDist > 2) {
          posRef.current.x += errX * 0.15;
          posRef.current.y += errY * 0.15;
        }
      }

      const isDowned = localP?.isDowned || false;

      let dx = 0;
      let dy = 0;

      if (!isDowned) {
        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        if (jVel.x !== 0 || jVel.y !== 0) {
          dx = jVel.x;
          dy = jVel.y;
        }
      } else if (localP) {
        // Snap immediately when downed to prevent player drift/desync
        posRef.current.x = localP.x;
        posRef.current.y = localP.y;
      }

      const speed = 250; // px/sec smooth movement
      if (!isDowned && (dx !== 0 || dy !== 0)) {
        const len = Math.sqrt(dx * dx + dy * dy);
        const normX = dx / (len > 1 ? len : 1);
        const normY = dy / (len > 1 ? len : 1);

        let nextX = posRef.current.x + normX * speed * dt;
        let nextY = posRef.current.y + normY * speed * dt;

        // Map Boundaries (2400 x 2400 map world)
        nextX = Math.max(120, Math.min(2280, nextX));
        nextY = Math.max(120, Math.min(2280, nextY));

        let facing: IslandPlayer['facing'] = posRef.current.facing;
        if (Math.abs(normX) > Math.abs(normY)) {
          facing = normX > 0 ? 'right' : 'left';
        } else if (Math.abs(normY) > 0) {
          facing = normY > 0 ? 'down' : 'up';
        }

        posRef.current = { x: nextX, y: nextY, facing };
      }

      // Calculate Aim Angle relative to camera center
      let aimAngle = 0;
      if (canvas) {
        const screenCenterX = canvas.width / 2;
        const screenCenterY = canvas.height / 2;
        aimAngle = Math.atan2(
          mousePosRef.current.y - screenCenterY,
          mousePosRef.current.x - screenCenterX
        );
      }
      aimAngleRef.current = aimAngle;

      const isShooting = !isDowned && (isMouseDownRef.current || touchShootingRef.current);

      // Dispatch input updates to server at ~30Hz
      if (time - lastNetSendTime > 30) {
        lastNetSendTime = time;
        onSendInputRef.current(
          posRef.current.x,
          posRef.current.y,
          dx * speed,
          dy * speed,
          posRef.current.facing,
          isShooting,
          aimAngle
        );
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [localPlayerId]);

  // Main 2D Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      const curState = stateRef.current;

      // Responsive Resize
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      // 1. Process State Changes for Visual & Auditory Effects
      // Track and detect new projectiles to play weapon sounds
      const currentProjIds = new Set(curState.projectiles.map(p => p.id));
      curState.projectiles.forEach(proj => {
        if (!prevProjectilesSet.current.has(proj.id)) {
          if (proj.isEnemy) {
            soundManager.playPlasmaShot();
          } else {
            const w = proj.weaponType || 'plasma';
            if (w === 'scatter') {
              soundManager.playScatterBlast();
              shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 5);
            } else if (w === 'railgun') {
              soundManager.playRailgun();
              shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 4);
            } else if (w === 'rocket') {
              soundManager.playPlasmaShot();
              shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 8);
            } else if (w === 'beam') {
              soundManager.playPlasmaShot();
            } else {
              soundManager.playPlasmaShot();
            }
          }
          prevProjectilesSet.current.add(proj.id);
        }
      });
      // Clean up old projectile IDs to keep set small
      for (const id of prevProjectilesSet.current) {
        if (!currentProjIds.has(id)) {
          prevProjectilesSet.current.delete(id);
        }
      }

      // Track explosive projectiles that disappeared (exploded!)
      const activeExplosiveIds = new Set<string>();
      curState.projectiles.forEach(proj => {
        if (proj.isExplosive) {
          activeExplosiveIds.add(proj.id);
          prevExplosivesRef.current.set(proj.id, { x: proj.x, y: proj.y });
        }
      });
      for (const [id, pos] of prevExplosivesRef.current.entries()) {
        if (!activeExplosiveIds.has(id)) {
          soundManager.playExplosion(true);
          shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 18);
          // Spawn particle explosion cluster locally!
          for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 120;
            localParticlesRef.current.push({
              x: pos.x,
              y: pos.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#f97316' : '#f59e0b',
              radius: 2.5 + Math.random() * 4,
              life: 0.4 + Math.random() * 0.4,
              maxLife: 0.8,
            });
          }
          prevExplosivesRef.current.delete(id);
        }
      }

      // Enemy kill impact sound and minor shake
      if (curState.totalKills > prevKills.current) {
        soundManager.playExplosion(false);
        shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 4);
        prevKills.current = curState.totalKills;
      }

      // Core taking damage
      if (curState.core && curState.core.hp < prevCoreHp.current) {
        shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 12);
        // Spawn cyan core damage sparks!
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 60 + Math.random() * 90;
          localParticlesRef.current.push({
            x: 1200,
            y: 1200 - 12,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#38bdf8',
            radius: 2 + Math.random() * 2,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1.0,
          });
        }
        prevCoreHp.current = curState.core.hp;
      } else if (curState.core) {
        prevCoreHp.current = curState.core.hp;
      }

      // Local player took damage
      const localP = curState.players[localPlayerId];
      if (localP) {
        if (localP.hp < prevPlayerHp.current) {
          soundManager.playHit();
          flashAlphaRef.current = 0.45;
          shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 10);
        }
        prevPlayerHp.current = localP.hp;
      }

      // Track structure builds and upgrades
      const currentStructs = curState.structures || [];
      currentStructs.forEach(struct => {
        const prevLevel = prevStructsRef.current.get(struct.id);
        if (prevLevel === undefined) {
          for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 60;
            localParticlesRef.current.push({
              x: struct.x,
              y: struct.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 20,
              color: '#fbbf24',
              radius: 1.5 + Math.random() * 2,
              life: 0.6 + Math.random() * 0.5,
              maxLife: 1.1,
              gravity: -10,
            });
          }
          prevStructsRef.current.set(struct.id, struct.level);
        } else if (struct.level > prevLevel) {
          for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2;
            const speed = 80 + Math.random() * 40;
            localParticlesRef.current.push({
              x: struct.x,
              y: struct.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: '#3b82f6',
              radius: 2 + Math.random() * 2,
              life: 0.5 + Math.random() * 0.4,
              maxLife: 0.9,
            });
          }
          prevStructsRef.current.set(struct.id, struct.level);
        }
      });
      const currentStructIds = new Set(currentStructs.map(s => s.id));
      for (const id of prevStructsRef.current.keys()) {
        if (!currentStructIds.has(id)) {
          prevStructsRef.current.delete(id);
        }
      }

      // Revival healing sparks
      Object.values(curState.players).forEach(p => {
        const prevProgress = prevReviveRef.current.get(p.id) || 0;
        const curProgress = p.reviveProgress || 0;
        if (curProgress > prevProgress) {
          if (Math.random() < 0.4) {
            localParticlesRef.current.push({
              x: p.x + (Math.random() * 24 - 12),
              y: p.y + (Math.random() * 24 - 12),
              vx: (Math.random() * 16 - 8),
              vy: -(25 + Math.random() * 25),
              color: '#10b981',
              radius: 1.5 + Math.random() * 1.5,
              life: 0.6 + Math.random() * 0.4,
              maxLife: 1.0,
            });
          }
        }
        prevReviveRef.current.set(p.id, curProgress);
      });

      // Resource Drops sparkles
      curState.resourceDrops.forEach(drop => {
        if (Math.random() < 0.04) {
          localParticlesRef.current.push({
            x: drop.x + (Math.random() * 20 - 10),
            y: drop.y + (Math.random() * 20 - 10),
            vx: (Math.random() * 12 - 6),
            vy: -(15 + Math.random() * 15),
            color: drop.type === 'energy' ? '#06b6d4' : '#cbd5e1',
            radius: 1 + Math.random() * 1.2,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1.0,
          });
        }
      });

      // Portal gravitational particles
      curState.activeBreaches.forEach(breach => {
        if (Math.random() < 0.12) {
          const rAngle = Math.random() * Math.PI * 2;
          const rDist = 20 + Math.random() * 24;
          const px = breach.x + Math.cos(rAngle) * rDist;
          const py = breach.y + Math.sin(rAngle) * rDist;
          localParticlesRef.current.push({
            x: px,
            y: py,
            vx: -Math.cos(rAngle) * (20 + Math.random() * 30),
            vy: -Math.sin(rAngle) * (20 + Math.random() * 30),
            color: Math.random() > 0.4 ? '#a855f7' : '#db2777',
            radius: 1.5 + Math.random() * 1.5,
            life: 0.6 + Math.random() * 0.4,
            maxLife: 1.0,
          });
        }
      });

      // Central core crystal floating sparks
      const coreBounceY = Math.sin(time * 4.5) * 8;
      if (Math.random() < 0.1) {
        localParticlesRef.current.push({
          x: 1200 + (Math.random() * 12 - 6),
          y: 1200 - 12 + coreBounceY,
          vx: (Math.random() * 20 - 10),
          vy: -(15 + Math.random() * 25),
          color: Math.random() > 0.4 ? '#38bdf8' : '#cbd5e1',
          radius: 1.2 + Math.random() * 1.8,
          life: 0.7 + Math.random() * 0.4,
          maxLife: 1.1,
        });
      }

      // Decaying screen shake logic
      if (shakeIntensityRef.current > 0.1) {
        shakeIntensityRef.current *= 0.88;
      } else {
        shakeIntensityRef.current = 0;
      }
      const shakeX = (Math.random() - 0.5) * shakeIntensityRef.current;
      const shakeY = (Math.random() - 0.5) * shakeIntensityRef.current;

      const camX = posRef.current.x;
      const camY = posRef.current.y;

      ctx.save();
      // Center Camera on local player with camera screen shake
      ctx.translate(canvas.width / 2 - camX + shakeX, canvas.height / 2 - camY + shakeY);

      // 1. Render Checkered Pixel-Art Tiles (Ocean, Sand, Grass, Pathways, Central Plaza)
      const tileSize = 40;
      const startX = Math.floor((camX - canvas.width / 2 - 80) / tileSize) * tileSize;
      const endX = Math.ceil((camX + canvas.width / 2 + 80) / tileSize) * tileSize;
      const startY = Math.floor((camY - canvas.height / 2 - 80) / tileSize) * tileSize;
      const endY = Math.ceil((camY + canvas.height / 2 + 80) / tileSize) * tileSize;

      // Theme configurations for every sprite and tile
      let oceanFill = '#0284c7';
      let oceanAlt = '#075985';
      let islandFill = '#10b981'; // Grass
      let islandAlt = '#059669';
      let plazaFill = '#e2e8f0';
      let plazaAlt = '#cbd5e1';
      let pathFill = '#475569';
      let pathAlt = '#334155';
      let shoreFill = '#fef08a';
      let shoreAlt = '#fde047';

      // Define visual theme properties
      if (theme === 'cyberpunk') {
        oceanFill = '#090514'; // space deep black
        oceanAlt = '#140c26';  // dark purple cyber space
        islandFill = '#a21caf'; // Neon Magenta
        islandAlt = '#86198f';  // Deep Violet
        plazaFill = '#06b6d4';  // Cyan grid
        plazaAlt = '#0891b2';
        pathFill = '#4f46e5';   // Indigo laser pathway
        pathAlt = '#3730a3';
        shoreFill = '#f43f5e';  // Retro pink coastline
        shoreAlt = '#e11d48';
      } else if (theme === 'wasteland') {
        oceanFill = '#14532d'; // toxic sludge green
        oceanAlt = '#166534';
        islandFill = '#78350f'; // sulfur waste/mustard soil
        islandAlt = '#451a03';
        plazaFill = '#475569';  // reinforced rust
        plazaAlt = '#334155';
        pathFill = '#d97706';   // copper wires
        pathAlt = '#b45309';
        shoreFill = '#22c55e';  // radioactive shoreline
        shoreAlt = '#16a34a';
      } else if (theme === 'magma') {
        oceanFill = '#7f1d1d'; // bubbling magma
        oceanAlt = '#991b1b';
        islandFill = '#1e293b'; // burnt obsidian soot
        islandAlt = '#0f172a';
        plazaFill = '#ea580c';  // smelting hearth
        plazaAlt = '#c2410c';
        pathFill = '#090d16';   // dark basalt cobblestone
        pathAlt = '#020617';
        shoreFill = '#f97316';  // incandescent shoreline
        shoreAlt = '#ea580c';
      } else if (theme === 'frozen') {
        oceanFill = '#0c4a6e'; // icy deep water
        oceanAlt = '#075985';
        islandFill = '#f1f5f9'; // soft white snow
        islandAlt = '#e2e8f0';
        plazaFill = '#bae6fd';  // solid glaze blue ice
        plazaAlt = '#7dd3fc';
        pathFill = '#0284c7';   // frozen pipelines
        pathAlt = '#0369a1';
        shoreFill = '#38bdf8';  // shimmering neon ice shore
        shoreAlt = '#0ea5e9';
      }

      for (let tx = startX; tx < endX; tx += tileSize) {
        for (let ty = startY; ty < endY; ty += tileSize) {
          const dx = tx + tileSize / 2 - 1200;
          const dy = ty + tileSize / 2 - 1200;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let fillCol = oceanFill;
          let altCol = oceanAlt;

          if (dist < 1040) {
            // Inside Island Mass
            const isPathNS = tx >= 1110 && tx < 1290 && ty >= 140 && ty < 2260;
            const isPathEW = ty >= 1110 && ty < 1290 && tx >= 140 && tx < 2260;

            if (dist < 180) {
              // Central Plaza
              fillCol = plazaFill;
              altCol = plazaAlt;
            } else if (isPathNS || isPathEW) {
              // Cobblestone path
              fillCol = pathFill;
              altCol = pathAlt;
            } else if (dist > 980) {
              // Sand Shoreline
              fillCol = shoreFill;
              altCol = shoreAlt;
            } else {
              // Grass
              fillCol = islandFill;
              altCol = islandAlt;
            }
          }

          const isAlt = (Math.floor(tx / tileSize) + Math.floor(ty / tileSize)) % 2 === 0;
          ctx.fillStyle = isAlt ? altCol : fillCol;
          ctx.fillRect(tx, ty, tileSize, tileSize);

          // Draw little grid joint dots on walkways
          if (dist < 1040 && ((tx >= 1110 && tx < 1290) || (ty >= 1110 && ty < 1290)) && dist >= 180) {
            ctx.fillStyle = theme === 'cyberpunk' ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(tx, ty, 2, 2);
            ctx.fillRect(tx + tileSize - 2, ty + tileSize - 2, 2, 2);
          }
        }
      }

      // Determine theme-specific styling for the Core Crystal and Barrier Dome
      let shieldColor = 'rgba(56, 189, 248, 0.45)';
      let crystalColor = '#38bdf8';
      let crystalInnerColor = '#f8fafc';
      let pedestalColorBottom = '#0f172a';
      let pedestalColorMiddle = '#1e293b';
      let pedestalColorTop = '#334155';

      if (theme === 'cyberpunk') {
        shieldColor = 'rgba(236, 72, 153, 0.5)'; // Hot pink dome
        crystalColor = '#ec4899'; // Magenta crystal
        crystalInnerColor = '#fdf2f8';
        pedestalColorBottom = '#1e1b4b';
        pedestalColorMiddle = '#311042';
        pedestalColorTop = '#4d145a';
      } else if (theme === 'wasteland') {
        shieldColor = 'rgba(34, 197, 94, 0.45)'; // Lime/acid dome
        crystalColor = '#a3e635'; // Toxic lime crystal
        crystalInnerColor = '#f7fee7';
        pedestalColorBottom = '#2d1500';
        pedestalColorMiddle = '#3f1c00';
        pedestalColorTop = '#653100';
      } else if (theme === 'magma') {
        shieldColor = 'rgba(239, 68, 68, 0.5)'; // Burning red fire dome
        crystalColor = '#ef4444'; // Magma flame core
        crystalInnerColor = '#fff5f5';
        pedestalColorBottom = '#090d16';
        pedestalColorMiddle = '#1c1917';
        pedestalColorTop = '#292524';
      } else if (theme === 'frozen') {
        shieldColor = 'rgba(125, 211, 252, 0.5)'; // Icy frost dome
        crystalColor = '#bae6fd'; // Pure ice blue crystal
        crystalInnerColor = '#f0f9ff';
        pedestalColorBottom = '#082f49';
        pedestalColorMiddle = '#0c4a6e';
        pedestalColorTop = '#075985';
      }

      // 2. Core Outer Shield Barrier Dome Ring (8-bit style)
      if (curState.core.shield > 0) {
        ctx.strokeStyle = shieldColor;
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(1200, 1200, 215 + Math.sin(time * 6) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Core Pedestal & Crystal (Stepped Block Pyramid and floating spinning diamond)
      ctx.fillStyle = pedestalColorBottom; // Bottom base
      ctx.fillRect(1200 - 45, 1200 - 45, 90, 90);
      ctx.strokeStyle = pedestalColorMiddle;
      ctx.lineWidth = 4;
      ctx.strokeRect(1200 - 45, 1200 - 45, 90, 90);

      ctx.fillStyle = pedestalColorMiddle; // Middle tier
      ctx.fillRect(1200 - 28, 1200 - 28, 56, 56);
      ctx.strokeRect(1200 - 28, 1200 - 28, 56, 56);

      ctx.fillStyle = pedestalColorTop; // Top tier
      ctx.fillRect(1200 - 15, 1200 - 15, 30, 30);

      // Bouncing, glowing 8-bit crystal diamond
      const bounceY = Math.sin(time * 4.5) * 8;
      const crystalX = 1200;
      const crystalY = 1200 - 12 + bounceY;
      const sizeW = 18 + Math.sin(time * 2) * 2;
      const sizeH = 26;

      ctx.fillStyle = crystalColor; // Glowing light blue / themed color
      ctx.beginPath();
      ctx.moveTo(crystalX, crystalY - sizeH);
      ctx.lineTo(crystalX + sizeW, crystalY);
      ctx.lineTo(crystalX, crystalY + sizeH);
      ctx.lineTo(crystalX - sizeW, crystalY);
      ctx.closePath();
      ctx.fill();

      // Inner glowing core
      ctx.fillStyle = crystalInnerColor;
      ctx.beginPath();
      ctx.moveTo(crystalX, crystalY - sizeH + 8);
      ctx.lineTo(crystalX + sizeW - 5, crystalY);
      ctx.lineTo(crystalX, crystalY + sizeH - 8);
      ctx.lineTo(crystalX - sizeW + 5, crystalY);
      ctx.closePath();
      ctx.fill();

      // Floating World-Space Core HP & Shield Bar (appears when player is near the core, or critically damaged)
      const distToCore = Math.hypot(camX - 1200, camY - 1200);
      const coreHpPct = curState.core.hp / curState.core.maxHp;
      const coreShieldPct = curState.core.shield / curState.core.maxShield;

      if (distToCore < 350 || coreHpPct < 0.3) {
        const barWidth = 100;
        const barHeight = 8;
        const bx = 1200 - barWidth / 2;
        const by = 1200 - 85;

        // Dark background container
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx - 4, by - 4, barWidth + 8, barHeight + 16);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 4, by - 4, barWidth + 8, barHeight + 16);

        // Shield Bar
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(bx, by, barWidth * coreShieldPct, 3);

        // Health Bar
        ctx.fillStyle = coreHpPct < 0.3 ? '#ef4444' : coreHpPct < 0.6 ? '#f59e0b' : '#38bdf8';
        ctx.fillRect(bx, by + 4, barWidth * coreHpPct, barHeight - 3);

        // Core Status Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`CORE:${Math.round(coreHpPct * 100)}%`, 1200, by + barHeight + 11);
      }

      // 4. Breach Portals at Map Perimeters
      curState.activeBreaches.forEach((breach) => {
        let portalBg = 'rgba(168, 85, 247, 0.25)';
        let portalStroke = '#a855f7';
        let portalMid = '#6b21a8';
        let portalInner = '#a855f7';

        if (theme === 'cyberpunk') {
          portalBg = 'rgba(34, 197, 94, 0.25)';
          portalStroke = '#22c55e';
          portalMid = '#14532d';
          portalInner = '#22c55e';
        } else if (theme === 'wasteland') {
          portalBg = 'rgba(249, 115, 22, 0.25)';
          portalStroke = '#f97316';
          portalMid = '#7c2d12';
          portalInner = '#f97316';
        } else if (theme === 'magma') {
          portalBg = 'rgba(234, 179, 8, 0.25)';
          portalStroke = '#eab308';
          portalMid = '#713f12';
          portalInner = '#eab308';
        } else if (theme === 'frozen') {
          portalBg = 'rgba(56, 189, 248, 0.25)';
          portalStroke = '#38bdf8';
          portalMid = '#1e3a8a';
          portalInner = '#38bdf8';
        }

        // Jagged 8-bit star portal region
        ctx.fillStyle = portalBg;
        ctx.fillRect(breach.x - 48, breach.y - 48, 96, 96);
        ctx.strokeStyle = portalStroke;
        ctx.lineWidth = 3;
        ctx.strokeRect(breach.x - 32, breach.y - 32, 64, 64);

        ctx.fillStyle = portalMid;
        ctx.fillRect(breach.x - 16, breach.y - 16, 32, 32);
        ctx.fillStyle = portalInner;
        ctx.fillRect(breach.x - 8, breach.y - 8, 16, 16);

        // Warning Direction Light Beam during Active Wave
        if (curState.phase === 'defense' || curState.phase === 'warning') {
          ctx.strokeStyle = theme === 'cyberpunk' ? 'rgba(236, 72, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 4;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(breach.x, breach.y);
          ctx.lineTo(1200, 1200);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // 5. Build Pads & Defensive Structures
      curState.buildPads.forEach((pad) => {
        const builtStruct = curState.structures.find((s) => s.id === pad.structureId);

        if (builtStruct) {
          // 1. Draw Structure Base (Robust pixel industrial foundations)
          let baseCol = '#1e293b'; // dark structural steel
          let borderCol = '#0f172a';
          let legCol = '#475569';
          let legHoleCol = '#0f172a';

          if (theme === 'cyberpunk') {
            baseCol = '#100a26';
            borderCol = '#ec4899'; // Magenta glowing outline
            legCol = '#2563eb';    // Neon blue rivets
            legHoleCol = '#090514';
          } else if (theme === 'wasteland') {
            baseCol = '#451a03';   // rusty copper/brown
            borderCol = '#22c55e'; // Radioactive green outlines
            legCol = '#b45309';  
            legHoleCol = '#14532d';
          } else if (theme === 'magma') {
            baseCol = '#111827';   // dark basalt
            borderCol = '#f97316'; // Lava orange outlines
            legCol = '#ef4444';  
            legHoleCol = '#020617';
          } else if (theme === 'frozen') {
            baseCol = '#1e3a8a';   // Deep frost blue
            borderCol = '#38bdf8'; // Ice blue outlines
            legCol = '#bae6fd';  
            legHoleCol = '#082f49';
          }

          ctx.fillStyle = baseCol;
          ctx.fillRect(builtStruct.x - 24, builtStruct.y - 10, 48, 28);
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = 3;
          ctx.strokeRect(builtStruct.x - 24, builtStruct.y - 10, 48, 28);

          // Support legs/rivets
          ctx.fillStyle = legCol;
          ctx.fillRect(builtStruct.x - 20, builtStruct.y + 12, 6, 6);
          ctx.fillRect(builtStruct.x + 14, builtStruct.y + 12, 6, 6);
          ctx.fillStyle = legHoleCol;
          ctx.fillRect(builtStruct.x - 18, builtStruct.y + 14, 2, 2);
          ctx.fillRect(builtStruct.x + 16, builtStruct.y + 14, 2, 2);

          // 2. Render Distinct Animated Turrets & Assemblies
          if (builtStruct.type === 'auto_turret') {
            // High-velocity dual-barrel blaster
            let targetAngle = time * 0.4;
            let targetEnemy = null;
            let minDist = builtStruct.range;
            curState.enemies.forEach((e) => {
              const d = Math.hypot(e.x - builtStruct.x, e.y - builtStruct.y);
              if (d < minDist) {
                minDist = d;
                targetEnemy = e;
              }
            });
            if (targetEnemy) {
              targetAngle = Math.atan2((targetEnemy as EnemyEntity).y - (builtStruct.y - 16), (targetEnemy as EnemyEntity).x - builtStruct.x);
            }

            // Rotating Gun Head Casing
            ctx.save();
            ctx.translate(builtStruct.x, builtStruct.y - 16);
            ctx.rotate(targetAngle);

            // Dual heavy steel barrels
            ctx.fillStyle = '#64748b';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            
            // Left barrel
            ctx.fillRect(8, -6, 15, 3);
            ctx.strokeRect(8, -6, 15, 3);
            // Right barrel
            ctx.fillRect(8, 3, 15, 3);
            ctx.strokeRect(8, 3, 15, 3);

            // Tech core head
            ctx.fillStyle = '#0ea5e9'; // Cobalt Blue
            ctx.fillRect(-10, -10, 20, 20);
            ctx.strokeRect(-10, -10, 20, 20);

            // Flashing blue tracking sensor
            ctx.fillStyle = Math.sin(time * 12) > 0 ? '#38bdf8' : '#0284c7';
            ctx.fillRect(2, -3, 4, 6);

            ctx.restore();

          } else if (builtStruct.type === 'heavy_cannon') {
            // Massive artillery cannon
            let targetAngle = -Math.PI / 2;
            let targetEnemy = null;
            let minDist = builtStruct.range;
            curState.enemies.forEach((e) => {
              const d = Math.hypot(e.x - builtStruct.x, e.y - builtStruct.y);
              if (d < minDist) {
                minDist = d;
                targetEnemy = e;
              }
            });
            if (targetEnemy) {
              targetAngle = Math.atan2((targetEnemy as EnemyEntity).y - (builtStruct.y - 16), (targetEnemy as EnemyEntity).x - builtStruct.x);
            }

            ctx.save();
            ctx.translate(builtStruct.x, builtStruct.y - 16);
            ctx.rotate(targetAngle);

            // Heavy reinforced cannon barrel with heat shield rings
            ctx.fillStyle = '#475569';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 3;
            ctx.fillRect(4, -6, 18, 12);
            ctx.strokeRect(4, -6, 18, 12);

            // Heat dispersion muzzle break
            ctx.fillStyle = '#fb923c'; // Fire Orange Accent
            ctx.fillRect(16, -7, 6, 14);
            ctx.strokeRect(16, -7, 6, 14);

            // Heavy rear breach blocks
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeRect(-12, -12, 24, 24);

            ctx.restore();

          } else if (builtStruct.type === 'laser_turret') {
            // Continuous high-temperature thermal laser amplifier
            let targetAngle = time * 0.7;
            let laserTarget = null;
            if (builtStruct.targetId) {
              laserTarget = curState.enemies.find((e) => e.id === builtStruct.targetId);
            }
            if (!laserTarget) {
              let minDist = builtStruct.range;
              curState.enemies.forEach((e) => {
                const d = Math.hypot(e.x - builtStruct.x, e.y - builtStruct.y);
                if (d < minDist) {
                  minDist = d;
                  laserTarget = e;
                }
              });
            }
            if (laserTarget) {
              targetAngle = Math.atan2((laserTarget as EnemyEntity).y - (builtStruct.y - 16), (laserTarget as EnemyEntity).x - builtStruct.x);
            }

            ctx.save();
            ctx.translate(builtStruct.x, builtStruct.y - 16);
            ctx.rotate(targetAngle);

            // Laser focal emitter lens extension
            ctx.fillStyle = '#be185d'; // Deep Pink Casing
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.fillRect(2, -5, 12, 10);
            ctx.strokeRect(2, -5, 12, 10);

            // Pure glass optical crystal tip
            ctx.fillStyle = '#f472b6';
            ctx.fillRect(12, -3, 4, 6);
            ctx.strokeRect(12, -3, 4, 6);

            // Triangular resonance chamber
            ctx.fillStyle = '#ec4899';
            ctx.beginPath();
            ctx.moveTo(-10, -11);
            ctx.lineTo(6, 0);
            ctx.lineTo(-10, 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();

            // RENDER GLOWING THERMAL LASER BEAM (Melting continuous red line!)
            if (laserTarget && curState.phase === 'defense') {
              const originX = builtStruct.x;
              const originY = builtStruct.y - 16;
              const destX = (laserTarget as EnemyEntity).x;
              const destY = (laserTarget as EnemyEntity).y;

              ctx.save();
              // Outer crackling crimson thermal halo
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.42)';
              ctx.lineWidth = 14 + Math.sin(time * 35) * 4.5;
              ctx.beginPath();
              ctx.moveTo(originX, originY);
              ctx.lineTo(destX, destY);
              ctx.stroke();

              // Intermediate high-energy rose layer
              ctx.strokeStyle = '#f43f5e';
              ctx.lineWidth = 7.5 + Math.sin(time * 22) * 2;
              ctx.beginPath();
              ctx.moveTo(originX, originY);
              ctx.lineTo(destX, destY);
              ctx.stroke();

              // Hot white fusion focal core (The destructive melting line)
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2.8;
              ctx.beginPath();
              ctx.moveTo(originX, originY);
              ctx.lineTo(destX, destY);
              ctx.stroke();

              ctx.restore();
            }

          } else if (builtStruct.type === 'slow_field') {
            // Cryo Frost Nova Pulsator
            // Ice glass grid structure
            ctx.fillStyle = '#0891b2';
            ctx.fillRect(builtStruct.x - 14, builtStruct.y - 24, 28, 16);
            ctx.strokeRect(builtStruct.x - 14, builtStruct.y - 24, 28, 16);

            // Rotating crystalline panels
            ctx.save();
            ctx.translate(builtStruct.x, builtStruct.y - 16);
            ctx.rotate(time * 1.5);
            ctx.fillStyle = '#22d3ee';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.fillRect(-18, -2, 4, 4);
            ctx.fillRect(14, -2, 4, 4);
            ctx.fillRect(-2, -18, 4, 4);
            ctx.fillRect(-2, 14, 4, 4);
            ctx.restore();

            // Center freezing core diamond
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(builtStruct.x - 4, builtStruct.y - 20, 8, 8);

            // Cold field range indicator (Pulsing dashed cyan circle)
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.18)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.arc(builtStruct.x, builtStruct.y, builtStruct.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

          } else if (builtStruct.type === 'shield_generator') {
            // Orbital dome emitter
            ctx.fillStyle = '#6d28d9'; // Dark Violet Casing
            ctx.fillRect(builtStruct.x - 16, builtStruct.y - 24, 32, 16);
            ctx.strokeRect(builtStruct.x - 16, builtStruct.y - 24, 32, 16);

            // Floating, spinning central power crystal
            const pulseSize = 10 + Math.sin(time * 5.5) * 2.5;
            ctx.fillStyle = '#a78bfa';
            ctx.strokeStyle = '#4c1d95';
            ctx.lineWidth = 2;
            ctx.save();
            ctx.translate(builtStruct.x, builtStruct.y - 16);
            ctx.rotate(time * 2.2);
            ctx.beginPath();
            ctx.moveTo(0, -pulseSize);
            ctx.lineTo(pulseSize, 0);
            ctx.lineTo(0, pulseSize);
            ctx.lineTo(-pulseSize, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Range shield dome edge (Purple neon barrier)
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.28)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 12]);
            ctx.beginPath();
            ctx.arc(builtStruct.x, builtStruct.y, builtStruct.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

          } else if (builtStruct.type === 'repair_station') {
            // Industrial green assembly repair hub
            ctx.fillStyle = '#065f46'; // Forest Green Casing
            ctx.fillRect(builtStruct.x - 16, builtStruct.y - 24, 32, 16);
            ctx.strokeRect(builtStruct.x - 16, builtStruct.y - 24, 32, 16);

            // Revolving diagnostic sensor disk
            ctx.fillStyle = '#34d399';
            ctx.fillRect(builtStruct.x - 12, builtStruct.y - 28, 24, 4);
            ctx.strokeRect(builtStruct.x - 12, builtStruct.y - 28, 24, 4);

            // Rotating nanite pulse emitter beacon
            const pulseSide = Math.sin(time * 6.5) > 0;
            ctx.fillStyle = pulseSide ? '#10b981' : '#047857';
            ctx.fillRect(builtStruct.x - 4, builtStruct.y - 34, 8, 6);
            ctx.strokeRect(builtStruct.x - 4, builtStruct.y - 34, 8, 6);

            // Little medical cross badge
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(builtStruct.x - 6, builtStruct.y - 18, 12, 4);
            ctx.fillRect(builtStruct.x - 2, builtStruct.y - 22, 4, 12);

            // Healing area of effect range ring
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(builtStruct.x, builtStruct.y, builtStruct.range, 0, Math.PI * 2);
            ctx.stroke();

            // Rising green nanite sparkle plusses
            if (Math.random() < 0.04) {
              ctx.fillStyle = 'rgba(52, 211, 153, 0.7)';
              ctx.font = 'bold 9px monospace';
              ctx.fillText('+', builtStruct.x + (Math.random() * 24 - 12), builtStruct.y - 30 - (Math.random() * 20));
            }

          } else if (builtStruct.type === 'barricade') {
            // Concrete heavy-duty security shield barricade
            ctx.fillStyle = '#334155'; // Dark heavy stone
            ctx.fillRect(builtStruct.x - 24, builtStruct.y - 26, 48, 18);
            ctx.strokeRect(builtStruct.x - 24, builtStruct.y - 26, 48, 18);

            // Black and Yellow hazard danger stripes on face
            ctx.fillStyle = '#facc15'; // yellow striping
            ctx.fillRect(builtStruct.x - 18, builtStruct.y - 22, 36, 10);
            
            ctx.fillStyle = '#0f172a'; // black lines diagonal
            ctx.lineWidth = 2.5;
            for (let ox = -16; ox <= 16; ox += 8) {
              ctx.beginPath();
              ctx.moveTo(builtStruct.x + ox, builtStruct.y - 22);
              ctx.lineTo(builtStruct.x + ox + 6, builtStruct.y - 12);
              ctx.stroke();
            }

            // Metal reinforcement brackets
            ctx.fillStyle = '#64748b';
            ctx.fillRect(builtStruct.x - 22, builtStruct.y - 28, 6, 4);
            ctx.fillRect(builtStruct.x + 16, builtStruct.y - 28, 6, 4);
          }

          // Level Badge Tag inside flat block
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(builtStruct.x - 18, builtStruct.y + 22, 36, 12);
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`L${builtStruct.level}`, builtStruct.x, builtStruct.y + 31);

          // Structure Health Bar
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(builtStruct.x - 20, builtStruct.y - 38, 40, 6);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(builtStruct.x - 20, builtStruct.y - 38, (builtStruct.hp / builtStruct.maxHp) * 40, 6);
          ctx.strokeRect(builtStruct.x - 20, builtStruct.y - 38, 40, 6);
        } else {
          // Unbuilt Pad Pad bracket markings
          const offset = 18 + Math.sin(time * 3.5) * 3;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          
          // Draw pixelated bracket indicators
          ctx.beginPath();
          ctx.moveTo(pad.x - offset, pad.y - offset + 8);
          ctx.lineTo(pad.x - offset, pad.y - offset);
          ctx.lineTo(pad.x - offset + 8, pad.y - offset);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pad.x + offset, pad.y - offset + 8);
          ctx.lineTo(pad.x + offset, pad.y - offset);
          ctx.lineTo(pad.x + offset - 8, pad.y - offset);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pad.x - offset, pad.y + offset - 8);
          ctx.lineTo(pad.x - offset, pad.y + offset);
          ctx.lineTo(pad.x - offset + 8, pad.y + offset);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pad.x + offset, pad.y + offset - 8);
          ctx.lineTo(pad.x + offset, pad.y + offset);
          ctx.lineTo(pad.x + offset - 8, pad.y + offset);
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillText('BUILD', pad.x, pad.y + 3);
        }
      });

      // 6. Resource Drops on Field (Bouncing 8-bit shapes)
      curState.resourceDrops.forEach((res) => {
        const glow = Math.sin(time * 6 + res.x) * 2;
        if (res.type === 'energy') {
          // Electric blue pixel cell
          ctx.fillStyle = '#0ea5e9';
          ctx.fillRect(res.x - 6, res.y - 8 + glow, 12, 16);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(res.x - 4, res.y - 6 + glow, 8, 12);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(res.x - 2, res.y - 4 + glow, 4, 8);
        } else {
          // Golden metal scrap square
          ctx.fillStyle = '#b45309';
          ctx.fillRect(res.x - 8, res.y - 8 + glow, 16, 16);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(res.x - 6, res.y - 6 + glow, 12, 12);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(res.x - 4, res.y - 4 + glow, 4, 4);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(res.type === 'energy' ? 'NRG' : 'SCRAP', res.x, res.y - 14);
      });

      // 7. Render Void Horde Enemies (Retro slimes / space bugs)
      curState.enemies.forEach((enemy) => {
        const squish = Math.sin(time * 8 + enemy.x) * 2;
        
        let enemyColor = enemy.color;
        let strokeColor = '#000000';
        let bossBorder = '#facc15';
        let eyeColor = '#ffffff';

        if (theme === 'cyberpunk') {
          enemyColor = enemy.isBoss ? '#ec4899' : '#06b6d4';
          strokeColor = '#3b0764';
          bossBorder = '#a855f7';
          eyeColor = '#fdf2f8';
        } else if (theme === 'wasteland') {
          enemyColor = enemy.isBoss ? '#ea580c' : '#22c55e';
          strokeColor = '#14532d';
          bossBorder = '#eab308';
          eyeColor = '#facc15';
        } else if (theme === 'magma') {
          enemyColor = enemy.isBoss ? '#991b1b' : '#f97316';
          strokeColor = '#450a0a';
          bossBorder = '#ef4444';
          eyeColor = '#fef08a';
        } else if (theme === 'frozen') {
          enemyColor = enemy.isBoss ? '#1d4ed8' : '#e2e8f0';
          strokeColor = '#1e3a8a';
          bossBorder = '#60a5fa';
          eyeColor = '#38bdf8';
        }

        ctx.fillStyle = enemyColor;
        
        if (enemy.isBoss) {
          // Mega boss demon block
          ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius + squish, enemy.radius * 2, enemy.radius * 2);
          ctx.strokeStyle = bossBorder;
          ctx.lineWidth = 4;
          ctx.strokeRect(enemy.x - enemy.radius, enemy.y - enemy.radius + squish, enemy.radius * 2, enemy.radius * 2);

          // Horn spikes on bosses
          ctx.fillStyle = theme === 'magma' ? '#f59e0b' : '#ef4444';
          ctx.fillRect(enemy.x - 10, enemy.y - enemy.radius - 8 + squish, 5, 8);
          ctx.fillRect(enemy.x + 5, enemy.y - enemy.radius - 8 + squish, 5, 8);
        } else {
          // Normal slimes or core invaders
          ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius + squish, enemy.radius * 2, enemy.radius * 2);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(enemy.x - enemy.radius, enemy.y - enemy.radius + squish, enemy.radius * 2, enemy.radius * 2);

          // Cute pixel eyes
          ctx.fillStyle = eyeColor;
          ctx.fillRect(enemy.x - 5, enemy.y - 3 + squish, 3, 3);
          ctx.fillRect(enemy.x + 2, enemy.y - 3 + squish, 3, 3);
        }

        // Enemy HP Bar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(enemy.x - 18, enemy.y - enemy.radius - 12, 36, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(enemy.x - 18, enemy.y - enemy.radius - 12, (enemy.hp / enemy.maxHp) * 36, 6);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(enemy.x - 18, enemy.y - enemy.radius - 12, 36, 6);
      });

      // 8. Render Projectiles (Unique visual shapes, particles, and tracers)
      curState.projectiles.forEach((proj) => {
        const weaponType = proj.weaponType || (proj.color === '#f43f5e' ? 'beam' : proj.color === '#a78bfa' ? 'railgun' : proj.color === '#f59e0b' ? 'rocket' : 'plasma');

        ctx.save();
        ctx.translate(proj.x, proj.y);

        // Calculate angle of flight
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(angle);

        if (weaponType === 'beam') {
          // Theme specific laser colors
          let beamBase = 'rgba(244,63,94,1)';
          let beamOuter = '#f43f5e';
          let beamInner = '#ffffff';

          if (theme === 'cyberpunk') {
            beamBase = 'rgba(217,70,239,1)';
            beamOuter = '#d946ef';
            beamInner = '#ffffff';
          } else if (theme === 'wasteland') {
            beamBase = 'rgba(34,197,94,1)';
            beamOuter = '#22c55e';
            beamInner = '#fff';
          } else if (theme === 'magma') {
            beamBase = 'rgba(249,115,22,1)';
            beamOuter = '#ea580c';
            beamInner = '#fffef0';
          } else if (theme === 'frozen') {
            beamBase = 'rgba(56,189,248,1)';
            beamOuter = '#38bdf8';
            beamInner = '#f0f9ff';
          }

          // Continuous Thermal Laser Beam segment
          const gradient = ctx.createLinearGradient(-15, 0, 15, 0);
          gradient.addColorStop(0, beamBase.replace('1)', '0.1)'));
          gradient.addColorStop(0.5, beamBase);
          gradient.addColorStop(1, beamInner);

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-20, 0);
          ctx.lineTo(20, 0);
          ctx.stroke();

          // Outer Laser Glow
          ctx.shadowColor = beamOuter;
          ctx.shadowBlur = 10;
          ctx.strokeStyle = beamOuter;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-20, 0);
          ctx.lineTo(20, 0);
          ctx.stroke();
        } else if (weaponType === 'rocket') {
          // Chunky Void Rocket Missile
          // Rocket Body
          ctx.fillStyle = '#475569'; // Grey metal
          ctx.fillRect(-12, -4, 20, 8);
          
          // Red Nosecone
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(8, -4);
          ctx.lineTo(16, 0);
          ctx.lineTo(8, 4);
          ctx.closePath();
          ctx.fill();

          // Yellow hazard stripes
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-3, -4, 3, 8);

          // Exhaust pixel particles (fire trail)
          const isFlicker = Math.random() > 0.5;
          ctx.fillStyle = isFlicker ? '#f97316' : '#ef4444';
          ctx.fillRect(-18, -3, 6, 6);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(-22, -1, 4, 2);
        } else if (weaponType === 'railgun') {
          // Hyper-extended crackling Violet Railgun Bolt
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 15;
          
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-45, 0);
          ctx.lineTo(45, 0);
          ctx.stroke();

          // Bright white hot core
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-35, 0);
          ctx.lineTo(35, 0);
          ctx.stroke();
        } else if (weaponType === 'scatter') {
          // Glowing Golden buckshot
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 5;

          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, proj.radius || 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, (proj.radius || 4) / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (weaponType === 'assault') {
          // Neon Green Tactical Tracer Bullet
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-10, -2, 20, 4);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-3, -1.2, 10, 2.4);
        } else {
          // Plasma Blaster glowing blue sphere
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, 0, proj.radius || 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, (proj.radius || 5) / 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 9. Render All Players (8-bit blocky customizable avatars)
      Object.values(curState.players).forEach((p) => {
        const isSelf = p.id === localPlayerId;
        const px = isSelf ? posRef.current.x : p.x;
        const py = isSelf ? posRef.current.y : p.y;

        // Player shadow rectangle
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 14, py + 12, 28, 6);

        // Player body block
        ctx.fillStyle = p.isDowned ? '#64748b' : p.avatar?.bodyColor || '#3b82f6';
        ctx.fillRect(px - 14, py - 14, 28, 28);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.strokeRect(px - 14, py - 14, 28, 28);

        // Head plate/visor
        ctx.fillStyle = p.avatar?.skin === 'cyber' ? '#38bdf8' : p.avatar?.skin === 'alien' ? '#84cc16' : '#fde047';
        ctx.fillRect(px - 10, py - 10, 20, 14);

        // Expressive little 8-bit eyes looking towards direction
        ctx.fillStyle = '#0f172a';
        let eyeOffset = 0;
        if (p.facing === 'left') eyeOffset = -3;
        if (p.facing === 'right') eyeOffset = 3;
        ctx.fillRect(px - 5 + eyeOffset, py - 6, 3, 3);
        ctx.fillRect(px + 2 + eyeOffset, py - 6, 3, 3);

        // Pixel-rendered customized hats
        if (p.avatar?.hat && p.avatar.hat !== 'none') {
          ctx.fillStyle =
            p.avatar.hat === 'helmet'
              ? '#cbd5e1'
              : p.avatar.hat === 'visor'
              ? '#22d3ee'
              : p.avatar.hat === 'crown'
              ? '#fbbf24'
              : p.avatar.hat === 'headphones'
              ? '#f97316'
              : '#ef4444'; // Cap/Default red

          if (p.avatar.hat === 'helmet') {
            ctx.fillRect(px - 12, py - 20, 24, 6);
            ctx.strokeRect(px - 12, py - 20, 24, 6);
          } else if (p.avatar.hat === 'visor') {
            ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
            ctx.fillRect(px - 10, py - 8, 20, 4);
          } else if (p.avatar.hat === 'crown') {
            ctx.fillRect(px - 10, py - 18, 20, 4);
            ctx.fillRect(px - 8, py - 21, 4, 3);
            ctx.fillRect(px + 4, py - 21, 4, 3);
          } else if (p.avatar.hat === 'headphones') {
            ctx.fillRect(px - 16, py - 8, 3, 12);
            ctx.fillRect(px + 13, py - 8, 3, 12);
            ctx.fillRect(px - 13, py - 16, 26, 3);
          } else if (p.avatar.hat === 'cap') {
            ctx.fillRect(px - 12, py - 18, 24, 4);
            const peakDir = p.facing === 'left' ? -6 : 6;
            ctx.fillRect(px + peakDir, py - 18, 10, 4);
          }
        }

        // Render Equipped Gun pointing in their aiming direction
        if (!p.isDowned) {
          ctx.save();
          ctx.translate(px, py + 2); // Translate to player hand height
          
          const drawAngle = isSelf ? (aimAngleRef.current || 0) : (p.aimAngle || 0);
          ctx.rotate(drawAngle);

          // Mirror Y axis if aiming to the left so the gun is not upside down
          const isAimingLeft = Math.abs(drawAngle) > Math.PI / 2;
          if (isAimingLeft) {
            ctx.scale(1, -1);
          }

          const weaponName = p.weapon || 'plasma';

          // Outline styling
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;

          if (weaponName === 'scatter') {
            // Scatter Shotgun: Heavy dual orange barrels with brown stock
            ctx.fillStyle = '#451a03'; // Composite brown stock
            ctx.fillRect(2, -1, 8, 4);
            ctx.strokeRect(2, -1, 8, 4);

            ctx.fillStyle = '#f59e0b'; // Heavy dual barrels
            ctx.fillRect(10, -3, 22, 6);
            ctx.strokeRect(10, -3, 22, 6);

            // Double muzzle holes
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(30, -2, 2, 2);
            ctx.fillRect(30, 1, 2, 2);
          } else if (weaponName === 'assault') {
            // Pulse Rifle (Assault): Modern green body with scope
            ctx.fillStyle = '#15803d'; // Tactical Green
            ctx.fillRect(4, -3, 24, 6);
            ctx.strokeRect(4, -3, 24, 6);

            ctx.fillStyle = '#1e293b'; // Scope
            ctx.fillRect(12, -6, 8, 3);
            ctx.fillStyle = '#22c55e'; // Scope laser
            ctx.fillRect(17, -5, 2, 1);

            ctx.fillStyle = '#475569'; // Long metallic barrel
            ctx.fillRect(28, -1, 6, 2);
            ctx.strokeRect(28, -1, 6, 2);
          } else if (weaponName === 'rocket') {
            // Void Launcher: Massive heavy red rocket-launcher tube
            ctx.fillStyle = '#ef4444'; // Heavy red body
            ctx.fillRect(0, -6, 32, 11);
            ctx.strokeRect(0, -6, 32, 11);

            ctx.fillStyle = '#eab308'; // Danger hazard stripes
            ctx.fillRect(12, -6, 4, 11);
            ctx.fillRect(22, -6, 4, 11);

            ctx.fillStyle = '#0f172a'; // Exhaust vent
            ctx.fillRect(-4, -7, 4, 13);
          } else if (weaponName === 'beam') {
            // Thermal Laser (Beam): Sleek hot-pink emitter
            ctx.fillStyle = '#db2777'; // Pink body
            ctx.fillRect(6, -3, 20, 6);
            ctx.strokeRect(6, -3, 20, 6);

            ctx.fillStyle = '#f43f5e'; // Glowing crystal chamber
            ctx.fillRect(10, -1, 10, 4);

            ctx.fillStyle = '#ffffff'; // Focus lens
            ctx.fillRect(26, -2, 3, 4);
            ctx.strokeRect(26, -2, 3, 4);
          } else if (weaponName === 'railgun') {
            // Void Railgun: Long dual purple magnetic rails
            ctx.fillStyle = '#7e22ce'; // Purple dual rails
            ctx.fillRect(4, -4, 28, 3);
            ctx.strokeRect(4, -4, 28, 3);
            ctx.fillRect(4, 1, 28, 3);
            ctx.strokeRect(4, 1, 28, 3);

            ctx.fillStyle = '#c084fc'; // Sparking capacitor
            ctx.fillRect(8, -1, 12, 2);

            ctx.fillStyle = '#ffffff'; // Magnetic focus tip
            ctx.fillRect(32, -3, 3, 6);
            ctx.strokeRect(32, -3, 3, 6);
          } else {
            // Plasma Blaster (Pistol / default): Compact blue plasma blaster
            ctx.fillStyle = '#0f172a'; // Grip
            ctx.fillRect(8, 1, 4, 5);
            ctx.strokeRect(8, 1, 4, 5);

            ctx.fillStyle = '#38bdf8'; // Compact blue body
            ctx.fillRect(8, -2, 12, 5);
            ctx.strokeRect(8, -2, 12, 5);

            ctx.fillStyle = '#ffffff'; // Mini nozzle
            ctx.fillRect(20, -1, 2, 3);
            ctx.strokeRect(20, -1, 2, 3);
          }

          // Render active Muzzle Flash when firing
          if (p.isShooting) {
            const flashRadius = weaponName === 'rocket' ? 14 : weaponName === 'railgun' ? 12 : 8;
            const muzzleOffset = weaponName === 'rocket' ? 32 : weaponName === 'railgun' ? 35 : weaponName === 'assault' ? 34 : weaponName === 'scatter' ? 32 : 22;

            ctx.save();
            ctx.translate(muzzleOffset, 0);

            // Backing Glow
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;

            // Retro Star-shaped flash or circular burst
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, flashRadius / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(0, -flashRadius);
            ctx.lineTo(flashRadius / 3, -flashRadius / 3);
            ctx.lineTo(flashRadius, 0);
            ctx.lineTo(flashRadius / 3, flashRadius / 3);
            ctx.lineTo(0, flashRadius);
            ctx.lineTo(-flashRadius / 3, flashRadius / 3);
            ctx.lineTo(-flashRadius, 0);
            ctx.lineTo(-flashRadius / 3, -flashRadius / 3);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
          }

          ctx.restore();
        }

        // Username Tag with retro pixel font
        ctx.fillStyle = isSelf ? '#0ea5e9' : '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.font = 'bold 8px "Press Start 2P"';
        const nameWidth = ctx.measureText(p.username).width;
        ctx.fillRect(px - nameWidth / 2 - 6, py - 38, nameWidth + 12, 16);
        ctx.strokeRect(px - nameWidth / 2 - 6, py - 38, nameWidth + 12, 16);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(p.username, px, py - 26);

        // Downed Revive Prompt and Progress Meter
        if (p.isDowned) {
          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 8px "Press Start 2P"';
          ctx.fillText('DOWNED!', px, py + 26);

          // Render Revive Progress Bar
          const rp = p.reviveProgress || 0;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.fillRect(px - 20, py + 32, 40, 5);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(px - 20, py + 32, 40, 5);

          ctx.fillStyle = '#34d399';
          ctx.fillRect(px - 20, py + 32, (rp / 100) * 40, 5);

          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 6px monospace';
          ctx.fillText(`${Math.round(rp)}%`, px, py + 45);
        } else {
          // Render HP & Shield bars for active teammates
          const hpPercent = p.hp / p.maxHp;
          const shPercent = p.shield / p.maxShield;

          // Background box
          ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.fillRect(px - 16, py + 22, 32, 6);

          // HP Fill
          ctx.fillStyle = '#10b981';
          ctx.fillRect(px - 16, py + 22, hpPercent * 32, 3);

          // Shield Fill
          if (shPercent > 0) {
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(px - 16, py + 25, shPercent * 32, 3);
          }
        }

        // Chat Bubble
        if (p.lastChat && Date.now() - p.lastChat.timestamp < 5000) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.font = 'bold 11px sans-serif';
          const txtWidth = ctx.measureText(p.lastChat.text).width;
          ctx.fillRect(px - txtWidth / 2 - 8, py - 64, txtWidth + 16, 20);
          ctx.strokeRect(px - txtWidth / 2 - 8, py - 64, txtWidth + 16, 20);

          ctx.fillStyle = '#0f172a';
          ctx.fillText(p.lastChat.text, px, py - 50);
        }
      });

      // 9b. Render Particles (Server-side combat sparks)
      if (curState.particles) {
        curState.particles.forEach((part) => {
          ctx.save();
          ctx.translate(part.x, part.y);
          ctx.fillStyle = part.color;
          
          if (part.color === '#f43f5e' || part.color === '#fbbf24' || part.color === '#38bdf8' || part.color === '#cbd5e1' || part.color === '#a78bfa') {
            ctx.shadowColor = part.color;
            ctx.shadowBlur = part.radius * 2;
          }

          ctx.beginPath();
          const alpha = part.life / part.maxLife;
          ctx.globalAlpha = isNaN(alpha) ? 1 : Math.max(0, Math.min(1, alpha));
          
          ctx.arc(0, 0, part.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        ctx.globalAlpha = 1.0;
      }

      // Render Local client-side particles (Welding sparks, explosions, smokes, green heal sparkles)
      const localParticles = localParticlesRef.current;
      for (let i = localParticles.length - 1; i >= 0; i--) {
        const p = localParticles[i];
        p.life -= 0.03;
        if (p.life <= 0) {
          localParticles.splice(i, 1);
          continue;
        }

        p.x += p.vx * 0.03;
        p.y += p.vy * 0.03;
        if (p.gravity) {
          p.vy += p.gravity * 0.03;
        }

        ctx.save();
        ctx.fillStyle = p.color;
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = isNaN(alpha) ? 1 : Math.max(0, Math.min(1, alpha));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;

      // 10. Damage Text Floaters & Pings
      curState.damageTexts.forEach((dtObj) => {
        ctx.fillStyle = dtObj.color;
        ctx.font = dtObj.isCrit ? 'bold 16px monospace' : 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dtObj.text, dtObj.x, dtObj.y);
      });

      curState.pings.forEach((ping) => {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ping.x, ping.y, 20 + Math.sin(time * 8) * 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠ ${ping.senderName}: ${ping.type.toUpperCase()}`, ping.x, ping.y - 28);
      });

      // 10b. Update & Draw Cryo/Repair Pulses (Expanding canvas effects)
      for (let idx = pulsesRef.current.length - 1; idx >= 0; idx--) {
        const pulse = pulsesRef.current[idx];
        pulse.progress += 0.04; // Expand smoothly over 25 frames
        if (pulse.progress >= 1) {
          pulsesRef.current.splice(idx, 1);
          continue;
        }

        const radius = pulse.maxRange * pulse.progress;
        const opacity = 1 - pulse.progress;

        if (pulse.type === 'cryo') {
          // Inner expanding icy field glow
          const radialGlow = ctx.createRadialGradient(pulse.x, pulse.y, radius * 0.1, pulse.x, pulse.y, radius);
          radialGlow.addColorStop(0, 'rgba(34, 211, 238, 0)');
          radialGlow.addColorStop(0.7, `rgba(34, 211, 238, ${opacity * 0.12})`);
          radialGlow.addColorStop(1, `rgba(6, 182, 212, ${opacity * 0.35})`);

          ctx.fillStyle = radialGlow;
          ctx.beginPath();
          ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
          ctx.fill();

          // Icy ring border
          ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Frost crystals floating
          ctx.fillStyle = `rgba(14, 165, 233, ${opacity})`;
          ctx.font = 'bold 10px monospace';
          for (let deg = 0; deg < 360; deg += 45) {
            const rad = (deg * Math.PI) / 180;
            const fx = pulse.x + Math.cos(rad) * radius * 0.85;
            const fy = pulse.y + Math.sin(rad) * radius * 0.85;
            ctx.fillText('*', fx, fy);
          }
        } else if (pulse.type === 'repair') {
          // Nanite repairing ring
          const radialGlow = ctx.createRadialGradient(pulse.x, pulse.y, radius * 0.1, pulse.x, pulse.y, radius);
          radialGlow.addColorStop(0, 'rgba(52, 211, 153, 0)');
          radialGlow.addColorStop(0.7, `rgba(52, 211, 153, ${opacity * 0.08})`);
          radialGlow.addColorStop(1, `rgba(16, 185, 129, ${opacity * 0.28})`);

          ctx.fillStyle = radialGlow;
          ctx.beginPath();
          ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
          ctx.fill();

          // Nanite pulse ring border
          ctx.strokeStyle = `rgba(52, 211, 153, ${opacity})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Medical green plusses around the ring
          ctx.fillStyle = `rgba(16, 185, 129, ${opacity})`;
          ctx.font = 'bold 10px monospace';
          for (let deg = 22.5; deg < 360; deg += 90) {
            const rad = (deg * Math.PI) / 180;
            const fx = pulse.x + Math.cos(rad) * radius * 0.9;
            const fy = pulse.y + Math.sin(rad) * radius * 0.9;
            ctx.fillText('+', fx, fy);
          }
        }
      }

      // 11. Atmosphere Sky Tint Overlay
      if (curState.phase === 'warning') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.fillRect(-2000, -2000, 6400, 6400);
      } else if (curState.phase === 'defense') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
        ctx.fillRect(-2000, -2000, 6400, 6400);
      }

      ctx.restore();

      // 12. Full-Screen Screen Flash and Vignette overlays (VFX in screen coordinates)
      const lPlayer = curState.players[localPlayerId];
      if (lPlayer) {
        // Red flash when taking damage
        if (flashAlphaRef.current > 0.01) {
          ctx.save();
          ctx.fillStyle = `rgba(239, 68, 68, ${flashAlphaRef.current})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
          flashAlphaRef.current *= 0.88; // decay flash over frames
        }

        // Pulse red vignette if health is low (< 30)
        if (lPlayer.hp < 30 && lPlayer.hp > 0) {
          ctx.save();
          const pulseIntensity = 0.15 + Math.sin(Date.now() / 150) * 0.1;
          const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.7
          );
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
          gradient.addColorStop(1, `rgba(239, 68, 68, ${pulseIntensity})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [localPlayerId]);

  // Handle Canvas Click Interaction (Build Pads / Structures / Revives)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use posRef camera center so click aligns perfectly with rendered canvas
    const camX = posRef.current.x;
    const camY = posRef.current.y;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = clickX - canvas.width / 2 + camX;
    const worldY = clickY - canvas.height / 2 + camY;

    // Check Build Pad Click
    let clickedPad: BuildPad | null = null;
    state.buildPads.forEach((pad) => {
      const dist = Math.hypot(worldX - pad.x, worldY - pad.y);
      if (dist < Math.max(pad.radius + 28, 55)) {
        clickedPad = pad;
      }
    });

    if (clickedPad) {
      const pad = clickedPad as BuildPad;
      const existingStruct = state.structures.find((s) => s.padId === pad.id || s.id === pad.structureId) || null;
      soundManager.playChatMessage();
      onSelectPad(pad, existingStruct);
      return;
    }

    // Check Downed Player Click to Revive
    Object.values(state.players).forEach((p) => {
      if (p.isDowned && p.id !== localPlayerId) {
        const dist = Math.hypot(camX - p.x, camY - p.y);
        if (dist < 80) {
          soundManager.playRevive();
          onRevivePlayer(p.id);
        }
      }
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="block w-full h-full cursor-crosshair" />
    </div>
  );
};
