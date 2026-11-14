/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Delete } from 'lucide-react';
import { evaluateGuess, normalizeText } from '../utils';
import { LetterStatus, GameMode, BoardState } from '../types';

interface KeyboardProps {
  boards: BoardState[];
  mode: GameMode;
  onKeyPress: (key: string) => void;
}

export default function Keyboard({ boards, mode, onKeyPress }: KeyboardProps) {
  
  // Compute letter statuses for each board independently
  // Returns an array of dictionaries: [ { 'A': 'correct', ... }, { 'A': 'absent', ... } ]
  const boardsLetterStatuses = boards.map(board => {
    const statuses: { [key: string]: LetterStatus } = {};

    board.guesses.forEach(guess => {
      const evaluation = evaluateGuess(guess, board.secretWord);
      const normalizedGuess = normalizeText(guess);

      for (let i = 0; i < normalizedGuess.length; i++) {
        const letter = normalizedGuess[i];
        const letterStatus = evaluation[i];

        // Priority order: correct > present > absent
        const currentBest = statuses[letter];
        if (!currentBest) {
          statuses[letter] = letterStatus;
        } else if (currentBest === 'absent' && (letterStatus === 'present' || letterStatus === 'correct')) {
          statuses[letter] = letterStatus;
        } else if (currentBest === 'present' && letterStatus === 'correct') {
          statuses[letter] = letterStatus;
        }
      }
    });

    return statuses;
  });

  // Color segment classes
  const getStatusColorClass = (status?: LetterStatus): string => {
    switch (status) {
      case 'correct':
        return 'bg-[#3aa394]'; // Teal Green
      case 'present':
        return 'bg-[#d1a252]'; // Warm Ochre
      case 'absent':
        return 'bg-[#312c2d]'; // Absent Slate
      default:
        return 'bg-[#818384]'; // Neutral Gray
    }
  };

  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  const handleKeyClick = (key: string) => {
    onKeyPress(key);
  };

  // Render the visual background for a letter key based on active mode
  const renderKeyBackground = (key: string) => {
    const normKey = normalizeText(key);

    if (mode === 'dueto') {
      const status0 = boardsLetterStatuses[0]?.[normKey];
      const status1 = boardsLetterStatuses[1]?.[normKey];

      // If neither board has encountered this letter, show default gray
      if (!status0 && !status1) {
        return <div className="absolute inset-0 bg-[#818384] transition-colors duration-200" />;
      }

      return (
        <div className="absolute inset-0 grid grid-cols-2 rounded-md overflow-hidden pointer-events-none transition-all">
          <div className={`${getStatusColorClass(status0)} border-r border-black/20`} />
          <div className={getStatusColorClass(status1)} />
        </div>
      );
    }

    if (mode === 'quarteto') {
      const status0 = boardsLetterStatuses[0]?.[normKey];
      const status1 = boardsLetterStatuses[1]?.[normKey];
      const status2 = boardsLetterStatuses[2]?.[normKey];
      const status3 = boardsLetterStatuses[3]?.[normKey];

      // If none of the 4 boards has seen this letter
      if (!status0 && !status1 && !status2 && !status3) {
        return <div className="absolute inset-0 bg-[#818384] transition-colors duration-200" />;
      }

      return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-md overflow-hidden pointer-events-none transition-all">
          <div className={`${getStatusColorClass(status0)} border-r border-b border-black/20`} />
          <div className={`${getStatusColorClass(status1)} border-b border-black/20`} />
          <div className={`${getStatusColorClass(status2)} border-r border-black/20`} />
          <div className={getStatusColorClass(status3)} />
        </div>
      );
    }

    // Single board mode (Termo)
    const status = boardsLetterStatuses[0]?.[normKey];
    return (
      <div 
        className={`absolute inset-0 rounded-md transition-colors duration-200 ${
          status ? getStatusColorClass(status) : 'bg-[#818384]'
        }`} 
      />
    );
  };

  return (
    <div 
      id="virtual-keyboard"
      className="w-full max-w-xl mx-auto px-2 sm:px-4 flex flex-col gap-1.5 sm:gap-2 select-none"
    >
      {/* Row 1 */}
      <div className="flex justify-center gap-1 sm:gap-1.5">
        {row1.map(key => (
          <button
            id={`key-${key}`}
            key={key}
            onClick={() => handleKeyClick(key)}
            className="relative flex-1 h-11 sm:h-13 rounded-md text-sm sm:text-base font-black flex items-center justify-center border border-transparent shadow-sm hover:brightness-110 active:scale-95 transition-transform duration-100 cursor-pointer overflow-hidden"
          >
            {renderKeyBackground(key)}
            <span className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {key}
            </span>
          </button>
        ))}
      </div>

      {/* Row 2 */}
      <div className="flex justify-center gap-1 sm:gap-1.5 pl-2 sm:pl-3">
        {row2.map(key => (
          <button
            id={`key-${key}`}
            key={key}
            onClick={() => handleKeyClick(key)}
            className="relative flex-1 h-11 sm:h-13 rounded-md text-sm sm:text-base font-black flex items-center justify-center border border-transparent shadow-sm hover:brightness-110 active:scale-95 transition-transform duration-100 cursor-pointer overflow-hidden"
          >
            {renderKeyBackground(key)}
            <span className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {key}
            </span>
          </button>
        ))}
        {/* Backspace integrated into Row 2 */}
        <button
          id="key-backspace"
          onClick={() => handleKeyClick('BACKSPACE')}
          className="px-3 sm:px-5 h-11 sm:h-13 rounded-md bg-[#818384] text-white hover:bg-[#969899] active:scale-95 flex items-center justify-center transition-all duration-150 cursor-pointer min-w-[46px] sm:min-w-[65px] shadow-sm"
          aria-label="Deletar caractere"
        >
          <Delete className="w-5 h-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
        </button>
      </div>

      {/* Row 3 */}
      <div className="flex justify-center gap-1 sm:gap-1.5 pl-3 sm:pl-5">
        {row3.map(key => (
          <button
            id={`key-${key}`}
            key={key}
            onClick={() => handleKeyClick(key)}
            className="relative flex-1 h-11 sm:h-13 rounded-md text-sm sm:text-base font-black flex items-center justify-center border border-transparent shadow-sm hover:brightness-110 active:scale-95 transition-transform duration-100 cursor-pointer overflow-hidden"
          >
            {renderKeyBackground(key)}
            <span className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {key}
            </span>
          </button>
        ))}
        
        {/* ENTER Button on bottom right */}
        <button
          id="key-enter"
          onClick={() => handleKeyClick('ENTER')}
          className="flex-[1.8] h-11 sm:h-13 rounded-md bg-[#818384] text-xs sm:text-sm font-black text-white hover:bg-[#969899] active:scale-95 flex items-center justify-center uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-sm px-2"
        >
          <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">ENTER</span>
        </button>
      </div>
    </div>
  );
}
