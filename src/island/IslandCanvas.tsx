import React, { useEffect, useRef } from 'react';
import { IslandDefenseState, BuildPad, DefensiveStructure } from '../types/voidHorde';
import { IslandPlayer } from '../types/island';
import { soundManager } from '../audio/soundManager';

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<{ x: number; y: number; facing: IslandPlayer['facing'] }>({
    x: 1200,
    y: 1200,
    facing: 'down',
  });

  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);

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

      let dx = 0;
      let dy = 0;

      if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

      if (jVel.x !== 0 || jVel.y !== 0) {
        dx = jVel.x;
        dy = jVel.y;
      }

      const speed = 250; // px/sec smooth movement
      if (dx !== 0 || dy !== 0) {
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

      const isShooting = isMouseDownRef.current || touchShootingRef.current;

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

      const camX = posRef.current.x;
      const camY = posRef.current.y;

      ctx.save();
      // Center Camera on local player
      ctx.translate(canvas.width / 2 - camX, canvas.height / 2 - camY);

      // 1. Ocean Water & Shoreline
      ctx.fillStyle = '#0284c7'; // Deep ocean blue
      ctx.fillRect(-2000, -2000, 6400, 6400);

      // Smooth Ocean Waves
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.beginPath();
      ctx.roundRect(-500, -500, 3400, 3400, 100);
      ctx.fill();

      // Sand Shoreline
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.roundRect(100, 100, 2200, 2200, 180);
      ctx.fill();

      // 2. Main Island Mass (Emerald Grass)
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(140, 140, 2120, 2120, 160);
      ctx.fill();

      // Cobblestone Main Pathways (Connecting North, East, South, West to Core)
      ctx.fillStyle = '#d97706'; // Cobblestone sand paths
      ctx.beginPath();
      // North-South Path
      ctx.roundRect(1110, 200, 180, 2000, 40);
      // East-West Path
      ctx.roundRect(200, 1110, 2000, 180, 40);
      ctx.fill();

      // 3. Central Plaza & Island Core
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(1200, 1200, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Core Outer Shield Barrier Dome Ring
      if (curState.core.shield > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(1200, 1200, 215 + Math.sin(time * 3) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Core Pedestal & Crystal
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(1200, 1200, 65, 0, Math.PI * 2);
      ctx.fill();

      const crystalGrad = ctx.createRadialGradient(1200, 1200, 10, 1200, 1200, 60 + Math.sin(time * 4) * 8);
      crystalGrad.addColorStop(0, '#38bdf8');
      crystalGrad.addColorStop(0.6, '#0284c7');
      crystalGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = crystalGrad;
      ctx.beginPath();
      ctx.arc(1200, 1200, 60 + Math.sin(time * 4) * 8, 0, Math.PI * 2);
      ctx.fill();

      // 4. Breach Portals at Map Perimeters
      curState.activeBreaches.forEach((breach) => {
        // Portal Ring
        ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.beginPath();
        ctx.arc(breach.x, breach.y, 65 + Math.sin(time * 5) * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(breach.x, breach.y, 35, 0, Math.PI * 2);
        ctx.fill();

        // Warning Direction Light Beam during Active Wave
        if (curState.phase === 'defense' || curState.phase === 'warning') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(breach.x, breach.y);
          ctx.lineTo(1200, 1200);
          ctx.stroke();
        }
      });

      // 5. Build Pads & Defensive Structures
      curState.buildPads.forEach((pad) => {
        const builtStruct = curState.structures.find((s) => s.id === pad.structureId);

        if (builtStruct) {
          // Render Built Defensive Structure
          ctx.fillStyle = builtStruct.color;
          ctx.beginPath();
          ctx.arc(builtStruct.x, builtStruct.y, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Turret Head / Range Outline
          if (builtStruct.type === 'slow_field' || builtStruct.type === 'shield_generator') {
            ctx.strokeStyle = `${builtStruct.color}40`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(builtStruct.x, builtStruct.y, builtStruct.range, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Level Badge Tag
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`LV${builtStruct.level}`, builtStruct.x, builtStruct.y + 4);

          // Structure Health Bar
          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(builtStruct.x - 20, builtStruct.y - 32, 40, 6);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(builtStruct.x - 20, builtStruct.y - 32, (builtStruct.hp / builtStruct.maxHp) * 40, 6);
        } else {
          // Unbuilt Pad Pad Glow
          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.beginPath();
          ctx.arc(pad.x, pad.y, pad.radius + Math.sin(time * 3) * 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('[ BUILD ]', pad.x, pad.y + 3);
        }
      });

      // 6. Resource Drops on Field
      curState.resourceDrops.forEach((res) => {
        const glow = Math.sin(time * 6 + res.x) * 3;
        ctx.fillStyle = res.type === 'energy' ? '#38bdf8' : '#facc15';
        ctx.beginPath();
        ctx.arc(res.x, res.y, 8 + glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(res.type === 'energy' ? 'NRG' : 'SCRAP', res.x, res.y - 12);
      });

      // 7. Render Void Horde Enemies
      curState.enemies.forEach((enemy) => {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        if (enemy.isBoss) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 5;
          ctx.stroke();
        }

        // Enemy HP Bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(enemy.x - 18, enemy.y - enemy.radius - 12, 36, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(enemy.x - 18, enemy.y - enemy.radius - 12, (enemy.hp / enemy.maxHp) * 36, 5);
      });

      // 8. Render Projectiles
      curState.projectiles.forEach((proj) => {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 9. Render All Players
      Object.values(curState.players).forEach((p) => {
        const isSelf = p.id === localPlayerId;
        const px = isSelf ? posRef.current.x : p.x;
        const py = isSelf ? posRef.current.y : p.y;

        // Player Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(px, py + 14, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = p.isDowned ? '#94a3b8' : p.avatar?.bodyColor || '#3b82f6';
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = p.avatar?.skin === 'cyber' ? '#38bdf8' : p.avatar?.skin === 'alien' ? '#84cc16' : '#fde047';
        ctx.beginPath();
        ctx.arc(px, py - 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Username Tag
        ctx.fillStyle = isSelf ? 'rgba(14, 165, 233, 0.9)' : 'rgba(15, 23, 42, 0.85)';
        ctx.font = 'bold 11px sans-serif';
        const nameWidth = ctx.measureText(p.username).width;
        ctx.beginPath();
        ctx.roundRect(px - nameWidth / 2 - 6, py - 36, nameWidth + 12, 18, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(p.username, px, py - 23);

        // Downed Revive Prompt
        if (p.isDowned) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('DOWNED! REVIVE NEARBY', px, py + 32);
        }

        // Chat Bubble
        if (p.lastChat && Date.now() - p.lastChat.timestamp < 5000) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.font = '12px sans-serif';
          const txtWidth = ctx.measureText(p.lastChat.text).width;
          ctx.beginPath();
          ctx.roundRect(px - txtWidth / 2 - 8, py - 62, txtWidth + 16, 22, 8);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.fillText(p.lastChat.text, px, py - 47);
        }
      });

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

      // 11. Atmosphere Sky Tint Overlay
      if (curState.phase === 'warning') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.fillRect(-2000, -2000, 6400, 6400);
      } else if (curState.phase === 'defense') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
        ctx.fillRect(-2000, -2000, 6400, 6400);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [localPlayerId]);

  // Handle Canvas Click Interaction (Build Pads / Structures / Revives)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const localP = state.players[localPlayerId];
    const px = localP ? localP.x : posRef.current.x;
    const py = localP ? localP.y : posRef.current.y;

    const worldX = e.clientX - canvas.width / 2 + px;
    const worldY = e.clientY - canvas.height / 2 + py;

    // Check Build Pad Click
    let clickedPad: BuildPad | null = null;
    state.buildPads.forEach((pad) => {
      const dist = Math.hypot(worldX - pad.x, worldY - pad.y);
      if (dist < pad.radius + 15) {
        clickedPad = pad;
      }
    });

    if (clickedPad) {
      const pad = clickedPad as BuildPad;
      const existingStruct = state.structures.find((s) => s.id === pad.structureId) || null;
      soundManager.playChatMessage();
      onSelectPad(pad, existingStruct);
      return;
    }

    // Check Downed Player Click to Revive
    Object.values(state.players).forEach((p) => {
      if (p.isDowned && p.id !== localPlayerId) {
        const dist = Math.hypot(px - p.x, py - p.y);
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
