import React, { useState, useEffect } from 'react';
import { GameKey, HighScores } from './types';
import MainMenu from './components/MainMenu';
import GameShell from './components/GameShell';

const App: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameKey | null>(null);
  const [highScores, setHighScores] = useState<HighScores>({
    [GameKey.SNAKE]: 0,
    [GameKey.GALAXY]: 0,
    [GameKey.PONG]: 0,
    [GameKey.SLIDE]: 0,
    [GameKey.STACK]: 0,
    [GameKey.BREAKER]: 0,
    [GameKey.RACING]: 0,
  });

  // Load scores from local storage on mount
  useEffect(() => {
    const savedScores = localStorage.getItem('saiful-arcade-scores');
    if (savedScores) {
      try {
        setHighScores(prev => ({
          ...prev,
          ...JSON.parse(savedScores)
        }));
      } catch (e) {
        console.error("Failed to parse scores", e);
      }
    }
  }, []);

  // Save scores when they change
  useEffect(() => {
    localStorage.setItem('saiful-arcade-scores', JSON.stringify(highScores));
  }, [highScores]);

  const handleUpdateHighScore = (game: GameKey, score: number) => {
    if (score > highScores[game]) {
      setHighScores(prev => ({
        ...prev,
        [game]: score
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden selection:bg-neon-pink selection:text-white font-body">
      {/* Animated Background Picture Layer - REMOVED IMAGE, KEPT SUBTLE GRADIENTS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Vibrant Gradient Orbs */}
        <div className="absolute top-[-20%] left-[20%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen z-20 animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-pink-600/10 rounded-full blur-[120px] mix-blend-screen z-20 animate-pulse-slow" />
      </div>

      <main className="relative z-30 w-full min-h-screen flex flex-col items-center justify-center py-8">
        {activeGame === null ? (
          <MainMenu 
            onSelectGame={setActiveGame} 
            highScores={highScores} 
          />
        ) : (
          <GameShell 
            gameKey={activeGame}
            highScore={highScores[activeGame]}
            onUpdateScore={(score) => handleUpdateHighScore(activeGame, score)}
            onBack={() => setActiveGame(null)}
          />
        )}
      </main>
    </div>
  );
};

export default App;