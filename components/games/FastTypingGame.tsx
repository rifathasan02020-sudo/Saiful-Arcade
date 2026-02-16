
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameProps } from '../../types';
import { Keyboard as KeyboardIcon } from 'lucide-react';

const WORD_LIST = [
  "FAST", "SPEED", "DASH", "ZOOM", "QUICK", "RAPID", "FLASH", "BLITZ", "TURBO", "NITRO",
  "RACE", "BOLT", "RUSH", "SONIC", "VELOCITY", "MACH", "WARP", "HYPER", "DRIVE", "DRIFT",
  "SWIFT", "HASTE", "AGILE", "NIMBLE", "SHARP", "FOCUS", "REFLEX", "INPUT", "TYPE", "KEYS",
  "CLICK", "CLACK", "PRESS", "TOUCH", "CODE", "HACK", "DATA", "FLOW", "STREAM", "PULSE",
  "NEON", "GLOW", "LASER", "BEAM", "SPARK", "FIRE", "BURN", "HEAT", "IGNITE", "BLAZE",
  "ACTION", "GAMER", "SCORE", "WIN", "LOSE", "GAME", "OVER", "RETRY", "LEVEL", "STAGE",
  "POWER", "ENERGY", "CHARGE", "SHOCK", "VOLT", "WATT", "AMP", "FUSE", "CORE", "GRID",
  "FUTURE", "CYBER", "PUNK", "TECH", "MECH", "ROBOT", "DROID", "SYSTEM", "ONLINE", "LINK",
  "SERVER", "CLIENT", "NODE", "HOST", "ROOT", "USER", "ADMIN", "SUDO", "BASH", "SHELL"
];

interface FallingWord {
    id: number;
    text: string;
    x: number;
    y: number;
    speed: number;
    matched: number; // number of chars matched so far
    isTarget: boolean;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    char: string;
}

const FastTypingGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Callbacks refs
    const onGameOverRef = useRef(onGameOver);
    const onScoreUpdateRef = useRef(onScoreUpdate);

    useEffect(() => {
        onGameOverRef.current = onGameOver;
        onScoreUpdateRef.current = onScoreUpdate;
    }, [onGameOver, onScoreUpdate]);

    const state = useRef({
        words: [] as FallingWord[],
        particles: [] as Particle[],
        score: 0,
        running: false,
        spawnTimer: 0,
        spawnRate: 60, // frames between spawns
        lastTime: 0,
        difficultyMultiplier: 1
    });

    const requestRef = useRef<number>();

    // Audio Init
    useEffect(() => {
        if (!audioCtxRef.current) {
            // Fix: Pass empty options object to AudioContext constructor
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({});
        }
    }, []);

    const playSound = (type: 'type' | 'destroy' | 'miss') => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;

        if (type === 'type') {
            // Mechanical switch click sound (higher pitched, short)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1000, now);
            osc.frequency.exponentialRampToValueAtTime(1500, now + 0.03);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.03);
        } else if (type === 'destroy') {
            // Explosion sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else {
            // Miss / Damage (Low buzz)
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    };

    const spawnWord = (canvas: HTMLCanvasElement) => {
        const s = state.current;
        const text = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
        const margin = 50;
        const x = margin + Math.random() * (canvas.width - margin * 2 - 100);
        
        // Speed scaling
        const baseSpeed = 1.5 + (s.score / 400); 
        
        s.words.push({
            id: Date.now() + Math.random(),
            text,
            x,
            y: -30,
            speed: baseSpeed + Math.random() * 0.8,
            matched: 0,
            isTarget: false
        });
    };

    const spawnExplosion = (x: number, y: number, text: string) => {
        for(let i=0; i<text.length; i++) {
            // Spawn a particle for each letter roughly
            state.current.particles.push({
                x: x + (i * 15),
                y: y,
                vx: (Math.random() - 0.5) * 8, // Faster expansion
                vy: (Math.random() - 0.5) * 8,
                life: 1.0,
                color: '#f97316', // Orange
                char: text[i]
            });
        }
    };

    const handleInput = useCallback((char: string) => {
        if (!state.current.running) return;
        const s = state.current;
        const upperChar = char.toUpperCase();

        // 1. Check if we have a locked target
        let target = s.words.find(w => w.isTarget);

        if (target) {
            // Check next char of target
            if (target.text[target.matched] === upperChar) {
                target.matched++;
                playSound('type');
                
                // Check if completed
                if (target.matched === target.text.length) {
                    spawnExplosion(target.x, target.y, target.text);
                    playSound('destroy');
                    s.score += target.text.length * 10;
                    onScoreUpdateRef.current(s.score);
                    // Remove word
                    s.words = s.words.filter(w => w.id !== target!.id);
                }
            } 
            // Else ignore input if it doesn't match target (strict mode)
        } else {
            // 2. Find a new target starting with this char
            // Prefer lowest word (closest to bottom)
            const candidates = s.words.filter(w => w.text[0] === upperChar);
            if (candidates.length > 0) {
                // Pick the one with largest Y (closest to bottom)
                candidates.sort((a, b) => b.y - a.y);
                const newTarget = candidates[0];
                newTarget.isTarget = true;
                newTarget.matched = 1;
                playSound('type');
                
                // Check if it was a 1-letter word (unlikely but possible)
                if (newTarget.matched === newTarget.text.length) {
                    spawnExplosion(newTarget.x, newTarget.y, newTarget.text);
                    playSound('destroy');
                    s.score += 10;
                    onScoreUpdateRef.current(s.score);
                    s.words = s.words.filter(w => w.id !== newTarget.id);
                }
            }
        }
    }, []);

    const update = useCallback(() => {
        if (!state.current.running) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const s = state.current;

        // Spawn Logic
        s.spawnTimer++;
        const spawnThreshold = Math.max(20, s.spawnRate - Math.floor(s.score / 150)); // Faster spawn ramp up
        if (s.spawnTimer > spawnThreshold) {
            spawnWord(canvas);
            s.spawnTimer = 0;
        }

        // Update Words
        for (let i = s.words.length - 1; i >= 0; i--) {
            const w = s.words[i];
            w.y += w.speed;

            if (w.y > canvas.height) {
                playSound('miss');
                s.running = false;
                onGameOverRef.current(s.score);
                return;
            }
        }

        // Update Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
            const p = s.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) s.particles.splice(i, 1);
        }

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, []);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid Background Effect for Speed Feel
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical moving lines
        const time = Date.now() / 50;
        const offsetX = 0;
        const offsetY = time % 50;

        ctx.beginPath();
        for(let x = 0; x < canvas.width; x += 50) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        for(let y = offsetY; y < canvas.height; y += 50) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();

        const s = state.current;

        // Draw Words
        ctx.font = 'bold 24px "Rajdhani", sans-serif'; // More technical font
        
        s.words.forEach(w => {
            const width = ctx.measureText(w.text).width;
            
            // Draw matched part
            if (w.matched > 0) {
                ctx.fillStyle = '#ef4444'; // Red for matched part
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 15;
                ctx.fillText(w.text.substring(0, w.matched), w.x, w.y);
                ctx.shadowBlur = 0;
            }

            // Draw remaining part
            const matchedWidth = ctx.measureText(w.text.substring(0, w.matched)).width;
            if (w.isTarget) {
                ctx.fillStyle = '#fbbf24'; // Amber for active target remaining
            } else {
                ctx.fillStyle = '#f97316'; // Orange for normal remaining
            }
            
            // Glow for target
            if (w.isTarget) {
                 ctx.shadowColor = '#f59e0b';
                 ctx.shadowBlur = 20;
            }

            ctx.fillText(w.text.substring(w.matched), w.x + matchedWidth, w.y);
            ctx.shadowBlur = 0;

            // Target reticle / Underline
            if (w.isTarget) {
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(w.x - 5, w.y + 5);
                ctx.lineTo(w.x + width + 5, w.y + 5);
                ctx.stroke();
            }
        });

        // Draw Particles
        s.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.font = '14px sans-serif';
            ctx.fillText(p.char, p.x, p.y);
            ctx.globalAlpha = 1.0;
        });
    };

    // Keyboard Event Listener
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                handleInput(e.key);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        
        // Also handle hidden input for mobile
        const onInputChange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const val = target.value;
            if (val.length > 0) {
                const char = val[val.length - 1]; // Get last char
                if (/[a-zA-Z]/.test(char)) {
                    handleInput(char);
                }
                target.value = '';
            }
        };

        const input = inputRef.current;
        if (input) {
            input.addEventListener('input', onInputChange);
        }

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            if (input) input.removeEventListener('input', onInputChange);
        };
    }, [handleInput]);

    // Canvas Setup & Game Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                state.current.running = true;
                // Pre-spawn one word
                spawnWord(canvas);
            }
            
            requestRef.current = requestAnimationFrame(update);

            const resize = () => {
                 if (canvas.parentElement) {
                    canvas.width = canvas.parentElement.clientWidth;
                    canvas.height = canvas.parentElement.clientHeight;
                 }
            };
            window.addEventListener('resize', resize);

            return () => {
                window.removeEventListener('resize', resize);
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
            };
        }
    }, []);

    // Mobile Focus Helper
    const focusInput = () => {
        inputRef.current?.focus();
    };

    return (
        <div className="relative w-full h-full" onClick={focusInput}>
            <canvas ref={canvasRef} className="block w-full h-full cursor-text" />
            
            {/* Hidden Input for Mobile Keyboard */}
            <input 
                ref={inputRef}
                type="text" 
                className="absolute opacity-0 top-0 left-0 w-full h-full cursor-pointer z-10" 
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
            
            {/* Start Hint */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-50">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                    <KeyboardIcon className="w-4 h-4 text-orange-400" />
                    <span className="text-[10px] text-orange-400 font-mono">KEYBOARD ACTIVE // TYPE FAST</span>
                </div>
            </div>
        </div>
    );
};

export default FastTypingGame;
