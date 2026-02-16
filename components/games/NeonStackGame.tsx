
import React, { useRef, useEffect, useCallback } from 'react';
import { GameProps } from '../../types';

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const NeonStackGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const onGameOverRef = useRef(onGameOver);
  const onScoreUpdateRef = useRef(onScoreUpdate);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onGameOver, onScoreUpdate]);

  const state = useRef({
    stack: [] as Block[],
    current: { 
      x: 0, 
      y: 0,
      w: 0, 
      h: 0, 
      color: '',
      speed: 0, 
      direction: 1
    },
    baseY: 0,
    score: 0,
    running: false, 
    combo: 0
  });

  const requestRef = useRef<number>();

  useEffect(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        // Fix: Pass empty options object to AudioContext constructor
        audioCtxRef.current = new AudioContextClass({});
      }
    }
  }, []);

  const playSound = (type: 'place' | 'perfect' | 'gameover') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;

    if (type === 'perfect') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500 + (state.current.combo * 40), now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'place') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  };

  const getBlockColor = (score: number) => {
      const hue = (score * 15) % 360;
      return `hsl(${hue}, 85%, 55%)`;
  };

  const spawnBlock = useCallback((canvas: HTMLCanvasElement) => {
    const s = state.current;
    const topBlock = s.stack[s.stack.length - 1];
    
    s.current.w = topBlock.w;
    s.current.h = topBlock.h;
    s.current.color = getBlockColor(s.score + 1);
    s.current.y = topBlock.y - topBlock.h; 
    
    const baseSpeed = 3.5 + Math.min(s.score * 0.1, 5.5);
    s.current.speed = baseSpeed;

    if (s.score % 2 === 0) {
        s.current.direction = -1; 
        s.current.x = canvas.width - 10;
    } else {
        s.current.direction = 1;
        s.current.x = -s.current.w + 10;
    }
  }, []);

  const handleTap = useCallback(() => {
    if (!state.current.running) return;
    const s = state.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const topBlock = s.stack[s.stack.length - 1];
    const delta = s.current.x - topBlock.x;
    const absDelta = Math.abs(delta);
    const tolerance = 8; // Increased tolerance for smoother feel

    if (absDelta <= tolerance) {
        playSound('perfect');
        s.combo++;
        s.current.x = topBlock.x;
        s.stack.push({
            x: s.current.x,
            y: s.current.y,
            w: s.current.w,
            h: s.current.h,
            color: s.current.color
        });
    } else if (absDelta >= s.current.w) {
        playSound('gameover');
        s.running = false;
        onGameOverRef.current(s.score);
        return;
    } else {
        playSound('place');
        s.combo = 0;
        const newW = s.current.w - absDelta;
        
        if (newW < 6) {
             playSound('gameover');
             s.running = false;
             onGameOverRef.current(s.score);
             return;
        }

        const newX = delta > 0 ? s.current.x : topBlock.x;
        s.stack.push({
            x: newX,
            y: s.current.y,
            w: newW,
            h: s.current.h,
            color: s.current.color
        });
        s.current.w = newW;
    }

    s.score++;
    onScoreUpdateRef.current(s.score);
    spawnBlock(canvas);
  }, [spawnBlock]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const s = state.current;
    const topY = s.stack.length > 0 ? s.stack[s.stack.length - 1].y : s.baseY;
    const targetCamY = canvas.height * 0.6 - topY;
    const camY = Math.max(0, targetCamY);

    s.stack.forEach((b, i) => {
        if (b.y + camY > canvas.height + 100) return;
        const isTop = i === s.stack.length - 1;
        ctx.shadowBlur = isTop ? 15 : 0;
        ctx.shadowColor = b.color;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y + camY, b.w, b.h - 1);
    });

    const currentY = s.current.y;
    ctx.shadowBlur = 20;
    ctx.shadowColor = s.current.color;
    ctx.fillStyle = s.current.color;
    ctx.fillRect(s.current.x, currentY + camY, s.current.w, s.current.h - 1);
  }, []);

  const update = useCallback(() => {
    if (!state.current.running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const s = state.current;
    s.current.x += s.current.speed * s.current.direction;
    
    // Safety exit bounds: Much larger to avoid premature gameover
    if (s.current.direction > 0 && s.current.x > canvas.width + s.current.w + 50) {
        playSound('gameover');
        s.running = false;
        onGameOverRef.current(s.score);
        return;
    }
    if (s.current.direction < 0 && s.current.x < -s.current.w - 50) {
        playSound('gameover');
        s.running = false;
        onGameOverRef.current(s.score);
        return;
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [draw]);

  useEffect(() => {
    const handleInput = (e: Event) => {
        if (e.type === 'touchstart') e.preventDefault(); 
        if (e.type === 'keydown') {
            const ke = e as KeyboardEvent;
            if (ke.code !== 'Space' && ke.code !== 'ArrowUp' && ke.code !== 'Enter') return;
        }
        handleTap();
    };

    window.addEventListener('keydown', handleInput);
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.addEventListener('touchstart', handleInput, { passive: false });
        canvas.addEventListener('mousedown', handleInput);
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            state.current.baseY = canvas.height - 60;
            const startW = Math.min(canvas.width * 0.7, 300);
            const startX = (canvas.width - startW) / 2;
            state.current.stack = [{ x: startX, y: state.current.baseY, w: startW, h: 28, color: '#0ea5e9' }];
            state.current.score = 0;
            state.current.running = true;
            spawnBlock(canvas);
        }
        requestRef.current = requestAnimationFrame(update);
    }

    return () => {
        window.removeEventListener('keydown', handleInput);
        if (canvas) {
            canvas.removeEventListener('touchstart', handleInput);
            canvas.removeEventListener('mousedown', handleInput);
        }
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [handleTap, spawnBlock, update]); 

  return <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" />;
};

export default NeonStackGame;
