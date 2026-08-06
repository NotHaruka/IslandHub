import React, { useEffect, useRef } from 'react';
import { IslandPlayer } from '../types/island';

interface Props {
  localPlayerId: string;
  players: IslandPlayer[];
  onInteractPortal: () => void;
  onMoveInput: (x: number, y: number, vx: number, vy: number, facing: IslandPlayer['facing']) => void;
  keysPressed: Record<string, boolean>;
  joystickVel: { x: number; y: number };
}

export const IslandCanvas: React.FC<Props> = ({
  localPlayerId,
  players,
  onInteractPortal,
  onMoveInput,
  keysPressed,
  joystickVel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<{ x: number; y: number; facing: IslandPlayer['facing'] }>({
    x: 700,
    y: 600,
    facing: 'down',
  });

  // Keep refs for latest props/states to avoid tearing down loop on every frame or keypress
  const keysPressedRef = useRef(keysPressed);
  keysPressedRef.current = keysPressed;

  const joystickVelRef = useRef(joystickVel);
  joystickVelRef.current = joystickVel;

  const onMoveInputRef = useRef(onMoveInput);
  onMoveInputRef.current = onMoveInput;

  const onInteractPortalRef = useRef(onInteractPortal);
  onInteractPortalRef.current = onInteractPortal;

  // Local movement update loop (60 FPS local movement + 30Hz network sync)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastNetSendTime = 0;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const keys = keysPressedRef.current;
      const jVel = joystickVelRef.current;

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

      const speed = 240; // px/sec smooth movement
      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        const normX = dx / (len > 1 ? len : 1);
        const normY = dy / (len > 1 ? len : 1);

        let nextX = posRef.current.x + normX * speed * dt;
        let nextY = posRef.current.y + normY * speed * dt;

        // Map bounds (Island boundary)
        nextX = Math.max(120, Math.min(1280, nextX));
        nextY = Math.max(120, Math.min(1080, nextY));

        let facing: IslandPlayer['facing'] = posRef.current.facing;
        if (Math.abs(normX) > Math.abs(normY)) {
          facing = normX > 0 ? 'right' : 'left';
        } else if (Math.abs(normY) > 0) {
          facing = normY > 0 ? 'down' : 'up';
        }

        posRef.current = { x: nextX, y: nextY, facing };

        // Send network updates at ~30Hz (every ~33ms) to prevent network buffer overflow
        if (time - lastNetSendTime > 33) {
          lastNetSendTime = time;
          onMoveInputRef.current(nextX, nextY, normX * speed, normY * speed, facing);
        }

        // Check Arcade Portal Proximity (Arcade Portal at x: 700, y: 220)
        const portalDist = Math.hypot(nextX - 700, nextY - 220);
        if (portalDist < 70 && (keys['KeyE'] || keys['Space'])) {
          onInteractPortalRef.current();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Main Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Ambient Particles
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * 1400,
      y: Math.random() * 1200,
      radius: Math.random() * 2.5 + 1,
      speed: Math.random() * 20 + 10,
      alpha: Math.random() * 0.7 + 0.3,
    }));

    const render = () => {
      time += 0.03;

      // Resize canvas to match window
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const localP = players.find((p) => p.id === localPlayerId);
      const camX = localP ? localP.x : posRef.current.x;
      const camY = localP ? localP.y : posRef.current.y;

      ctx.save();
      // Center camera on player
      ctx.translate(canvas.width / 2 - camX, canvas.height / 2 - camY);

      // 1. Draw Island Ocean & Sky Background
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-2000, -2000, 5000, 5000);

      // Smooth subtle ocean water texture (static calm water)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      ctx.roundRect(-800, -800, 3000, 2600, 80);
      ctx.fill();

      // 2. Main Island Mass
      ctx.fillStyle = '#10b981'; // Island grass
      ctx.beginPath();
      ctx.roundRect(100, 100, 1200, 1000, 120);
      ctx.fill();

      // Sand shoreline border
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 18;
      ctx.stroke();

      // Path / Cobblestone Walkways
      ctx.fillStyle = '#d97706'; // Sand path
      ctx.beginPath();
      ctx.roundRect(620, 200, 160, 800, 30); // North-South Main Ave
      ctx.roundRect(300, 520, 800, 160, 30); // East-West Ave
      ctx.fill();

      // 3. Central Plaza
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(700, 600, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Central Fountain / Crystal Pedestal
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(700, 600, 35, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Crystal Pulse
      const crystalGrad = ctx.createRadialGradient(700, 600, 5, 700, 600, 28 + Math.sin(time * 3) * 6);
      crystalGrad.addColorStop(0, '#38bdf8');
      crystalGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = crystalGrad;
      ctx.beginPath();
      ctx.arc(700, 600, 35 + Math.sin(time * 3) * 6, 0, Math.PI * 2);
      ctx.fill();

      // 4. Game Hall / Void Horde Portal Building (NORTH)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(540, 120, 320, 180, 24);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Neon Portal Ring
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(700, 220, 48, 0, Math.PI * 2);
      ctx.fill();

      const portalGrad = ctx.createRadialGradient(700, 220, 10, 700, 220, 48);
      portalGrad.addColorStop(0, '#a855f7');
      portalGrad.addColorStop(0.5, '#38bdf8');
      portalGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = portalGrad;
      ctx.beginPath();
      ctx.arc(700, 220, 52 + Math.sin(time * 4) * 4, 0, Math.PI * 2);
      ctx.fill();

      // Portal Neon Sign
      ctx.fillStyle = '#f0f9ff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[ GAME ARCADE ]', 700, 155);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px sans-serif';
      ctx.fillText('VOID HORDE PORTAL', 700, 175);

      // Check distance for portal interact prompt
      const pDist = Math.hypot(camX - 700, camY - 220);
      if (pDist < 80) {
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('Press E or Tap to Enter Game Hub', 700, 290);
      }

      // 5. West Section: Campfire & Chill Lounge
      ctx.fillStyle = '#78350f'; // Campfire stones
      ctx.beginPath();
      ctx.arc(380, 600, 25, 0, Math.PI * 2);
      ctx.fill();

      // Flame particles
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(380 + Math.sin(time * 8) * 3, 600 - Math.cos(time * 6) * 6, 12, 0, Math.PI * 2);
      ctx.fill();

      // Benches around fire
      ctx.fillStyle = '#b45309';
      ctx.fillRect(320, 590, 30, 20);
      ctx.fillRect(410, 590, 30, 20);

      // 6. Trees & Decorative Scenery
      const trees = [
        { x: 220, y: 220 },
        { x: 300, y: 350 },
        { x: 1100, y: 220 },
        { x: 1180, y: 380 },
        { x: 220, y: 880 },
        { x: 380, y: 950 },
        { x: 1100, y: 880 },
        { x: 950, y: 950 },
      ];

      trees.forEach((tree) => {
        // Tree trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(tree.x - 6, tree.y, 12, 18);
        // Foliage
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(tree.x, tree.y - 12 + Math.sin(time + tree.x) * 2, 28, 0, Math.PI * 2);
        ctx.fill();
      });

      // 7. Draw All Players
      players.forEach((p) => {
        const isSelf = p.id === localPlayerId;
        const px = isSelf ? posRef.current.x : p.x;
        const py = isSelf ? posRef.current.y : p.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(px, py + 14, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = p.avatar?.bodyColor || '#3b82f6';
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.fill();

        // Skin Tone
        ctx.fillStyle = p.avatar?.skin === 'cyber' ? '#38bdf8' : p.avatar?.skin === 'alien' ? '#84cc16' : '#fde047';
        ctx.beginPath();
        ctx.arc(px, py - 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes based on facing
        ctx.fillStyle = '#0f172a';
        let ex1 = px - 3,
          ey1 = py - 3,
          ex2 = px + 3,
          ey2 = py - 3;
        if (p.facing === 'left') {
          ex1 = px - 6;
          ex2 = px - 2;
        } else if (p.facing === 'right') {
          ex1 = px + 2;
          ex2 = px + 6;
        } else if (p.facing === 'up') {
          ey1 = py - 5;
          ey2 = py - 5;
        }
        ctx.beginPath();
        ctx.arc(ex1, ey1, 2, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Hat
        if (p.avatar?.hat === 'crown') {
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(px - 8, py - 10);
          ctx.lineTo(px - 8, py - 18);
          ctx.lineTo(px, py - 20);
          ctx.lineTo(px + 8, py - 18);
          ctx.lineTo(px + 8, py - 10);
          ctx.fill();
        } else if (p.avatar?.hat === 'visor') {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(px - 10, py - 5, 20, 5);
        }

        // Username Tag
        ctx.fillStyle = isSelf ? 'rgba(14, 165, 233, 0.85)' : 'rgba(15, 23, 42, 0.85)';
        ctx.font = 'bold 12px sans-serif';
        const nameWidth = ctx.measureText(p.username).width;
        ctx.beginPath();
        ctx.roundRect(px - nameWidth / 2 - 6, py - 36, nameWidth + 12, 18, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(p.username, px, py - 23);

        // Chat Bubble
        if (p.lastChat && Date.now() - p.lastChat.timestamp < 6000) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.font = '12px sans-serif';
          const txtWidth = ctx.measureText(p.lastChat.text).width;
          ctx.beginPath();
          ctx.roundRect(px - txtWidth / 2 - 8, py - 62, txtWidth + 16, 22, 8);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.fillText(p.lastChat.text, px, py - 47);
        }

        // Emote Bubble
        if (p.currentEmote && Date.now() - p.currentEmote.timestamp < 4000) {
          const floatY = py - 70 + Math.sin(time * 6) * 4;
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(px - 32, floatY - 12, 64, 22, 10);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.currentEmote.symbol, px, floatY + 3);
        }
      });

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [localPlayerId, players]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check if player is near portal OR clicked in top area (portal location)
    const localP = players.find((p) => p.id === localPlayerId);
    const px = localP ? localP.x : posRef.current.x;
    const py = localP ? localP.y : posRef.current.y;
    const portalDist = Math.hypot(px - 700, py - 220);

    // If nearby or clicked anywhere in upper screen, enter portal
    if (portalDist < 180 || e.clientY < window.innerHeight * 0.4) {
      onInteractPortal();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="block w-full h-full cursor-pointer" />
    </div>
  );
};
