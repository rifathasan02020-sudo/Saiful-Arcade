import React, { useRef, useEffect, useCallback } from 'react';
import { GameProps } from '../../types';

const NeonPongGame: React.FC<GameProps> = ({ onGameOver, onScoreUpdate, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const state = useRef({
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: 6 }, // Small ball
    paddleX: 0, // Player X (Bottom)
    aiX: 0,     // AI X (Top)
    paddleW: 80, // Reduced from 100 for more challenge
    paddleH: 12,  // Vertical Thickness
    score: 0,
    running: isActive,
    keys: { left: false, right: false } // Added keyboard state
  });

  const requestRef = useRef<number>();

  // Initialize Audio Context
  useEffect(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playSound = (type: 'hit' | 'over' | 'score') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;

    if (type === 'hit') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'score') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1000, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'over') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  };

  // Initialize ball and positions based on canvas size
  const initGame = (canvas: HTMLCanvasElement) => {
    // Slightly smaller paddles: 80px mobile, 120px desktop (was 100/140)
    state.current.paddleW = canvas.width < 500 ? 80 : 120; 
    
    state.current.ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 8, // Increased horizontal variation range
        vy: 7, // Increased initial speed from 4 to 7
        r: 6
    };
    
    state.current.paddleX = (canvas.width - state.current.paddleW) / 2;
    state.current.aiX = (canvas.width - state.current.paddleW) / 2;
  };

  const update = useCallback(() => {
    if (!state.current.running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const s = state.current;

    // Keyboard Movement Logic
    if (s.keys.left) s.paddleX -= 9; // Slightly faster paddle for faster ball
    if (s.keys.right) s.paddleX += 9;
    // Clamp Player Paddle
    s.paddleX = Math.max(0, Math.min(canvas.width - s.paddleW, s.paddleX));
    
    // Move Ball
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    // Bounce Left/Right Walls
    if (s.ball.x < s.ball.r || s.ball.x > canvas.width - s.ball.r) {
        s.ball.vx *= -1;
        // Keep inside bounds
        s.ball.x = Math.max(s.ball.r, Math.min(canvas.width - s.ball.r, s.ball.x));
    }

    // AI Movement (Top Paddle)
    const aiCenter = s.aiX + s.paddleW / 2;
    // Increased AI Speed to keep up with faster ball (was 3.5)
    const maxAiSpeed = 5.5 + (s.score * 0.2); 
    let move = s.ball.x - aiCenter;
    
    // Clamp move speed
    if (Math.abs(move) > maxAiSpeed) move = Math.sign(move) * maxAiSpeed;
    
    s.aiX += move;
    
    // Clamp AI Paddle to screen
    s.aiX = Math.max(0, Math.min(canvas.width - s.paddleW, s.aiX));

    // Define Paddle Y positions
    const playerY = canvas.height - 30; // Bottom with margin
    const aiY = 30; // Top with margin

    // Collision: Player Paddle (Bottom)
    if (s.ball.y + s.ball.r >= playerY && 
        s.ball.y - s.ball.r < playerY + s.paddleH && 
        s.ball.x >= s.paddleX - 10 && 
        s.ball.x <= s.paddleX + s.paddleW + 10) {
        
        if (s.ball.vy > 0) { // Only collide if moving down
            s.ball.vy = -Math.abs(s.ball.vy) * 1.05; // Bounce up and speed up slightly
            
            playSound('hit');

            // Add spin/angle based on where it hit the paddle
            const hitOffset = (s.ball.x - (s.paddleX + s.paddleW / 2)) / (s.paddleW / 2);
            s.ball.vx += hitOffset * 5; 
        }
    }

    // Collision: AI Paddle (Top)
    if (s.ball.y - s.ball.r <= aiY + s.paddleH && 
        s.ball.y + s.ball.r > aiY &&
        s.ball.x >= s.aiX - 10 && 
        s.ball.x <= s.aiX + s.paddleW + 10) {
            
        if (s.ball.vy < 0) { // Only collide if moving up
            s.ball.vy = Math.abs(s.ball.vy); // Bounce down
            playSound('hit');
        }
    }

    // Game Over: Ball passes Player (Bottom)
    if (s.ball.y - s.ball.r > canvas.height) {
      playSound('over');
      s.running = false;
      onGameOver(s.score);
      return;
    }

    // AI Miss: Ball passes AI (Top) - PLAYER WINS POINT
    if (s.ball.y + s.ball.r < 0) {
        playSound('score');
        // Reset ball to center
        s.ball.x = canvas.width / 2;
        s.ball.y = canvas.height / 2;
        s.ball.vy = 7; // Reset to fast speed
        s.ball.vx = (Math.random() - 0.5) * 8;
        s.score += 1; 
        onScoreUpdate(s.score);
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [onGameOver, onScoreUpdate]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center Line (Horizontal)
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([10, 15]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height/2);
    ctx.lineTo(canvas.width, canvas.height/2);
    ctx.stroke();
    ctx.setLineDash([]);

    const s = state.current;
    const playerY = canvas.height - 30;
    const aiY = 30;

    // Player Paddle (Bottom) - Neon Blue
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(s.paddleX, playerY, s.paddleW, s.paddleH);

    // AI Paddle (Top) - Neon Pink
    ctx.shadowColor = '#ec4899';
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(s.aiX, aiY, s.paddleW, s.paddleH);

    // Ball
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    // Input Handling (Horizontal)
    const handleMove = (clientX: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        
        // Center paddle on pointer
        state.current.paddleX = x - state.current.paddleW / 2;
        // Clamp will happen in update loop as well, but good for visual responsiveness
        state.current.paddleX = Math.max(0, Math.min(canvas.width - state.current.paddleW, state.current.paddleX));
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        handleMove(e.touches[0].clientX);
    };

    // Keyboard Listeners
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') state.current.keys.left = true;
        if (e.key === 'ArrowRight') state.current.keys.right = true;
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') state.current.keys.left = false;
        if (e.key === 'ArrowRight') state.current.keys.right = false;
    };

    const canvas = canvasRef.current;
    if(canvas) {
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        
        // Resize logic
        const resize = () => {
             const parent = canvas.parentElement;
             if (parent) {
                 canvas.width = parent.clientWidth;
                 canvas.height = parent.clientHeight;
                 // Re-init if ball is 0,0 (first load)
                 if (state.current.ball.vx === 0 && state.current.ball.vy === 0) {
                     initGame(canvas);
                 }
                 // Recalculate responsive width
                 state.current.paddleW = canvas.width < 500 ? 80 : 120;
                 
                 // Ensure paddles stay in bounds after resize
                 state.current.paddleX = Math.min(state.current.paddleX, canvas.width - state.current.paddleW);
                 state.current.aiX = Math.min(state.current.aiX, canvas.width - state.current.paddleW);
             }
        };
        resize();
        window.addEventListener('resize', resize);

        requestRef.current = requestAnimationFrame(update);
        
        return () => {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('resize', resize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }
  }, [update]);

  return (
    <canvas ref={canvasRef} className="w-full h-full block cursor-none touch-none" />
  );
};

export default NeonPongGame;