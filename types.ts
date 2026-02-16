export enum GameKey {
  SNAKE = 'SNAKE',
  GALAXY = 'GALAXY',
  PONG = 'PONG',
  SLIDE = 'SLIDE',
  STACK = 'STACK',
  BREAKER = 'BREAKER',
  RACING = 'RACING'
}

export interface GameMetadata {
  id: GameKey;
  title: string;
  description: string;
  iconColor: string;
}

export interface GameProps {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

export interface HighScores {
  [GameKey.SNAKE]: number;
  [GameKey.GALAXY]: number;
  [GameKey.PONG]: number;
  [GameKey.SLIDE]: number;
  [GameKey.STACK]: number;
  [GameKey.BREAKER]: number;
  [GameKey.RACING]: number;
}