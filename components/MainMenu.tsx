import React from 'react';
import { GameKey, HighScores, GameMetadata } from '../types';
import { Play, Trophy, Cpu, Zap, Activity, Layers, Grid, ArrowRight, Globe, CarFront } from 'lucide-react';

interface MainMenuProps {
  onSelectGame: (game: GameKey) => void;
  highScores: HighScores;
}

const GAMES: GameMetadata[] = [
  {
    id: GameKey.RACING,
    title: "NEON RACER",
    description: "Adrenaline rush. Dodge traffic at high speeds.",
    iconColor: "text-orange-400"
  },
  {
    id: GameKey.SNAKE,
    title: "NEON SNAKE",
    description: "Classic redefined. Collect energy orbs in a cyber grid.",
    iconColor: "text-cyan-400"
  },
  {
    id: GameKey.GALAXY,
    title: "GALAXY RAID",
    description: "Defend humanity. Shoot down invaders in deep space.",
    iconColor: "text-purple-400"
  },
  {
    id: GameKey.PONG,
    title: "NEON PONG",
    description: "High-speed duels. Master the physics of light.",
    iconColor: "text-pink-400"
  },
  {
    id: GameKey.BREAKER,
    title: "NEON BREAKER",
    description: "Smash the system. Explosive brick-breaking action.",
    iconColor: "text-red-400"
  },
  {
    id: GameKey.SLIDE,
    title: "NEON SLIDE",
    description: "Solve the matrix. A sliding puzzle challenge.",
    iconColor: "text-yellow-400"
  },
  {
    id: GameKey.STACK,
    title: "NEON STACK",
    description: "Reach the sky. Precision stacking for high scores.",
    iconColor: "text-green-400"
  }
];

// Helper for theme-based styles
const getThemeStyles = (id: GameKey) => {
    switch (id) {
        case GameKey.RACING: return {
            border: 'group-hover:border-orange-500/50',
            shadow: 'group-hover:shadow-[0_0_50px_-12px_rgba(249,115,22,0.4)]',
            bg: 'bg-gradient-to-br from-orange-500/20 via-transparent to-transparent',
            icon: <CarFront className="w-5 h-5" />,
            color: 'text-orange-400'
        };
        case GameKey.SNAKE: return {
            border: 'group-hover:border-cyan-500/50',
            shadow: 'group-hover:shadow-[0_0_50px_-12px_rgba(34,211,238,0.4)]',
            bg: 'bg-gradient-to-br from-cyan-500/20 via-transparent to-transparent',
            icon: <Activity className="w-5 h-5" />,
            color: 'text-cyan-400'
        };
        case GameKey.GALAXY: return {
            border: 'group-hover:border-purple-500/50',
            shadow: 'group-hover:shadow-[0_0_50px_-12px_rgba(168,85,247,0.4)]',
            bg: 'bg-gradient-to-br from-purple-500/20 via-transparent to-transparent',
            icon: <Zap className="w-5 h-5" />,
            color: 'text-purple-400'
        };
        case GameKey.PONG: return {
            border: 'group-hover:border-pink-500/50',
            shadow: 'group-hover:shadow-[0_0_50px_-12px_rgba(236,72,153,0.4)]',
            bg: 'bg-gradient-to-br from-pink-500/20 via-transparent to-transparent',
            icon: <Grid className="w-5 h-5" />,
            color: 'text-pink-400'
        };
        case GameKey.BREAKER: return {
            border: 'group-hover:border-red-500/50',
            shadow: 'group-hover:shadow-[0_0_50px_-12px_rgba(239,68,68,0.4)]',
            bg: 'bg-gradient-to-br from-red-500/20 via-transparent to-transparent',
            icon: <Cpu className="w-5 h-5" />,
            color: 'text-red-400'
        };
        case GameKey.SLIDE: return {
            border: 'group-hover:border-yellow-500/50',
            shadow: 'group-hover:shadow-[0_0_50px_-12px_rgba(234,179,8,0.4)]',
            bg: 'bg-gradient-to-br from-yellow-500/20 via-transparent to-transparent',
            icon: <Layers className="w-5 h-5" />,
            color: 'text-yellow-400'
        };
        case GameKey.STACK: return {
            border: 'group-hover:border-green-500/50',
            shadow: 'group-hover:shadow-[0_0_50px_-12px_rgba(34,197,94,0.4)]',
            bg: 'bg-gradient-to-br from-green-500/20 via-transparent to-transparent',
            icon: <Layers className="w-5 h-5 rotate-180" />,
            color: 'text-green-400'
        };
        default: return {
            border: 'group-hover:border-white/50',
            shadow: 'group-hover:shadow-white/20',
            bg: '',
            icon: <Play className="w-5 h-5" />,
            color: 'text-white'
        };
    }
};

const MainMenu: React.FC<MainMenuProps> = ({ onSelectGame, highScores }) => {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-6xl">
      
      {/* Header - Removed Hacker Theme */}
      <div className="flex flex-col items-center justify-center mb-16 text-center space-y-4">
         <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
             <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
             <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-slate-300">
               Live Arcade
             </span>
         </div>
         
         <div className="relative">
            <h1 className="font-arcade text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-500 drop-shadow-2xl">
              SAIFUL
              <br />
              <span className="text-stroke-white text-transparent">ARCADE</span>
            </h1>
         </div>
         
         <p className="max-w-md text-slate-400 text-sm font-medium leading-relaxed tracking-wide">
            Experience the next evolution of retro gaming.
         </p>
      </div>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
        {GAMES.map((game) => {
          const styles = getThemeStyles(game.id);
          
          return (
            <div 
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`group relative overflow-hidden bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-6 cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] ${styles.border} ${styles.shadow}`}
            >
              {/* Dynamic Background Gradient on Hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out ${styles.bg}`} />
              
              <div className="relative z-10 flex flex-col h-full">
                
                {/* Top Row: Icon & Score */}
                <div className="flex justify-between items-start mb-4">
                   <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300 ${styles.color}`}>
                      {styles.icon}
                   </div>
                   
                   {highScores[game.id] > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span className="font-mono text-[10px] font-bold text-white tracking-wider">{highScores[game.id]}</span>
                      </div>
                   )}
                </div>

                {/* Title & Desc */}
                <h3 className="font-arcade text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                  {game.title}
                </h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6 group-hover:text-slate-400 transition-colors">
                  {game.description}
                </p>

                {/* Bottom Action */}
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between group-hover:border-white/10 transition-colors">
                   <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold group-hover:text-slate-500">Play Now</span>
                   </div>
                   
                   <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300 ${styles.color} group-hover:text-black`}>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-45" />
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Developer Section */}
      <div className="mt-16 relative group overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0F0F0F] to-[#050505] border border-white/5 p-8 text-center transition-all duration-500 hover:border-white/10">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
         
         <div className="relative z-10 flex flex-col items-center">
            <h3 className="font-arcade text-xs text-slate-500 mb-2 tracking-[0.4em] uppercase font-bold">
              Developed By
            </h3>
            
            <div className="flex items-center gap-3">
              <h2 className="font-arcade text-3xl md:text-5xl font-black text-white tracking-tight">
                RIFAT HASAN
              </h2>
              
              {/* Website Link Icon */}
              <a 
                href="https://rifat-hassan-premium-link-in-bio-wy.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 border border-white/10 text-neon-blue hover:bg-neon-blue hover:text-black hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                title="Visit Portfolio"
              >
                <Globe className="w-6 h-6" />
              </a>
            </div>
         </div>
      </div>

      <footer className="mt-12 text-center">
         <p className="text-slate-700 text-[10px] tracking-[0.3em] uppercase font-bold hover:text-slate-500 transition-colors cursor-default">
            &copy; {new Date().getFullYear()} Saiful Arcade Systems
         </p>
      </footer>
    </div>
  );
};

export default MainMenu;