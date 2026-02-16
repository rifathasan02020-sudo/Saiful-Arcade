
import React, { useRef, useEffect, useCallback } from 'react';
import { GameProps } from '../../types';

const GalaxyRaidGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const state = useRef({
    player: { x: 0, y: 0, w: 48, h: 54, speed: 5 },
    bullets: [] as { x: number, y: number, w: number, h: number }[],
    enemies: [] as { x: number, y: number, w: number, h: number, speed: number, type: number }[],
    particles: [] as { x: number, y: number, vx: number, vy: number, life: number, color: string }[],
    stars: [] as { x: number, y: number, size: number, speed: number, opacity: number }[],
    score: 0,
    running: false,
    keys: { left: false, right: false },
    lastShot: 0,
    spawnTimer: 0
  });

  const requestRef = useRef<number>();

  // Initialize Audio Context
  useEffect(() => {
    if (!audioCtxRef.current) {
      // Fix: Pass empty options object to AudioContext constructor
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({});
    }
  }, []);

  // Initialize Stars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && state.current.stars.length === 0) {
      for (let i = 0; i < 50; i++) {
        state.current.stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 3 + 0.5,
          opacity: Math.random() * 0.5 + 0.1
        });
      }
    }
  }, []);

  const playSound = (type: 'shoot' | 'explode' | 'gameover') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'explode') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      // Increased Volume
      gain.gain.setValueAtTime(0.3, now); 
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'gameover') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 1);
      // Increased Volume
      gain.gain.setValueAtTime(0.6, now); 
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent, isDown: boolean) => {
      if (e.key === 'ArrowLeft') state.current.keys.left = isDown;
      if (e.key === 'ArrowRight') state.current.keys.right = isDown;
    };
    
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    
    state.current.running = isActive;

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [isActive]);

  const spawnExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      state.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1.0,
        color
      });
    }
  };

  const update = useCallback(() => {
    if (!state.current.running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const s = state.current;
    
    // Update Stars (Background)
    s.stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    // Player Movement
    if (s.keys.left && s.player.x > 0) s.player.x -= s.player.speed;
    if (s.keys.right && s.player.x < canvas.width - s.player.w) s.player.x += s.player.speed;

    // Auto Shooting
    const now = Date.now();
    if (now - s.lastShot > 250) {
      s.bullets.push({ 
        x: s.player.x + 4, 
        y: s.player.y + 10,
        w: 4, h: 15
      });
      s.bullets.push({ 
        x: s.player.x + s.player.w - 8, 
        y: s.player.y + 10,
        w: 4, h: 15
      });
      s.lastShot = now;
    }

    // Update Bullets
    for (let i = s.bullets.length - 1; i >= 0; i--) {
      s.bullets[i].y -= 12;
      if (s.bullets[i].y < -20) s.bullets.splice(i, 1);
    }

    // Update Particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) s.particles.splice(i, 1);
    }

    // Spawn Enemies
    s.spawnTimer++;
    if (s.spawnTimer > 50) {
      const size = 40;
      s.enemies.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        w: size,
        h: size,
        speed: 3 + Math.random() * 2,
        type: Math.floor(Math.random() * 2)
      });
      s.spawnTimer = 0;
    }

    // Update Enemies & Collision
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      e.y += e.speed;

      const px = s.player.x + 5;
      const py = s.player.y + 5;
      const pw = s.player.w - 10;
      const ph = s.player.h - 10;

      if (
        px < e.x + e.w &&
        px + pw > e.x &&
        py < e.y + e.h &&
        py + ph > e.y
      ) {
        playSound('gameover');
        spawnExplosion(s.player.x + s.player.w/2, s.player.y + s.player.h/2, '#22d3ee');
        s.running = false;
        onGameOver(s.score);
        return;
      }

      let hit = false;
      for (let j = s.bullets.length - 1; j >= 0; j--) {
        const b = s.bullets[j];
        if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
          s.bullets.splice(j, 1);
          hit = true;
          s.score += 1;
          playSound('explode');
          spawnExplosion(e.x + e.w/2, e.y + e.h/2, '#ef4444');
          onScoreUpdate(s.score);
          break;
        }
      }

      if (hit) {
        s.enemies.splice(i, 1);
        continue;
      }

      if (e.y > canvas.height) {
        s.enemies.splice(i, 1);
      }
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [onGameOver, onScoreUpdate]);

  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    
    ctx.beginPath();
    ctx.moveTo(10, h - 5);
    ctx.lineTo(15, h + 5);
    ctx.lineTo(20, h - 5);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(w - 20, h - 5);
    ctx.lineTo(w - 15, h + 5);
    ctx.lineTo(w - 10, h - 5);
    ctx.fill();

    ctx.shadowBlur = 0;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(0.5, '#0ea5e9');
    grad.addColorStop(1, '#0369a1');

    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 + 5, 15);
    ctx.lineTo(w, h - 15);
    ctx.lineTo(w - 5, h);
    ctx.lineTo(w / 2 + 8, h - 10);
    ctx.lineTo(w / 2, h - 5);
    ctx.lineTo(w / 2 - 8, h - 10);
    ctx.lineTo(5, h);
    ctx.lineTo(0, h - 15);
    ctx.lineTo(w / 2 - 5, 15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(w / 2, 20, 3, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: number) => {
    ctx.save();
    ctx.translate(x, y);

    const color = type === 0 ? '#ef4444' : '#f97316';
    const darkColor = type === 0 ? '#7f1d1d' : '#7c2d12';

    ctx.fillStyle = color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    if (type === 0) {
      ctx.beginPath();
      ctx.moveTo(w/2, h);
      ctx.lineTo(w, 0);
      ctx.lineTo(w/2, h/3);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(w/2, h/3, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(w/2, h);
      ctx.lineTo(w, h/2);
      ctx.lineTo(w - 5, 0);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, h/2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(w/2, 0);
      ctx.lineTo(w/2, h);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Stars (Smooth background)
    state.current.stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    const s = state.current;

    drawPlayer(ctx, s.player.x, s.player.y, s.player.w, s.player.h);

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#facc15';
    ctx.fillStyle = '#facc15';
    s.bullets.forEach(b => {
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    s.enemies.forEach(e => {
        drawEnemy(ctx, e.x, e.y, e.w, e.h, e.type);
    });

    s.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        state.current.player.x = canvas.width / 2 - state.current.player.w / 2;
        state.current.player.y = canvas.height - state.current.player.h - 20;
      }
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
        if(requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [update]);

  const handleMove = useCallback((clientX: number) => {
      const canvas = canvasRef.current;
      if(!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      
      let newX = x - state.current.player.w / 2;
      
      if (newX < 0) newX = 0;
      if (newX > canvas.width - state.current.player.w) newX = canvas.width - state.current.player.w;
      
      state.current.player.x = newX;
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientX);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
      handleMove(e.clientX);
  };

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block touch-none cursor-crosshair"
      onTouchMove={handleTouchMove}
      onMouseMove={handleMouseMove}
    />
  );
};

export default GalaxyRaidGame;
