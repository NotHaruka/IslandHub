import React, { useEffect, useRef } from 'react';
import { VoidHordeState, PlayerEntity } from '../types/voidHorde';
import { soundManager } from '../audio/soundManager';

interface Props {
  vhState: VoidHordeState;
  localPlayerId: string;
  onSendInput: (x: number, y: number, vx: number, vy: number, shooting: boolean, aimAngle: number) => void;
  keysPressed: Record<string, boolean>;
  joystickVel: { x: number; y: number };
  touchShooting?: boolean;
}

export const VoidHordeCanvas: React.FC<Props> = ({
  vhState,
  localPlayerId,
  onSendInput,
  keysPressed,
  joystickVel,
  touchShooting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<{ x: number; y: number }>({ x: 1000, y: 1000 });
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);
  const shakeRef = useRef(0);

  // Track Mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseDown = () => {
      isMouseDownRef.current = true;
    };
    const handleMouseUp = () => {
      isMouseDownRef.current = false;
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

  const vhStateRef = useRef(vhState);
  vhStateRef.current = vhState;

  const onSendInputRef = useRef(onSendInput);
  onSendInputRef.current = onSendInput;

  const keysPressedRef = useRef(keysPressed);
  keysPressedRef.current = keysPressed;

  const joystickVelRef = useRef(joystickVel);
  joystickVelRef.current = joystickVel;

  const touchShootingRef = useRef(touchShooting);
  touchShootingRef.current = touchShooting;

  // Update Input & Position Loop (Smooth 60FPS local physics + 30Hz network sync)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastNetSendTime = 0;
    let lastSoundTime = 0;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const keys = keysPressedRef.current;
      const jVel = joystickVelRef.current;
      const tShooting = touchShootingRef.current;
      const state = vhStateRef.current;

      const p = state.players[localPlayerId];
      if (p && p.isAlive) {
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

        const speed = 250;
        if (dx !== 0 || dy !== 0) {
          const len = Math.sqrt(dx * dx + dy * dy);
          const normX = dx / (len > 1 ? len : 1);
          const normY = dy / (len > 1 ? len : 1);

          posRef.current.x = Math.max(60, Math.min(1940, posRef.current.x + normX * speed * dt));
          posRef.current.y = Math.max(60, Math.min(1940, posRef.current.y + normY * speed * dt));
        }

        // Calculate aim angle
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const aimAngle = Math.atan2(
          mousePosRef.current.y - screenCenterY,
          mousePosRef.current.x - screenCenterX
        );

        const shooting = isMouseDownRef.current || !!tShooting;

        if (shooting && time - lastSoundTime > 160) {
          lastSoundTime = time;
          if (p.weapon === 'scatter') soundManager.playScatterBlast();
          else if (p.weapon === 'railgun') soundManager.playRailgun();
          else soundManager.playPlasmaShot();
        }

        if (time - lastNetSendTime > 33 || shooting) {
          lastNetSendTime = time;
          onSendInputRef.current(posRef.current.x, posRef.current.y, dx * speed, dy * speed, shooting, aimAngle);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [localPlayerId]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.03;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const p = vhState.players[localPlayerId];
      const camX = p ? p.x : posRef.current.x;
      const camY = p ? p.y : posRef.current.y;

      ctx.save();

      // Camera shake
      let shakeX = 0;
      let shakeY = 0;
      if (shakeRef.current > 0) {
        shakeX = (Math.random() - 0.5) * shakeRef.current;
        shakeY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current = Math.max(0, shakeRef.current - 0.5);
      }

      ctx.translate(canvas.width / 2 - camX + shakeX, canvas.height / 2 - camY + shakeY);

      // 1. Dark Sci-Fi Arena Background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, 2000, 2000);

      // Metallic Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 2000; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 2000);
        ctx.stroke();
      }
      for (let y = 0; y <= 2000; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2000, y);
        ctx.stroke();
      }

      // Outer Arena Energy Barrier Wall
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, 1980, 1980);

      // 2. Render Central Core
      const core = vhState.core;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(core.x, core.y, core.radius, 0, Math.PI * 2);
      ctx.fill();

      // Core Shield Ring
      if (core.shield > 0) {
        const shieldGrad = ctx.createRadialGradient(core.x, core.y, core.radius, core.x, core.y, core.radius + 18);
        shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
        shieldGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shieldGrad;
        ctx.beginPath();
        ctx.arc(core.x, core.y, core.radius + 18 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core Glowing Orb
      ctx.fillStyle = '#f0f9ff';
      ctx.beginPath();
      ctx.arc(core.x, core.y, 20 + Math.sin(time * 5) * 4, 0, Math.PI * 2);
      ctx.fill();

      // 3. Render Enemies
      vhState.enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // Body Shape based on type
        ctx.fillStyle = enemy.color;
        if (enemy.isBoss) {
          // Boss Void Overlord
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Spikes
          for (let a = 0; a < 8; a++) {
            const ang = a * (Math.PI / 4) + time;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * (enemy.radius + 8), Math.sin(ang) * (enemy.radius + 8), 8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (enemy.type === 'commander') {
          // Aura
          ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius + 30, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (enemy.type === 'tank') {
          ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // HP Bar above enemy
        if (enemy.hp < enemy.maxHp) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-20, -enemy.radius - 12, 40, 5);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-20, -enemy.radius - 12, (enemy.hp / enemy.maxHp) * 40, 5);
        }

        ctx.restore();
      });

      // 4. Render Projectiles
      vhState.projectiles.forEach((proj) => {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();

        // Beam / Tail
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = proj.radius * 1.5;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        ctx.lineTo(proj.x - proj.vx * 0.05, proj.y - proj.vy * 0.05);
        ctx.stroke();
      });

      // 5. Render Players
      (Object.values(vhState.players) as PlayerEntity[]).forEach((player) => {
        if (!player.isAlive) return;

        ctx.save();
        ctx.translate(player.x, player.y);

        // Body
        ctx.fillStyle = player.color || '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting Turret
        if (player.turretUnlocked) {
          const tx = Math.cos(player.turretAngle || 0) * 35;
          const ty = Math.sin(player.turretAngle || 0) * 35;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(tx, ty, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Username & Health Bar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.username, 0, -28);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-20, -24, 40, 4);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-20, -24, (player.hp / player.maxHp) * 40, 4);

        ctx.restore();
      });

      // 6. Particles
      vhState.particles.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius * (pt.life / pt.maxLife), 0, Math.PI * 2);
        ctx.fill();
      });

      // 7. Damage Floating Texts
      vhState.damageTexts.forEach((dtObj) => {
        ctx.fillStyle = dtObj.color;
        ctx.font = dtObj.isCrit ? 'bold 16px sans-serif' : 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dtObj.text, dtObj.x, dtObj.y);
      });

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [vhState, localPlayerId]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 cursor-crosshair">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
