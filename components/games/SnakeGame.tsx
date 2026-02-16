
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameProps } from '../../types';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Play } from 'lucide-react';

const GRID_SIZE = 20;
const SPEEDS = {
  NORMAL: 350, 
  MEDIUM: 200, 
  HIGH: 90
};

const SnakeGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [speed, setSpeed] = useState<number>(SPEEDS.MEDIUM); 
  const [isGameStarted, setIsGameStarted] = useState(false);
  const speedRef = useRef(SPEEDS.MEDIUM);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const gameState = useRef({
    snake: [{ x: 10, y: 10 }],
    food: { x: 15, y: 10 },
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
    running: false
  });

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        // Fix: Pass empty options object to AudioContext constructor
        audioCtxRef.current = new AudioContextClass({});
      }
    }
  }, []);

  const playSound = (type: 'eat' | 'die') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'eat') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    }
  };

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const handleStartGame = () => {
    setIsGameStarted(true);
    gameState.current.running = true;
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    const canvas = canvasRef.current;
    if (canvas) {
        const tilesX = Math.floor(canvas.width / GRID_SIZE);
        const tilesY = Math.floor(canvas.height / GRID_SIZE);
        gameState.current.snake = [{ x: Math.floor(tilesX/2), y: Math.floor(tilesY/2) }];
        gameState.current.food = { x: Math.floor(Math.random() * tilesX), y: Math.floor(Math.random() * tilesY) };
        gameState.current.direction = { x: 1, y: 0 };
        gameState.current.nextDirection = { x: 1, y: 0 };
        gameState.current.score = 0;
        onScoreUpdate(0);
    }
  };

  const handleInput = useCallback((key: string) => {
    if (!gameState.current.running) return;
    const { direction } = gameState.current;
    if (key === 'ArrowUp' && direction.y === 0) gameState.current.nextDirection = { x: 0, y: -1 };
    if (key === 'ArrowDown' && direction.y === 0) gameState.current.nextDirection = { x: 0, y: 1 };
    if (key === 'ArrowLeft' && direction.x === 0) gameState.current.nextDirection = { x: -1, y: 0 };
    if (key === 'ArrowRight' && direction.x === 0) gameState.current.nextDirection = { x: 1, y: 0 };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => handleInput(e.key);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleInput]);

  const update = useCallback((time: number) => {
    if (!gameState.current.running) {
        if (isGameStarted) requestRef.current = requestAnimationFrame(update);
        return;
    }
    if (time - lastTimeRef.current > speedRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const tX = Math.floor(canvas.width / GRID_SIZE);
      const tY = Math.floor(canvas.height / GRID_SIZE);
      gameState.current.direction = gameState.current.nextDirection;
      const head = { ...gameState.current.snake[0] };
      head.x += gameState.current.direction.x; head.y += gameState.current.direction.y;
      if (head.x < 0 || head.x >= tX || head.y < 0 || head.y >= tY || gameState.current.snake.some(s => s.x === head.x && s.y === head.y)) {
        playSound('die'); gameState.current.running = false; onGameOver(gameState.current.score); return;
      }
      gameState.current.snake.unshift(head);
      if (head.x === gameState.current.food.x && head.y === gameState.current.food.y) {
        playSound('eat'); gameState.current.score += 1; onScoreUpdate(gameState.current.score);
        gameState.current.food = { x: Math.floor(Math.random() * tX), y: Math.floor(Math.random() * tY) };
      } else { gameState.current.snake.pop(); }
      lastTimeRef.current = time;
    }
    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [onGameOver, onScoreUpdate, isGameStarted]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 10; ctx.shadowColor = '#22d3ee';
    gameState.current.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#ecfeff' : '#06b6d4';
      ctx.fillRect(s.x * GRID_SIZE + 1, s.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    ctx.shadowBlur = 15; ctx.shadowColor = '#ec4899'; ctx.fillStyle = '#ec4899';
    ctx.beginPath(); ctx.arc(gameState.current.food.x * GRID_SIZE + GRID_SIZE/2, gameState.current.food.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const resize = () => { if (containerRef.current) { canvas.width = containerRef.current.clientWidth; canvas.height = containerRef.current.clientHeight; draw(); } };
      resize(); window.addEventListener('resize', resize);
      requestRef.current = requestAnimationFrame(update);
      return () => { window.removeEventListener('resize', resize); if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }
  }, [update]);

  return (
    <div className="flex flex-col h-full w-full relative">
      <div ref={containerRef} className="flex-1 w-full bg-[#050508] overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full" />
        {!isGameStarted && (
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
              <h3 className="font-arcade text-4xl text-white mb-6 text-glow whitespace-nowrap">START SYSTEM</h3>
              <button onClick={handleStartGame} className="px-10 py-4 bg-neon-blue text-black font-arcade font-bold text-lg rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)] active:scale-95 transition-all">INITIATE</button>
           </div>
        )}
      </div>
      <div className="shrink-0 p-4 bg-[#0A0A0A] border-t border-[#1A1A1A] flex flex-col gap-4">
        <div className="flex justify-center gap-2">
          {['NORMAL', 'MEDIUM', 'HIGH'].map((label, idx) => (
            <button key={label} onClick={() => setSpeed([350, 200, 90][idx])} className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all ${speed === [350, 200, 90][idx] ? 'bg-neon-blue text-black' : 'bg-[#151515] text-slate-500 border border-[#222]'}`}>{label}</button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <button className="w-12 h-12 rounded-xl bg-[#151515] border border-[#222] flex items-center justify-center text-white active:bg-neon-blue active:text-black" onClick={() => handleInput('ArrowUp')}><ArrowUp className="w-5 h-5" /></button>
          <div className="flex gap-4">
            <button className="w-12 h-12 rounded-xl bg-[#151515] border border-[#222] flex items-center justify-center text-white active:bg-neon-blue active:text-black" onClick={() => handleInput('ArrowLeft')}><ArrowLeft className="w-5 h-5" /></button>
            <button className="w-12 h-12 rounded-xl bg-[#151515] border border-[#222] flex items-center justify-center text-white active:bg-neon-blue active:text-black" onClick={() => handleInput('ArrowDown')}><ArrowDown className="w-5 h-5" /></button>
            <button className="w-12 h-12 rounded-xl bg-[#151515] border border-[#222] flex items-center justify-center text-white active:bg-neon-blue active:text-black" onClick={() => handleInput('ArrowRight')}><ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
