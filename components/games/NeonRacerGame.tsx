import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameProps } from '../../types';
import { Zap, AlertTriangle } from 'lucide-react';

interface Car {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    speed: number;
    lane: number;
    type: 'player' | 'enemy';
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

const NeonRacerGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    
    const onGameOverRef = useRef(onGameOver);
    const onScoreUpdateRef = useRef(onScoreUpdate);

    const [isTurbo, setIsTurbo] = useState(false);

    useEffect(() => {
        onGameOverRef.current = onGameOver;
        onScoreUpdateRef.current = onScoreUpdate;
    }, [onGameOver, onScoreUpdate]);

    const state = useRef({
        player: { 
            x: 0, 
            y: 0, 
            w: 50, 
            h: 85, 
            color: '#0ea5e9',
            lane: 1,
            targetX: 0,
            tilt: 0
        },
        enemies: [] as Car[],
        particles: [] as Particle[],
        roadGrid: [] as number[],
        score: 0,
        distance: 0,
        speed: 0,
        baseSpeed: 10,
        turboSpeed: 22,
        laneWidth: 0,
        roadX: 0,
        roadW: 0,
        running: false,
        spawnTimer: 0,
        globalOffset: 0,
        cameraShake: 0
    });

    const requestRef = useRef<number>();

    useEffect(() => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                audioCtxRef.current = new AudioContextClass();
            }
        }
    }, []);

    const playSound = (type: 'engine' | 'turbo' | 'crash' | 'pass') => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;

        if (type === 'turbo') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.linearRampToValueAtTime(350, now + 0.5);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'pass') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'crash') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(60, now);
            osc.frequency.exponentialRampToValueAtTime(1, now + 0.6);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        }
    };

    const spawnParticles = (x: number, y: number, color: string, count: number, speed: number) => {
        for(let i=0; i<count; i++) {
            state.current.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed + (speed * 0.4),
                life: 1.0,
                color,
                size: Math.random() * 4 + 1
            });
        }
    };

    const spawnEnemy = () => {
        const s = state.current;
        const lane = Math.floor(Math.random() * 3);
        const tooClose = s.enemies.some(e => e.y < -100 && e.lane === lane);
        if (tooClose) return;

        const colors = ['#ef4444', '#f59e0b', '#a855f7', '#10b981'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const x = s.roadX + (lane * s.laneWidth) + (s.laneWidth - s.player.w) / 2;

        s.enemies.push({
            x,
            y: -200,
            w: s.player.w,
            h: s.player.h,
            color,
            speed: s.baseSpeed * 0.65,
            lane,
            type: 'enemy'
        });
    };

    const initGame = (canvas: HTMLCanvasElement) => {
        const s = state.current;
        const roadW = Math.min(canvas.width * 0.88, 480);
        s.roadW = roadW;
        s.roadX = (canvas.width - roadW) / 2;
        s.laneWidth = roadW / 3;

        s.score = 0;
        s.speed = 0;
        s.enemies = [];
        s.particles = [];
        s.player.lane = 1;
        s.player.targetX = s.roadX + s.laneWidth + (s.laneWidth - s.player.w) / 2;
        s.player.x = s.player.targetX;
        s.player.y = canvas.height - 180;
        s.running = true;
        s.globalOffset = 0;
        onScoreUpdateRef.current(0);
    };

    const drawPremiumCar = (ctx: CanvasRenderingContext2D, car: Car | typeof state.current.player, isPlayer: boolean) => {
        const { x, y, w, h, color } = car;
        ctx.save();
        ctx.shadowBlur = isPlayer ? 20 : 10;
        ctx.shadowColor = color;

        // Body
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();

        // Accents
        ctx.fillStyle = color;
        ctx.fillRect(x + w/2 - 3, y, 6, h);
        ctx.fillRect(x + 2, y + 15, 2, h - 30);
        ctx.fillRect(x + w - 4, y + 15, 2, h - 30);

        // Windshield
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.roundRect(x + 8, y + h * 0.25, w - 16, h * 0.35, 4);
        ctx.fill();

        // Lights
        if (isPlayer) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 5, y + h - 5, 10, 4);
            ctx.fillRect(x + w - 15, y + h - 5, 10, 4);
        } else {
            ctx.fillStyle = '#fde047';
            ctx.fillRect(x + 5, y + 2, 8, 3);
            ctx.fillRect(x + w - 13, y + 2, 8, 3);
        }
        ctx.restore();
    };

    const update = useCallback(() => {
        if (!state.current.running) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const s = state.current;
        const targetSpeed = isTurbo ? s.turboSpeed : s.baseSpeed;
        s.speed += (targetSpeed - s.speed) * 0.08;

        s.distance += s.speed;
        if (s.distance > 80) {
            s.score += Math.floor(s.speed / 4);
            s.distance = 0;
            onScoreUpdateRef.current(s.score);
        }

        s.globalOffset += s.speed;
        const laneX = s.roadX + (s.player.lane * s.laneWidth) + (s.laneWidth - s.player.w) / 2;
        s.player.targetX = laneX;
        const dx = s.player.targetX - s.player.x;
        s.player.x += dx * 0.18;
        s.player.tilt = -dx * 0.06;

        s.spawnTimer++;
        if (s.spawnTimer > Math.max(25, 85 - (s.score / 150))) {
            spawnEnemy();
            s.spawnTimer = 0;
        }

        if (s.running) {
             spawnParticles(s.player.x + s.player.w/2, s.player.y + s.player.h, isTurbo ? '#0ea5e9' : '#f59e0b', isTurbo ? 3 : 1, s.speed * 0.4);
        }

        for (let i = s.enemies.length - 1; i >= 0; i--) {
            const e = s.enemies[i];
            e.y += s.speed * 0.75;

            const pad = 10;
            if (s.player.x + pad < e.x + e.w - pad && s.player.x + s.player.w - pad > e.x + pad &&
                s.player.y + pad < e.y + e.h - pad && s.player.y + s.player.h - pad > e.y + pad) {
                s.cameraShake = 25;
                spawnParticles(s.player.x + s.player.w/2, s.player.y, '#ffffff', 25, 12);
                playSound('crash');
                s.running = false;
                onGameOverRef.current(s.score);
                return;
            }

            if (e.y > canvas.height) {
                s.enemies.splice(i, 1);
                s.score += 75;
                playSound('pass');
                onScoreUpdateRef.current(s.score);
            }
        }

        for (let i = s.particles.length - 1; i >= 0; i--) {
            const p = s.particles[i];
            p.x += p.vx;
            p.y += p.vy + (s.speed * 0.3);
            p.life -= 0.04;
            if (p.life <= 0) s.particles.splice(i, 1);
        }

        if (s.cameraShake > 0) s.cameraShake *= 0.88;

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, [isTurbo]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const s = state.current;
        const shakeX = (Math.random() - 0.5) * s.cameraShake;
        const shakeY = (Math.random() - 0.5) * s.cameraShake;

        ctx.save();
        ctx.translate(shakeX, shakeY);
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
        ctx.lineWidth = 1;
        const gridSize = 70;
        const offsetY = s.globalOffset % gridSize;
        ctx.beginPath();
        for(let x = 0; x <= canvas.width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for(let y = offsetY - gridSize; y < canvas.height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        // Road
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(s.roadX, 0, s.roadW, canvas.height);
        ctx.strokeStyle = isTurbo ? '#38bdf8' : '#f59e0b';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.strokeStyle as string;
        ctx.beginPath();
        ctx.moveTo(s.roadX, 0); ctx.lineTo(s.roadX, canvas.height);
        ctx.moveTo(s.roadX + s.roadW, 0); ctx.lineTo(s.roadX + s.roadW, canvas.height);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Lane Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.setLineDash([40, 60]);
        ctx.lineDashOffset = -s.globalOffset;
        ctx.beginPath();
        ctx.moveTo(s.roadX + s.laneWidth, 0); ctx.lineTo(s.roadX + s.laneWidth, canvas.height);
        ctx.moveTo(s.roadX + s.laneWidth * 2, 0); ctx.lineTo(s.roadX + s.laneWidth * 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        s.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });

        s.enemies.forEach(e => drawPremiumCar(ctx, e, false));

        ctx.save();
        ctx.translate(s.player.x + s.player.w/2, s.player.y + s.player.h/2);
        ctx.rotate(s.player.tilt * Math.PI / 180);
        ctx.translate(-(s.player.x + s.player.w/2), -(s.player.y + s.player.h/2));
        if (isTurbo) { ctx.shadowColor = '#0ea5e9'; ctx.shadowBlur = 35; }
        drawPremiumCar(ctx, s.player, true);
        ctx.restore();

        ctx.restore();
    };

    const handleInput = (laneIndex: number) => {
        const s = state.current;
        if (laneIndex >= 0 && laneIndex <= 2) {
            s.player.lane = laneIndex;
            if (!isTurbo) playSound('turbo');
        }
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') handleInput(state.current.player.lane - 1);
        if (e.key === 'ArrowRight') handleInput(state.current.player.lane + 1);
        if (e.key === 'ArrowUp') { setIsTurbo(true); playSound('turbo'); }
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowUp') setIsTurbo(false);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => { if (canvas.parentElement) { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; if (!state.current.running) initGame(canvas); } };
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        canvas.addEventListener('mousedown', () => setIsTurbo(true));
        window.addEventListener('mouseup', () => setIsTurbo(false));

        const tStart = (e: TouchEvent) => { e.preventDefault(); const r = canvas.getBoundingClientRect(); const x = e.touches[0].clientX - r.left; const lW = canvas.width / 3; if (x < lW) handleInput(0); else if (x < lW * 2) handleInput(1); else handleInput(2); setIsTurbo(true); };
        canvas.addEventListener('touchstart', tStart, { passive: false });
        canvas.addEventListener('touchend', () => setIsTurbo(false));

        requestRef.current = requestAnimationFrame(update);
        return () => { window.removeEventListener('resize', resize); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); canvas.removeEventListener('touchstart', tStart); if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [update, handleKeyDown, handleKeyUp]);

    return (
        <div className="relative w-full h-full select-none">
            <canvas ref={canvasRef} className="w-full h-full block cursor-pointer touch-none" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none opacity-80">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 rounded-full border border-white/10 backdrop-blur-md">
                   <AlertTriangle className="w-3 h-3 text-yellow-500" />
                   <span className="text-[10px] text-white font-mono font-bold tracking-widest">DODGE</span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 transition-all backdrop-blur-md ${isTurbo ? 'bg-blue-600/40 border-blue-400 text-blue-200 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-black/50 text-slate-400'}`}>
                   <Zap className={`w-3 h-3 ${isTurbo ? 'fill-current animate-pulse' : ''}`} />
                   <span className="text-[10px] font-mono font-bold tracking-widest">{isTurbo ? 'TURBO ON' : 'HOLD UP'}</span>
                </div>
            </div>
        </div>
    );
};

export default NeonRacerGame;