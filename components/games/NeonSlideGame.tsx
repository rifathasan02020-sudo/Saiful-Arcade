
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameProps } from '../../types';
import { Lightbulb } from 'lucide-react';

const NeonSlideGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [level, setLevel] = useState(1);
  const [tiles, setTiles] = useState<number[]>([]); 
  const [gridSize, setGridSize] = useState({ rows: 2, cols: 3 });
  const [isSolved, setIsSolved] = useState(false);
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

  const playSound = (type: 'slide' | 'win' | 'solve') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    if (type === 'slide') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
        osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.4);
      });
    } else if (type === 'solve') {
      // Premium Harmonic Chime
      const freqs = [880, 1108, 1318]; // A Major triad
      freqs.forEach(f => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now); osc.stop(now + 0.8);
      });
    }
  };

  const initLevel = (currentLevel: number) => {
    const numCount = 5 * currentLevel;
    const totalSlots = numCount + 1;
    let cols = Math.ceil(Math.sqrt(totalSlots));
    let rows = Math.ceil(totalSlots / cols);
    if (currentLevel === 1) { cols = 3; rows = 2; }
    setGridSize({ rows, cols });
    const newTiles = Array.from({ length: rows * cols }, (_, i) => {
        if (i < numCount) return i + 1;
        return 0; 
    });
    let emptyIdx = newTiles.indexOf(0);
    const shuffleMoves = 30 * currentLevel;
    let lastMove = -1;
    for(let i=0; i<shuffleMoves; i++) {
        const neighbors = [];
        const r = Math.floor(emptyIdx / cols);
        const c = emptyIdx % cols;
        if (r > 0) neighbors.push(emptyIdx - cols); 
        if (r < rows - 1) neighbors.push(emptyIdx + cols); 
        if (c > 0) neighbors.push(emptyIdx - 1); 
        if (c < cols - 1) neighbors.push(emptyIdx + 1); 
        const validNeighbors = neighbors.filter(n => n !== lastMove);
        const move = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        if (move !== undefined) {
             newTiles[emptyIdx] = newTiles[move];
             newTiles[move] = 0;
             lastMove = emptyIdx;
             emptyIdx = move;
        }
    }
    setTiles(newTiles);
    setIsSolved(false);
  };

  useEffect(() => { initLevel(level); }, [level]);

  const checkWin = (currentTiles: number[]) => {
    const numCount = 5 * level;
    for (let i = 0; i < numCount; i++) {
        if (currentTiles[i] !== i + 1) return false;
    }
    return true;
  };

  const handleTileClick = (index: number) => {
    if (isSolved) return;
    const emptyIdx = tiles.indexOf(0);
    const { cols } = gridSize;
    const r1 = Math.floor(index / cols);
    const c1 = index % cols;
    const r2 = Math.floor(emptyIdx / cols);
    const c2 = emptyIdx % cols;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
        const newTiles = [...tiles];
        newTiles[emptyIdx] = newTiles[index];
        newTiles[index] = 0;
        setTiles(newTiles);
        playSound('slide');
        if (checkWin(newTiles)) {
            playSound('win');
            setIsSolved(true);
            setTimeout(() => {
                onScoreUpdate(5 * level * 10);
                setLevel(l => l + 1);
            }, 1500);
        }
    }
  };

  const handleSolve = () => {
    if (isSolved) return;
    playSound('solve');
    const numCount = 5 * level;
    const { rows, cols } = gridSize;
    const solvedTiles = Array.from({ length: rows * cols }, (_, i) => (i < numCount ? i + 1 : 0));
    setTiles(solvedTiles);
    setIsSolved(true);
    setTimeout(() => { setLevel(l => l + 1); }, 1500);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const { rows, cols } = gridSize;
    const padding = 10;
    const tileWidth = (canvas.width - (cols + 1) * padding) / cols;
    const tileHeight = (canvas.height - (rows + 1) * padding) / rows;
    tiles.forEach((num, i) => {
        if (num === 0) return; 
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = padding + c * (tileWidth + padding);
        const y = padding + r * (tileHeight + padding);
        const isCorrect = (num === i + 1);
        const color = isCorrect ? '#22c55e' : '#facc15';
        ctx.shadowBlur = 12; ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(x, y, tileWidth, tileHeight, 8); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.min(tileWidth, tileHeight) * 0.35}px "Orbitron"`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), x + tileWidth / 2, y + tileHeight / 2);
    });
    if (isSolved) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 20; ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 36px "Orbitron"'; ctx.textAlign = 'center';
        ctx.fillText("SYSTEM SOLVED", canvas.width / 2, canvas.height / 2);
    }
  }, [tiles, gridSize, isSolved]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        let cX, cY;
        if ('touches' in e) { cX = e.touches[0].clientX; cY = e.touches[0].clientY; }
        else { cX = (e as MouseEvent).clientX; cY = (e as MouseEvent).clientY; }
        const x = cX - rect.left; const y = cY - rect.top;
        const { rows, cols } = gridSize;
        const padding = 10;
        const tW = (canvas.width - (cols + 1) * padding) / cols;
        const tH = (canvas.height - (rows + 1) * padding) / rows;
        const c = Math.floor((x - padding / 2) / (tW + padding));
        const r = Math.floor((y - padding / 2) / (tH + padding));
        if (r >= 0 && r < rows && c >= 0 && c < cols) handleTileClick(r * cols + c);
    };
    canvas.addEventListener('mousedown', handleClick);
    canvas.addEventListener('touchstart', handleClick, { passive: false });
    return () => { canvas.removeEventListener('mousedown', handleClick); canvas.removeEventListener('touchstart', handleClick); };
  }, [tiles, gridSize, isSolved]);

  useEffect(() => {
    const loop = () => { draw(); requestRef.current = requestAnimationFrame(loop); };
    loop();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute top-4 left-0 w-full flex justify-between px-6 pointer-events-none">
         <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <span className="text-neon-blue font-bold font-arcade text-xs">LVL {level}</span>
         </div>
         <button 
            onClick={handleSolve}
            disabled={isSolved}
            className="pointer-events-auto bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:border-neon-purple text-white text-[10px] font-bold tracking-widest disabled:opacity-30"
         >
             SOLVE SYSTEM
         </button>
      </div>
    </div>
  );
};

export default NeonSlideGame;
