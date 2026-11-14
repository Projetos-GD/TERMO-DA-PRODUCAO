/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LetterStatus = 'empty' | 'correct' | 'present' | 'absent';

export interface CellState {
  letter: string;
  status: LetterStatus;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export type GameMode = 'termo' | 'dueto' | 'quarteto';

export interface BoardState {
  id: number;
  secretWord: string;
  guesses: string[];
  isSolved: boolean;
  solvedAtGuess?: number;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  distribution: { [key: number]: number }; // index is number of guesses (1-6, 1-7, or 1-9)
}

export interface WordConfig {
  5: string[];
  6: string[];
  7: string[];
  8: string[];
  9: string[];
  10: string[];
}
