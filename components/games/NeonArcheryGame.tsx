import React, { useRef, useEffect, useCallback } from 'react';
import { GameProps } from '../../types';
import { Target } from 'lucide-react';

interface Arrow {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    active: boolean;
    trail: {x: number, y: number}[];
}

interface TargetType {
    x: number;
    y: number;
    radius: number;
    color: string;
    vx: number;
    vy: number;
    points: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
}

const NeonArcheryGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    
    // Refs for callbacks to avoid dependency cycles
    const onGameOverRef = useRef(onGameOver);
    const onScoreUpdateRef = useRef(onScoreUpdate);

    useEffect(() => {
        onGameOverRef.current = onGameOver;
        onScoreUpdateRef.current = onScoreUpdate;
    }, [onGameOver, onScoreUpdate]);

    const state = useRef({
        arrows: [] as Arrow[],
        targets: [] as TargetType[],
        particles: [] as Particle[],
        score: 0,
        lives: 3,
        running: false,
        spawnTimer: 0,
        drag: {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        }
    });

    const requestRef = useRef<number>();

    // Audio Init
    useEffect(() => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                audioCtxRef.current = new AudioContextClass();
            }
        }
    }, []);

    const playSound = (type: 'pull' | 'shoot' | 'hit' | 'miss') => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;

        if (type === 'pull') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'shoot') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else {
            // Miss/Life lost
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    };

    const spawnTarget = (canvas: HTMLCanvasElement) => {
        const s = state.current;
        const radius = 20 + Math.random() * 15;
        // Spawn from sides
        const fromLeft = Math.random() > 0.5;
        const x = fromLeft ? -radius : canvas.width + radius;
        const y = radius + Math.random() * (canvas.height * 0.6); // Keep in upper 60%
        
        const speed = (2 + Math.random() * 2) + (s.score / 200);
        const vx = fromLeft ? speed : -speed;
        
        // Colors
        const colors = ['#f97316', '#22c55e', '#ec4899', '#22d3ee'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        s.targets.push({
            x,
            y,
            radius,
            color,
            vx,
            vy: Math.sin(Date.now() / 1000) * 0.5, // Slight wave
            points: Math.floor(50 / radius * 10)
        });
    };

    const spawnExplosion = (x: number, y: number, color: string) => {
        for(let i=0; i<8; i++) {
            state.current.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1.0,
                color
            });
        }
    };

    // Main Game Loop Update
    const update = useCallback(() => {
        if (!state.current.running) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const s = state.current;

        // Spawn Targets
        s.spawnTimer++;
        if (s.spawnTimer > Math.max(30, 80 - Math.floor(s.score / 50))) {
            spawnTarget(canvas);
            s.spawnTimer = 0;
        }

        // Update Arrows
        for (let i = s.arrows.length - 1; i >= 0; i--) {
            const a = s.arrows[i];
            
            // Physics
            a.x += a.vx;
            a.y += a.vy;
            a.vy += 0.15; // Gravity
            a.angle = Math.atan2(a.vy, a.vx);
            
            // Trail
            if (s.spawnTimer % 3 === 0) {
                 a.trail.push({x: a.x, y: a.y});
                 if(a.trail.length > 10) a.trail.shift();
            }

            // Remove if off screen
            if (a.x < 0 || a.x > canvas.width || a.y > canvas.height) {
                a.active = false;
                s.arrows.splice(i, 1);
                continue;
            }
            
            // Collision with Targets
            for (let j = s.targets.length - 1; j >= 0; j--) {
                const t = s.targets[j];
                const dx = a.x - t.x;
                const dy = a.y - t.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < t.radius + 5) {
                    // Hit!
                    playSound('hit');
                    spawnExplosion(t.x, t.y, t.color);
                    s.score += t.points;
                    onScoreUpdateRef.current(s.score);
                    
                    s.targets.splice(j, 1);
                    s.arrows.splice(i, 1); // Arrow destroyed on impact
                    break;
                }
            }
        }

        // Update Targets
        for (let i = s.targets.length - 1; i >= 0; i--) {
            const t = s.targets[i];
            t.x += t.vx;
            t.y += t.vy;
            
            // Check if off screen
            const isOffScreen = (t.vx > 0 && t.x > canvas.width + t.radius) || 
                              (t.vx < 0 && t.x < -t.radius);
            
            if (isOffScreen) {
                s.targets.splice(i, 1);
                s.lives--;
                playSound('miss');
                if (s.lives <= 0) {
                    s.running = false;
                    onGameOverRef.current(s.score);
                    return;
                }
            }
        }

        // Update Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
            const p = s.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
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

        const s = state.current;

        // Draw Bow Mechanics
        const bowX = canvas.width / 2;
        const bowY = canvas.height - 80;

        // Calculate Angle and Power from Drag
        let angle = -Math.PI / 2;
        let pull = 0;

        if (s.drag.active) {
            const dx = s.drag.startX - s.drag.currentX;
            const dy = s.drag.startY - s.drag.currentY;
            // Angle should point opposite to drag
            angle = Math.atan2(dy, dx); 
            // Clamp angle to upward arc
            if (angle > 0) angle = -Math.PI / 2; // Can't shoot down effectively
            
            pull = Math.min(Math.sqrt(dx*dx + dy*dy), 150);
        }

        // Draw Bow
        ctx.save();
        ctx.translate(bowX, bowY);
        ctx.rotate(angle + Math.PI/2); // Rotate to face direction
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f97316';
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        
        // Bow Body
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI, true);
        ctx.stroke();

        // String
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(0, pull * 0.4); // String pulled back
        ctx.lineTo(40, 0);
        ctx.stroke();

        // Arrow on Bow
        if (s.drag.active) {
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.fillRect(-2, -40 + (pull * 0.4), 4, 60);
            
            // Arrow Head
            ctx.beginPath();
            ctx.moveTo(0, -50 + (pull * 0.4));
            ctx.lineTo(-5, -40 + (pull * 0.4));
            ctx.lineTo(5, -40 + (pull * 0.4));
            ctx.fill();
        }

        ctx.restore();

        // Draw Flying Arrows
        s.arrows.forEach(a => {
            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.angle + Math.PI/2);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            ctx.fillStyle = '#fff';
            
            // Arrow Shaft
            ctx.fillRect(-1.5, -15, 3, 30);
            // Arrow Head
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(-4, -15);
            ctx.lineTo(4, -15);
            ctx.fill();
            
            ctx.restore();
            
            // Trail
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            a.trail.forEach((t, i) => {
                if(i===0) ctx.moveTo(t.x, t.y);
                else ctx.lineTo(t.x, t.y);
            });
            ctx.stroke();
        });

        // Draw Targets
        s.targets.forEach(t => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = t.color;
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner rings
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
        });

        // Draw Particles
        s.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });
        
        // Draw Lives
        ctx.font = '20px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('♥'.repeat(s.lives), 20, 30);
        
        // Aim Line Guide (Optional, if dragging)
        if (s.drag.active) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(bowX, bowY);
            ctx.lineTo(bowX + Math.cos(angle) * 800, bowY + Math.sin(angle) * 800);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    };

    // Input Handlers
    const startDrag = (x: number, y: number) => {
        state.current.drag.active = true;
        state.current.drag.startX = x;
        state.current.drag.startY = y;
        state.current.drag.currentX = x;
        state.current.drag.currentY = y;
        playSound('pull');
    };

    const moveDrag = (x: number, y: number) => {
        if (state.current.drag.active) {
            state.current.drag.currentX = x;
            state.current.drag.currentY = y;
        }
    };

    const endDrag = (x: number, y: number) => {
        if (!state.current.drag.active) return;
        
        const s = state.current;
        const dx = s.drag.startX - x;
        const dy = s.drag.startY - y;
        const pull = Math.sqrt(dx*dx + dy*dy);
        
        if (pull > 20) {
            const angle = Math.atan2(dy, dx);
            const power = Math.min(pull, 150) * 0.15; // Power scaling
            
            const bowX = canvasRef.current!.width / 2;
            const bowY = canvasRef.current!.height - 80;

            s.arrows.push({
                x: bowX,
                y: bowY,
                vx: Math.cos(angle) * power,
                vy: Math.sin(angle) * power,
                angle: angle,
                active: true,
                trail: []
            });
            playSound('shoot');
        }
        
        s.drag.active = false;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleMouseDown = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            startDrag(e.clientX - rect.left, e.clientY - rect.top);
        };
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            moveDrag(e.clientX - rect.left, e.clientY - rect.top);
        };
        const handleMouseUp = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            endDrag(e.clientX - rect.left, e.clientY - rect.top);
        };

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            startDrag(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        };
        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            moveDrag(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        };
        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            // Use last known position for end
            endDrag(state.current.drag.currentX, state.current.drag.currentY);
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        // Resize
        const resize = () => {
             const parent = canvas.parentElement;
             if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                state.current.running = true;
             }
        };
        resize();
        window.addEventListener('resize', resize);
        
        requestRef.current = requestAnimationFrame(update);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('resize', resize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [update]);

    return (
        <div className="relative w-full h-full">
            <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
            
            {/* Hint Overlay */}
            {!state.current.running && state.current.score === 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                    <Target className="w-12 h-12 text-orange-400 mx-auto mb-2 animate-bounce" />
                    <p className="text-white font-arcade text-sm">DRAG ANYWHERE TO AIM</p>
                </div>
            )}
        </div>
    );
};

export default NeonArcheryGame;