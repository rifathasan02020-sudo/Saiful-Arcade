import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameKey } from '../types';
import { ChevronLeft, RotateCcw, Home } from 'lucide-react';
import SnakeGame from './games/SnakeGame';
import GalaxyRaidGame from './games/GalaxyRaidGame';
import NeonPongGame from './games/NeonPongGame';
import NeonSlideGame from './games/NeonSlideGame';
import NeonStackGame from './games/NeonStackGame';
import NeonBreakerGame from './games/NeonBreakerGame';
import NeonRacerGame from './games/NeonRacerGame';

interface GameShellProps {
  gameKey: GameKey;
  highScore: number;
  onUpdateScore: (score: number) => void;
  onBack: () => void;
}

const GameShell: React.FC<GameShellProps> = ({ gameKey, highScore, onUpdateScore, onBack }) => {
  const [currentScore, setCurrentScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameId, setGameId] = useState(0); 

  const handleGameOver = useCallback((score: number) => {
    const finalScore = isNaN(score) ? 0 : score;
    setCurrentScore(finalScore);
    setIsGameOver(true);
    onUpdateScore(finalScore);
  }, [onUpdateScore]);

  const handleScoreUpdate = useCallback((score: number) => {
    const safeScore = isNaN(score) ? 0 : score;
    setCurrentScore(safeScore);
  }, []);

  const handleRestart = () => {
    setIsGameOver(false);
    setCurrentScore(0);
    setGameId(prev => prev + 1);
  };

  const gameComponent = useMemo(() => {
    const props = {
      key: gameId,
      onGameOver: handleGameOver,
      onScoreUpdate: handleScoreUpdate,
      isActive: true
    };

    switch (gameKey) {
      case GameKey.SNAKE: return <SnakeGame {...props} />;
      case GameKey.GALAXY: return <GalaxyRaidGame {...props} />;
      case GameKey.PONG: return <NeonPongGame {...props} />;
      case GameKey.SLIDE: return <NeonSlideGame {...props} />;
      case GameKey.STACK: return <NeonStackGame {...props} />;
      case GameKey.BREAKER: return <NeonBreakerGame {...props} />;
      case GameKey.RACING: return <NeonRacerGame {...props} />;
      default: return null;
    }
  }, [gameKey, gameId, handleGameOver, handleScoreUpdate]);

  const getTitle = () => {
    switch (gameKey) {
      case GameKey.SNAKE: return "NEON SNAKE";
      case GameKey.GALAXY: return "GALAXY RAID";
      case GameKey.PONG: return "NEON PONG";
      case GameKey.SLIDE: return "NEON SLIDE";
      case GameKey.STACK: return "NEON STACK";
      case GameKey.BREAKER: return "NEON BREAKER";
      case GameKey.RACING: return "NEON RACER";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 md:p-6 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 bg-[#0A0A0A] rounded-2xl p-4 border border-[#1A1A1A]">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={onBack}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#151515] hover:bg-[#222] transition-colors text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-arcade text-lg md:text-xl font-bold text-white tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
              {getTitle()}
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 shrink-0">
           <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Best</p>
            <p className="font-mono text-xl font-bold text-neon-blue">
                {isNaN(Math.max(currentScore, highScore)) ? 0 : Math.max(currentScore, highScore)}
            </p>
          </div>
          <div className="w-px h-8 bg-[#222] hidden xs:block"></div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Score</p>
            <p className="font-mono text-xl font-bold text-white">
                {isNaN(currentScore) ? 0 : currentScore}
            </p>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative bg-black rounded-[2rem] border border-[#1A1A1A] overflow-hidden shadow-2xl">
        {gameComponent}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
            <h2 className="font-arcade text-5xl md:text-7xl font-black text-white mb-4 text-glow whitespace-nowrap">GAME OVER</h2>
            <p className="text-slate-400 font-mono text-xl mb-12">FINAL SCORE: <span className="text-neon-blue text-2xl ml-2">{currentScore}</span></p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm px-6">
              <button 
                onClick={handleRestart}
                className="w-full py-4 bg-white text-black font-arcade font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <RotateCcw className="w-5 h-5" />
                TRY AGAIN
              </button>
              <button 
                onClick={onBack}
                className="w-full py-4 bg-[#111] text-white font-arcade font-bold rounded-xl hover:bg-[#222] transition-all border border-[#222] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Home className="w-5 h-5" />
                MENU
              </button>
            </div>
          </div>
        )}
      </div>
       <div className="mt-4 text-center text-slate-700 text-xs hidden md:block tracking-widest uppercase whitespace-nowrap">
        {gameKey === GameKey.RACING ? 'TAP LEFT/RIGHT TO STEER • HOLD UP FOR TURBO' : 'Use Arrow Keys or Touch Sides to Play'}
      </div>
    </div>
  );
};

export default GameShell;