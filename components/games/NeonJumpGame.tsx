import React, { useRef, useEffect, useCallback } from 'react';
import { GameProps } from '../../types';

interface Platform {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'normal' | 'moving';
    vx?: number;
}

const NeonJumpGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
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
        player: { 
            x: 0, 
            y: 0, 
            vx: 0, 
            vy: 0, 
            r: 8,
            color: '#f97316' // Orange
        },
        platforms: [] as Platform[],
        cameraY: 0,
        score: 0,
        running: false,
        keys: { left: false, right: false },
        gravity: 0.25,
        jumpStrength: -9.5,
        width: 0,
        height: 0
    });

    const requestRef = useRef<number>();

    // Audio Init
    useEffect(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }, []);

    const playSound = (type: 'jump' | 'fall') => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;

        if (type === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    };

    const initGame = (canvas: HTMLCanvasElement) => {
        const s = state.current;
        s.width = canvas.width;
        s.height = canvas.height;
        s.score = 0;
        s.cameraY = 0;
        onScoreUpdateRef.current(0);

        // Reset Player
        s.player.x = canvas.width / 2;
        s.player.y = canvas.height - 100;
        s.player.vx = 0;
        s.player.vy = 0;

        // Generate Starting Platforms
        s.platforms = [];
        
        // Base platform
        s.platforms.push({ x: 0, y: canvas.height - 30, w: canvas.width, h: 20, type: 'normal' });

        // Random platforms going up
        let y = canvas.height - 100;
        while (y > -canvas.height) { // Generate extra buffer above screen
            generatePlatform(y);
            y -= 80 + Math.random() * 40; // Gap between platforms
        }

        s.running = true;
    };

    const generatePlatform = (y: number) => {
        const s = state.current;
        const w = 60 + Math.random() * 40;
        const x = Math.random() * (s.width - w);
        const type = Math.random() > 0.8 && s.score > 500 ? 'moving' : 'normal';
        
        s.platforms.push({
            x,
            y,
            w,
            h: 15,
            type,
            vx: type === 'moving' ? (Math.random() > 0.5 ? 2 : -2) : 0
        });
    };

    const update = useCallback(() => {
        if (!state.current.running) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const s = state.current;

        // Input
        if (s.keys.left) s.player.vx = -5;
        else if (s.keys.right) s.player.vx = 5;
        else s.player.vx *= 0.9; // Friction

        // Physics
        s.player.vy += s.gravity;
        s.player.x += s.player.vx;
        s.player.y += s.player.vy;

        // Screen Wrap
        if (s.player.x + s.player.r < 0) s.player.x = s.width;
        if (s.player.x - s.player.r > s.width) s.player.x = 0;

        // Camera Logic (Move platforms down when player goes up)
        if (s.player.y < s.height / 2 && s.player.vy < 0) {
            const diff = (s.height / 2) - s.player.y;
            s.player.y += diff;
            s.cameraY += diff;
            s.score += Math.floor(diff * 0.5); // Add score based on height climbed
            onScoreUpdateRef.current(s.score);

            // Move platforms
            s.platforms.forEach(p => p.y += diff);
        }

        // Platform Management
        // Remove platforms below screen
        for (let i = s.platforms.length - 1; i >= 0; i--) {
            if (s.platforms[i].y > s.height) {
                s.platforms.splice(i, 1);
            }
        }
        
        // Add new platforms at top
        const highestPlatformY = Math.min(...s.platforms.map(p => p.y));
        if (highestPlatformY > 50) {
             generatePlatform(highestPlatformY - (80 + Math.random() * 40));
        }

        // Moving Platforms Logic
        s.platforms.forEach(p => {
            if (p.type === 'moving' && p.vx) {
                p.x += p.vx;
                if (p.x <= 0 || p.x + p.w >= s.width) p.vx *= -1;
            }
        });

        // Collision Detection (Only when falling)
        if (s.player.vy > 0) { 
            s.platforms.forEach(p => {
                if (
                    s.player.x > p.x && 
                    s.player.x < p.x + p.w &&
                    s.player.y + s.player.r >= p.y &&
                    s.player.y + s.player.r <= p.y + p.h + 5 // Tolerance
                ) {
                    playSound('jump');
                    s.player.vy = s.jumpStrength;
                }
            });
        }

        // Game Over
        if (s.player.y > s.height) {
            playSound('fall');
            s.running = false;
            onGameOverRef.current(s.score);
            return;
        }

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, [onGameOver]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const s = state.current;

        // Draw Platforms
        s.platforms.forEach(p => {
            const color = p.type === 'moving' ? '#22d3ee' : '#22c55e';
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(p.x, p.y, p.w, p.h, 5);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Draw Player
        ctx.shadowBlur = 15;
        ctx.shadowColor = s.player.color;
        ctx.fillStyle = s.player.color;
        ctx.beginPath();
        ctx.arc(s.player.x, s.player.y, s.player.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    };

    useEffect(() => {
        // Controls
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') state.current.keys.left = true;
            if (e.key === 'ArrowRight') state.current.keys.right = true;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') state.current.keys.left = false;
            if (e.key === 'ArrowRight') state.current.keys.right = false;
        };
        
        // Touch Controls
        const handleTouch = (e: TouchEvent) => {
            e.preventDefault();
            const canvas = canvasRef.current;
            if (!canvas) return;
            const touchX = e.touches[0].clientX;
            const width = canvas.clientWidth;
            
            if (touchX < width / 2) {
                state.current.keys.left = true;
                state.current.keys.right = false;
            } else {
                state.current.keys.left = false;
                state.current.keys.right = true;
            }
        };
        const handleTouchEnd = () => {
            state.current.keys.left = false;
            state.current.keys.right = false;
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('touchstart', handleTouch, { passive: false });
            canvas.addEventListener('touchend', handleTouchEnd);
            
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
                window.removeEventListener('keydown', onKeyDown);
                window.removeEventListener('keyup', onKeyUp);
                canvas.removeEventListener('touchstart', handleTouch);
                canvas.removeEventListener('touchend', handleTouchEnd);
                window.removeEventListener('resize', resize);
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
            };
        }
    }, [update]);

    return <canvas ref={canvasRef} className="w-full h-full block touch-none select-none" />;
};

export default NeonJumpGame;