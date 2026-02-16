import React, { useRef, useEffect, useCallback } from 'react';
import { GameProps } from '../../types';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const NeonBreakerGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Callbacks refs
  const onGameOverRef = useRef(onGameOver);
  const onScoreUpdateRef = useRef(onScoreUpdate);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onGameOver, onScoreUpdate]);

  const state = useRef({
    ball: { x: 0, y: 0, vx: 0, vy: 0, radius: 5 } as Ball,
    paddle: { x: 0, y: 0, w: 80, h: 10 },
    bricks: [] as Brick[],
    particles: [] as Particle[],
    score: 0,
    running: false,
    keys: { left: false, right: false }
  });

  const requestRef = useRef<number>();

  useEffect(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playSound = (type: 'paddle' | 'brick' | 'loss') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;

    if (type === 'brick') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'paddle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  };

  const initGame = (canvas: HTMLCanvasElement) => {
    const s = state.current;
    s.score = 0; // Explicitly set to 0
    onScoreUpdateRef.current(0); // Ensure UI matches
    
    // Paddle
    s.paddle.w = canvas.width < 500 ? 80 : 120;
    s.paddle.x = (canvas.width - s.paddle.w) / 2;
    s.paddle.y = canvas.height - 30;

    // Ball
    s.ball.x = canvas.width / 2;
    s.ball.y = s.paddle.y - 20;
    s.ball.vx = 4 * (Math.random() > 0.5 ? 1 : -1);
    s.ball.vy = -4;

    // Bricks
    s.bricks = [];
    const rows = 5;
    const cols = canvas.width < 500 ? 6 : 8;
    const padding = 10;
    const brickW = (canvas.width - (cols + 1) * padding) / cols;
    const brickH = 20;
    
    const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#22d3ee'];

    for(let r = 0; r < rows; r++) {
      for(let c = 0; c < cols; c++) {
        s.bricks.push({
          x: padding + c * (brickW + padding),
          y: padding + r * (brickH + padding) + 40,
          w: brickW,
          h: brickH,
          color: colors[r % colors.length],
          active: true
        });
      }
    }
    
    s.running = true;
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    // Limit total particles to prevent lag
    if (state.current.particles.length > 50) return;

    for(let i=0; i<4; i++) {
        state.current.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1.0,
            color
        });
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const s = state.current;

    // Paddle
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(s.paddle.x, s.paddle.y, s.paddle.w, s.paddle.h);

    // Ball
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, s.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Bricks
    s.bricks.forEach(b => {
        if (!b.active) return;
        ctx.shadowBlur = 10;
        ctx.shadowColor = b.color;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    ctx.shadowBlur = 0;

    // Particles
    s.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
  }, []);

  const update = useCallback(() => {
    if (!state.current.running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const s = state.current;

    // Paddle Move
    if (s.keys.left) s.paddle.x -= 7;
    if (s.keys.right) s.paddle.x += 7;
    s.paddle.x = Math.max(0, Math.min(canvas.width - s.paddle.w, s.paddle.x));

    // Ball Move
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    // Walls
    if (s.ball.x < s.ball.radius || s.ball.x > canvas.width - s.ball.radius) {
        s.ball.vx *= -1;
    }
    if (s.ball.y < s.ball.radius) {
        s.ball.vy *= -1;
    }
    if (s.ball.y > canvas.height) {
        playSound('loss');
        s.running = false;
        // Ensure not NaN
        onGameOverRef.current(s.score || 0);
        return;
    }

    // Paddle Collision
    if (s.ball.y + s.ball.radius >= s.paddle.y &&
        s.ball.y - s.ball.radius <= s.paddle.y + s.paddle.h &&
        s.ball.x >= s.paddle.x &&
        s.ball.x <= s.paddle.x + s.paddle.w) {
        
        if (s.ball.vy > 0) {
            playSound('paddle');
            s.ball.vy *= -1.05; // Speed up slightly
            // Add english
            const hitPoint = s.ball.x - (s.paddle.x + s.paddle.w/2);
            s.ball.vx = hitPoint * 0.15;
        }
    }

    // Brick Collision
    let activeBricks = 0;
    let scoreChanged = false;
    
    for (const b of s.bricks) {
        if (!b.active) continue;
        activeBricks++;

        if (s.ball.x > b.x && s.ball.x < b.x + b.w &&
            s.ball.y > b.y && s.ball.y < b.y + b.h) {
                b.active = false;
                s.ball.vy *= -1;
                playSound('brick');
                spawnParticles(s.ball.x, s.ball.y, b.color);
                
                // Add Score safely
                if (typeof s.score !== 'number' || isNaN(s.score)) s.score = 0;
                s.score += 10;
                scoreChanged = true;
        }
    }

    if (activeBricks === 0) {
        // Respawn bricks if all cleared
        initGame(canvas);
        s.score += 50; 
        scoreChanged = true;
    }

    // Batch score update: Only call React update if score changed this frame
    if (scoreChanged) {
        onScoreUpdateRef.current(s.score);
    }

    // Particles
    for(let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) s.particles.splice(i, 1);
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [draw]);

  useEffect(() => {
    // Inputs
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        state.current.paddle.x = x - state.current.paddle.w/2;
    };

    const onMouseMove = (e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        state.current.paddle.x = x - state.current.paddle.w/2;
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') state.current.keys.left = true;
        if (e.key === 'ArrowRight') state.current.keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') state.current.keys.left = false;
        if (e.key === 'ArrowRight') state.current.keys.right = false;
    };

    const canvas = canvasRef.current;
    if (canvas) {
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('mousemove', onMouseMove);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Resize & Init
        const resize = () => {
             const parent = canvas.parentElement;
             if (parent) {
                 canvas.width = parent.clientWidth;
                 canvas.height = parent.clientHeight;
                 if (!state.current.running) initGame(canvas);
             }
        };
        resize();
        window.addEventListener('resize', resize);
        
        requestRef.current = requestAnimationFrame(update);

        return () => {
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('resize', resize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }
  }, [update]);

  return <canvas ref={canvasRef} className="w-full h-full block touch-none cursor-none" />;
};

export default NeonBreakerGame;