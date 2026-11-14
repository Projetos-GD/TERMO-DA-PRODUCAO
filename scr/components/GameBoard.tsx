/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { evaluateGuess, normalizeText } from '../utils';
import { LetterStatus, GameMode } from '../types';
import { Check } from 'lucide-react';

interface GameBoardProps {
  secretWord: string;
  guesses: string[];
  currentGuess: string;
  isSolved: boolean;
  maxGuesses?: number;
  selectedLetterIndex?: number;
  onCellClick?: (letterIndex: number) => void;
  mode?: GameMode;
  boardNumber?: number;
  totalBoards?: number;
}

export default function GameBoard({ 
  secretWord, 
  guesses, 
  currentGuess, 
  isSolved,
  maxGuesses = 6,
  selectedLetterIndex = 0,
  onCellClick,
  mode = 'termo',
  boardNumber,
  totalBoards = 1
}: GameBoardProps) {
  const wordLength = secretWord.length;
  const rows = Array(maxGuesses).fill(null);

  // Dynamic grid column class
  const gridColsClass = {
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10'
  }[wordLength as 5 | 6 | 7 | 8 | 9 | 10] || 'grid-cols-6';

  // Responsive sizing tailored to 1 (Termo), 2 (Dueto), or 4 (Quarteto) boards
  const getCellSizeClass = () => {
    if (mode === 'quarteto') {
      // 4 boards: ultra compact to fit desktop / mobile cleanly
      switch (wordLength) {
        case 5:
          return 'w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 text-[11px] sm:text-sm md:text-base gap-0.5 sm:gap-1';
        case 6:
          return 'w-5.5 h-5.5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[10px] sm:text-xs md:text-sm gap-0.5 sm:gap-1';
        case 7:
        case 8:
          return 'w-5 h-5 sm:w-6.5 sm:h-6.5 md:w-7.5 md:h-7.5 text-[9px] sm:text-[11px] md:text-xs gap-0.5';
        default:
          return 'w-4.5 h-4.5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[8px] sm:text-[10px] md:text-xs gap-0.5';
      }
    } else if (mode === 'dueto') {
      // 2 boards: medium compact
      switch (wordLength) {
        case 5:
          return 'w-8 h-8 sm:w-11 sm:h-11 md:w-12 md:h-12 text-sm sm:text-lg md:text-xl gap-1 sm:gap-1.5';
        case 6:
          return 'w-7.5 h-7.5 sm:w-10 sm:h-10 md:w-11 md:h-11 text-xs sm:text-base md:text-lg gap-1 sm:gap-1.5';
        case 7:
          return 'w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 text-[11px] sm:text-sm md:text-base gap-1';
        default:
          return 'w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 text-[10px] sm:text-xs md:text-sm gap-0.5 sm:gap-1';
      }
    } else {
      // 1 board: generous full size
      switch (wordLength) {
        case 5:
          return 'w-11 h-11 sm:w-14 sm:h-14 gap-1.5 sm:gap-2 text-xl sm:text-2xl';
        case 6:
          return 'w-10 h-10 sm:w-13 sm:h-13 gap-1.5 text-lg sm:text-xl';
        case 7:
          return 'w-9 h-9 sm:w-12 sm:h-12 gap-1.5 text-base sm:text-lg';
        case 8:
          return 'w-8 h-8 sm:w-11 sm:h-11 gap-1 text-sm sm:text-base';
        case 9:
          return 'w-7.5 h-7.5 sm:w-10 sm:h-10 gap-1 text-xs sm:text-sm';
        case 10:
        default:
          return 'w-7 h-7 sm:w-9 sm:h-9 gap-1 text-[11px] sm:text-xs';
      }
    }
  };

  const cellSizeClass = getCellSizeClass();

  return (
    <div 
      id={`game-board-${boardNumber || 1}`}
      className="flex flex-col items-center justify-center p-1 sm:p-2 select-none relative"
    >
      {/* Optional board label for multi-board mode */}
      {totalBoards > 1 && (
        <div className="w-full flex items-center justify-between px-1 mb-1 text-[11px] sm:text-xs text-[#818384] font-bold uppercase tracking-wider">
          <span>Palavra {boardNumber}</span>
          {isSolved && (
            <span className="flex items-center gap-0.5 text-[#538d4e] font-black text-[10px] sm:text-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Feito!
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 sm:gap-1.5 w-full items-center">
        {rows.map((_, rowIndex) => {
          const isSubmitted = rowIndex < guesses.length;
          // If this board is already solved, it no longer accepts an active typing row
          const isCurrent = !isSolved && rowIndex === guesses.length;
          
          let rowGuess = '';
          if (isSubmitted) {
            rowGuess = guesses[rowIndex];
          } else if (isCurrent) {
            rowGuess = currentGuess.padEnd(wordLength, ' ');
          } else {
            rowGuess = ' '.repeat(wordLength);
          }

          // Evaluate letter statuses for submitted rows
          const statuses = isSubmitted 
            ? evaluateGuess(rowGuess, secretWord)
            : Array(wordLength).fill('empty') as LetterStatus[];

          return (
            <div 
              id={`board-${boardNumber || 1}-row-${rowIndex}`}
              key={rowIndex} 
              className={`grid ${gridColsClass} justify-center gap-1 sm:gap-1.5`}
            >
              {Array.from({ length: wordLength }).map((_, letterIndex) => {
                const rawChar = rowGuess[letterIndex] || '';
                const isTypedChar = rawChar !== ' ';
                const status = statuses[letterIndex];

                // Automatic diacritic restoration on correct letters
                let displayChar = rawChar.trim();
                if (isSubmitted && displayChar) {
                  const targetChar = secretWord[letterIndex];
                  if (normalizeText(targetChar) === normalizeText(displayChar)) {
                    displayChar = targetChar;
                  }
                }

                // Styling states
                const isSelected = isCurrent && letterIndex === selectedLetterIndex;
                let cellBg = 'bg-[#2a2425]/40 border-2 border-[#3a3536]';
                let textClass = 'text-white font-black';

                if (isSubmitted) {
                  if (status === 'correct') {
                    cellBg = 'bg-[#3aa394] border-[#3aa394] shadow-sm shadow-[#3aa394]/20'; // Teal Green
                  } else if (status === 'present') {
                    cellBg = 'bg-[#d1a252] border-[#d1a252] shadow-sm shadow-[#d1a252]/20'; // Warm Ochre
                  } else {
                    cellBg = 'bg-[#312c2d] border-[#312c2d] opacity-80'; // Slate absent
                  }
                } else if (isSelected) {
                  cellBg = 'bg-neutral-800/40 border-2 border-white ring-2 ring-white/30 scale-105'; // Typing cursor highlight
                } else if (isCurrent && isTypedChar) {
                  cellBg = 'bg-transparent border-2 border-[#6b6768] scale-102'; // Typing highlight
                }

                return (
                  <motion.div
                    id={`cell-${boardNumber || 1}-${rowIndex}-${letterIndex}`}
                    key={letterIndex}
                    className={`flex items-center justify-center font-sans uppercase rounded-md select-none transition-all duration-300 ${cellSizeClass} ${cellBg} ${textClass} ${isCurrent ? 'cursor-pointer hover:bg-white/10' : ''}`}
                    onClick={isCurrent && onCellClick ? () => onCellClick(letterIndex) : undefined}
                    initial={{ rotateX: 0, scale: 1 }}
                    animate={
                      isSubmitted 
                        ? { 
                            rotateX: [0, 90, 0],
                            scale: [1, 0.95, 1]
                          }
                        : isSelected
                          ? { scale: [1, 1.05, 1.05] }
                          : isCurrent && isTypedChar && rawChar.trim() !== ''
                            ? { scale: [1, 1.12, 1] }
                            : {}
                    }
                    transition={{
                      duration: isSubmitted ? 0.38 : 0.12,
                      delay: isSubmitted ? letterIndex * 0.06 : 0,
                      ease: "easeInOut"
                    }}
                  >
                    <span className="leading-none">{displayChar}</span>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
