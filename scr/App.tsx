/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  HelpCircle, 
  BarChart2, 
  RefreshCw, 
  Layers,
  X,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

import { 
  WordConfig, 
  GameStats, 
  GameStatus, 
  GameMode, 
  BoardState 
} from './types';
import { 
  DEFAULT_OBFUSCATED_WORDS, 
  DEFAULT_RAW_WORDS,
  deobfuscate, 
  normalizeText, 
  getMaxGuessesForMode,
  getWordCountForMode,
  getWordsForGame
} from './utils';
import GameBoard from './components/GameBoard';
import Keyboard from './components/Keyboard';
import AdminPanel from './components/AdminPanel';
import StatsModal from './components/StatsModal';
import { loadDictionary, isValidPortugueseWord } from './dictionary';

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
};

export default function App() {
  // Game Mode: 'termo' (1 palavra), 'dueto' (2 palavras), 'quarteto' (4 palavras)
  const [gameMode, setGameMode] = useState<GameMode>('termo');
  // Word Length: 5 to 10 letters (defaulting to 5 as in official Termo/Dueto/Quarteto)
  const [wordSize, setWordSize] = useState<5 | 6 | 7 | 8 | 9 | 10>(5);
  
  // Word Dictionary loaded
  const [words, setWords] = useState<WordConfig>({ ...DEFAULT_OBFUSCATED_WORDS });
  
  // Active game boards
  const [boards, setBoards] = useState<BoardState[]>([]);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [currentGuess, setCurrentGuess] = useState(' '.repeat(5));
  const [selectedLetterIndex, setSelectedLetterIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  
  // Mobile board tab filter for Quarteto (null = show all, or board index 0..3)
  const [mobileBoardFocus, setMobileBoardFocus] = useState<number | null>(null);

  // Stats nested by mode and word size: { termo: { 5: GameStats, ... }, dueto: { ... } }
  const [allStats, setAllStats] = useState<{ [mode: string]: { [size: number]: GameStats } }>({});

  // Modals & Panels visibility
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Dynamic Alerts & Row shake animation
  const [alertMessage, setAlertMessage] = useState('');
  const [shakeRow, setShakeRow] = useState(false);

  const maxGuesses = getMaxGuessesForMode(gameMode);
  const wordCount = getWordCountForMode(gameMode);

  // Initialize word settings & stats on mount
  useEffect(() => {
    // 1. Load words from localStorage with automatic upgrade to Production Engineering words
    const isProductionVersion = localStorage.getItem('termo_production_v1') === 'true';
    const storedWords = localStorage.getItem('termo_words');
    let loadedWords: WordConfig | null = null;

    if (isProductionVersion && storedWords) {
      try {
        const parsed = JSON.parse(storedWords);
        // Normalize array structure
        const normalized: Partial<WordConfig> = {};
        [5, 6, 7, 8, 9, 10].forEach(len => {
          const fallback = DEFAULT_OBFUSCATED_WORDS[len as keyof WordConfig];
          if (parsed[len] && Array.isArray(parsed[len])) {
            const list = [...parsed[len]];
            while (list.length < 7) {
              list.push(fallback[list.length] || '');
            }
            normalized[len as keyof WordConfig] = list;
          } else {
            normalized[len as keyof WordConfig] = fallback;
          }
        });
        loadedWords = normalized as WordConfig;
      } catch {
        loadedWords = null;
      }
    }

    if (!loadedWords) {
      // First time loading the new production version
      localStorage.setItem('termo_words', JSON.stringify(DEFAULT_OBFUSCATED_WORDS));
      localStorage.setItem('termo_production_v1', 'true');
      setWords({ ...DEFAULT_OBFUSCATED_WORDS });
    } else {
      setWords(loadedWords);
    }

    // 2. Load statistics from localStorage
    const storedStats = localStorage.getItem('termo_player_stats_v2');
    if (storedStats) {
      try {
        setAllStats(JSON.parse(storedStats));
      } catch {
        initStats();
      }
    } else {
      initStats();
    }

    // Show rules help modal on first visit
    const hasVisited = localStorage.getItem('termo_visitedBefore');
    if (!hasVisited) {
      setIsHelpOpen(true);
      localStorage.setItem('termo_visitedBefore', 'true');
    }
  }, []);

  // Preload Brazilian Portuguese dictionary for active word length
  useEffect(() => {
    loadDictionary(wordSize);
  }, [wordSize]);

  const initStats = () => {
    const initial: { [mode: string]: { [size: number]: GameStats } } = {
      termo: {},
      dueto: {},
      quarteto: {}
    };
    (['termo', 'dueto', 'quarteto'] as GameMode[]).forEach(m => {
      [5, 6, 7, 8, 9, 10].forEach(sz => {
        initial[m][sz] = { 
          ...DEFAULT_STATS, 
          distribution: { ...DEFAULT_STATS.distribution } 
        };
      });
    });
    setAllStats(initial);
    localStorage.setItem('termo_player_stats_v2', JSON.stringify(initial));
  };

  // Rebuild game boards when mode, word size, or words dictionary changes
  const resetGame = useCallback((
    mode = gameMode, 
    size = wordSize, 
    wordsDict = words
  ) => {
    const chosenWords = getWordsForGame(size, mode, wordsDict?.[size]);

    const newBoards: BoardState[] = chosenWords.map((secret, i) => ({
      id: i + 1,
      secretWord: secret,
      guesses: [],
      isSolved: false
    }));

    setBoards(newBoards);
    setTotalGuesses(0);
    setCurrentGuess(' '.repeat(size));
    setSelectedLetterIndex(0);
    setGameStatus('playing');
    setMobileBoardFocus(null);
    setIsStatsOpen(false);
  }, [gameMode, wordSize, words]);

  // Trigger reset whenever gameMode or wordSize changes
  useEffect(() => {
    resetGame(gameMode, wordSize, words);
  }, [gameMode, wordSize, words, resetGame]);

  const handlePlayAgain = useCallback(() => {
    setIsStatsOpen(false);
    resetGame();
  }, [resetGame]);

  const triggerAlert = (message: string) => {
    setAlertMessage(message);
    setShakeRow(true);
    setTimeout(() => {
      setAlertMessage('');
      setShakeRow(false);
    }, 2200);
  };

  // Switch game mode tab
  const handleSelectMode = (newMode: GameMode) => {
    if (newMode === gameMode) return;
    setGameMode(newMode);
    setIsStatsOpen(false);
  };

  // Switch word length
  const handleSelectWordSize = (newSize: 5 | 6 | 7 | 8 | 9 | 10) => {
    if (newSize === wordSize) return;
    setWordSize(newSize);
    setIsStatsOpen(false);
  };

  // Submit current guess row simultaneously to all unsolved boards
  const handleSubmitGuess = useCallback(() => {
    if (gameStatus !== 'playing') return;

    // Check if word has all letters typed
    const filteredGuess = currentGuess.replace(/\s/g, '');
    if (filteredGuess.length !== wordSize) {
      triggerAlert(`A palavra precisa ter exatamente ${wordSize} letras!`);
      return;
    }

    const normalizedGuess = normalizeText(currentGuess);

    // Validate that the guessed word exists in Brazilian Portuguese vocabulary
    const activeWords = boards.map(b => b.secretWord);
    if (!isValidPortugueseWord(normalizedGuess, wordSize, activeWords)) {
      triggerAlert('Essa palavra não é aceita no vocabulário!');
      return;
    }

    const newTotalGuesses = totalGuesses + 1;

    // Apply guess to each board
    let newlySolvedCount = 0;
    const updatedBoards = boards.map(board => {
      if (board.isSolved) {
        // This board was already solved earlier; freeze it without adding new guess
        return board;
      }

      const newGuesses = [...board.guesses, normalizedGuess];
      const hasWonBoard = normalizedGuess === normalizeText(board.secretWord);

      if (hasWonBoard) {
        newlySolvedCount++;
      }

      return {
        ...board,
        guesses: newGuesses,
        isSolved: hasWonBoard,
        solvedAtGuess: hasWonBoard ? newTotalGuesses : undefined
      };
    });

    setBoards(updatedBoards);
    setTotalGuesses(newTotalGuesses);
    setCurrentGuess(' '.repeat(wordSize));
    setSelectedLetterIndex(0);

    const allSolved = updatedBoards.every(b => b.isSolved);
    const maxAllowed = getMaxGuessesForMode(gameMode);
    const attemptsExhausted = !allSolved && newTotalGuesses >= maxAllowed;

    if (allSolved || attemptsExhausted) {
      const finalStatus: GameStatus = allSolved ? 'won' : 'lost';
      setGameStatus(finalStatus);

      // Record statistics
      setAllStats(prev => {
        const copy = { ...prev };
        if (!copy[gameMode]) copy[gameMode] = {};
        const sizeStat = copy[gameMode][wordSize] 
          ? { ...copy[gameMode][wordSize] }
          : { ...DEFAULT_STATS, distribution: { ...DEFAULT_STATS.distribution } };

        sizeStat.gamesPlayed += 1;
        if (allSolved) {
          sizeStat.gamesWon += 1;
          sizeStat.currentStreak += 1;
          if (sizeStat.currentStreak > sizeStat.maxStreak) {
            sizeStat.maxStreak = sizeStat.currentStreak;
          }
          sizeStat.distribution[newTotalGuesses] = (sizeStat.distribution[newTotalGuesses] || 0) + 1;
        } else {
          sizeStat.currentStreak = 0;
        }

        copy[gameMode][wordSize] = sizeStat;
        localStorage.setItem('termo_player_stats_v2', JSON.stringify(copy));
        return copy;
      });

      // Show stats modal with reveal delay
      setTimeout(() => {
        setIsStatsOpen(true);
      }, 1000 + (wordSize * 70));
    }
  }, [gameStatus, currentGuess, wordSize, totalGuesses, boards, gameMode]);

  // Handle typing inputs
  const handleKeyPress = useCallback((key: string) => {
    if (gameStatus !== 'playing') return;

    if (key === 'ENTER') {
      handleSubmitGuess();
    } else if (key === 'BACKSPACE') {
      const chars = currentGuess.split('');
      while (chars.length < wordSize) chars.push(' ');

      const currentChar = chars[selectedLetterIndex];
      if (currentChar && currentChar !== ' ') {
        chars[selectedLetterIndex] = ' ';
        setCurrentGuess(chars.join(''));
        setSelectedLetterIndex(prev => Math.max(0, prev - 1));
      } else {
        const prevIndex = Math.max(0, selectedLetterIndex - 1);
        chars[prevIndex] = ' ';
        setCurrentGuess(chars.join(''));
        setSelectedLetterIndex(prevIndex);
      }
    } else {
      const cleanKey = normalizeText(key);
      if (cleanKey.length === 1 && /[A-Z]/.test(cleanKey)) {
        const chars = currentGuess.split('');
        while (chars.length < wordSize) chars.push(' ');
        
        chars[selectedLetterIndex] = cleanKey;
        setCurrentGuess(chars.join(''));
        
        // Advance cursor
        setSelectedLetterIndex(prev => Math.min(prev + 1, wordSize - 1));
      }
    }
  }, [currentGuess, wordSize, selectedLetterIndex, gameStatus, handleSubmitGuess]);

  // Listen to physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (key === 'BACKSPACE') {
        e.preventDefault();
        handleKeyPress('BACKSPACE');
      } else if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]$/i.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyPress]);

  const currentModeStats = allStats[gameMode]?.[wordSize] || { 
    ...DEFAULT_STATS, 
    distribution: { ...DEFAULT_STATS.distribution } 
  };

  const modeTitle = {
    termo: 'TERMO',
    dueto: 'DUETO',
    quarteto: 'QUARTETO'
  }[gameMode];

  // Responsive grid wrapper classes for board area
  const getBoardsLayoutClasses = () => {
    if (gameMode === 'termo') {
      return 'w-full max-w-md mx-auto';
    }
    if (gameMode === 'dueto') {
      return 'w-full max-w-4xl mx-auto grid grid-cols-2 gap-2 sm:gap-6 items-start';
    }
    // Quarteto: 4 boards
    return 'w-full max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 items-start';
  };

  return (
    <div 
      id="main-app"
      className="min-h-screen bg-[#121213] text-white font-sans flex flex-col justify-between"
    >
      {/* Toast Alert */}
      {alertMessage && (
        <div 
          id="toast-alert"
          className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#272729] border border-amber-500/50 text-[#f3f4f6] font-bold px-4 py-2 rounded-lg shadow-2xl z-50 flex items-center gap-2 text-xs sm:text-sm animate-fade-in"
        >
          <span>⚠️ {alertMessage}</span>
        </div>
      )}

      {/* Top Main Navigation Bar (Exact styling from reference screenshots) */}
      <nav className="bg-[#121213] border-b border-[#2a2a2c] px-3 sm:px-6 py-2 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Top Left Game Mode Tabs: termo | dueto | quarteto */}
          <div className="flex items-center gap-3 sm:gap-6">
            {(['termo', 'dueto', 'quarteto'] as const).map(mode => {
              const isActive = gameMode === mode;
              return (
                <button
                  key={mode}
                  id={`mode-tab-${mode}`}
                  onClick={() => handleSelectMode(mode)}
                  className={`text-sm sm:text-base font-bold transition-all relative py-1 cursor-pointer lowercase ${
                    isActive 
                      ? 'text-white border-b-2 border-white' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* Top Right Utilities */}
          <div className="flex items-center gap-2">
            <button
              id="help-modal-trigger-btn"
              onClick={() => setIsHelpOpen(true)}
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-[#272729] transition cursor-pointer"
              title="Como Jogar"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              id="stats-modal-trigger-btn"
              onClick={() => setIsStatsOpen(true)}
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-[#272729] transition cursor-pointer"
              title="Estatísticas"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button
              id="restart-game-header-btn"
              onClick={() => resetGame()}
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-[#272729] transition cursor-pointer"
              title="Reiniciar Partida"
            >
              <RefreshCw className="w-4.5 h-4.5" />
            </button>
            <button
              id="admin-panel-trigger-btn"
              onClick={() => setIsAdminOpen(true)}
              className="bg-[#272729] border border-[#3a3a3c] text-amber-500 hover:bg-[#3a3a3c] transition px-2.5 py-1 rounded-md flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Cadastro de Palavras"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Cadastro</span>
            </button>
          </div>

        </div>
      </nav>

      {/* Main Title Center Header */}
      <header className="pt-2 sm:pt-4 pb-1 text-center select-none">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold tracking-wider uppercase mb-1">
          Engenharia de Produção • Gestão Operacional
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase font-sans">
          {modeTitle}
        </h1>
        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
          {gameMode === 'termo' && '1 palavra secreta • 6 tentativas'}
          {gameMode === 'dueto' && '2 palavras secretas simultâneas • 7 tentativas'}
          {gameMode === 'quarteto' && '4 palavras secretas simultâneas • 9 tentativas'}
        </p>
      </header>

      {/* Selectors Bar: Mode & Length Selection (Requested by user) */}
      <section 
        id="selectors-section"
        className="max-w-4xl mx-auto w-full px-3 py-1.5"
      >
        <div className="bg-[#1e1e20] p-2.5 sm:p-3 rounded-xl border border-[#3a3a3c] flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
          
          {/* Mode Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Modo:
            </span>
            <div className="flex bg-[#121213] rounded-lg p-0.5 gap-1 border border-[#2a2a2c]">
              {(['termo', 'dueto', 'quarteto'] as const).map(mode => {
                const isActive = gameMode === mode;
                const labels = {
                  termo: 'Termo (1)',
                  dueto: 'Dueto (2)',
                  quarteto: 'Quarteto (4)'
                };
                return (
                  <button
                    key={mode}
                    id={`selector-mode-${mode}`}
                    onClick={() => handleSelectMode(mode)}
                    className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#3aa394] text-white shadow-sm' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Word Length Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
              Tamanho:
            </span>
            <div className="flex bg-[#121213] rounded-lg p-0.5 gap-1 border border-[#2a2a2c]">
              {([5, 6, 7, 8, 9, 10] as const).map(size => {
                const isActive = wordSize === size;
                return (
                  <button
                    key={size}
                    id={`size-filter-btn-${size}`}
                    onClick={() => handleSelectWordSize(size)}
                    className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-amber-500 text-black shadow-sm' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Informative Hint Banner about simultaneous letters */}
        {gameMode !== 'termo' && (
          <div className="mt-1.5 text-center text-[11px] text-gray-400 bg-[#121213]/60 py-1 px-3 rounded-lg border border-[#2a2a2c] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              As letras que você chuta valem para <strong>todas as {wordCount} palavras</strong> ao mesmo tempo! Palavras acertadas são congeladas.
            </span>
          </div>
        )}
      </section>

      {/* Main Boards Stage Area */}
      <main className="flex-1 flex flex-col items-center justify-center py-2 px-1 sm:px-3 overflow-x-auto w-full">
        {/* Focus pills on mobile for Quarteto */}
        {gameMode === 'quarteto' && (
          <div className="flex lg:hidden items-center gap-1 mb-2">
            <span className="text-[10px] text-gray-400 uppercase font-bold mr-1">Exibir:</span>
            <button
              onClick={() => setMobileBoardFocus(null)}
              className={`px-2 py-0.5 text-xs font-bold rounded ${
                mobileBoardFocus === null ? 'bg-white text-black' : 'bg-[#272729] text-gray-400'
              }`}
            >
              Todas (4)
            </button>
            {boards.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setMobileBoardFocus(idx)}
                className={`px-2 py-0.5 text-xs font-bold rounded flex items-center gap-0.5 ${
                  mobileBoardFocus === idx ? 'bg-amber-500 text-black' : 'bg-[#272729] text-gray-400'
                }`}
              >
                <span>{idx + 1}</span>
                {b.isSolved && <CheckCircle2 className="w-2.5 h-2.5 text-[#3aa394]" />}
              </button>
            ))}
          </div>
        )}

        <div className={`w-full ${shakeRow ? 'animate-shake' : ''}`}>
          <div className={getBoardsLayoutClasses()}>
            {boards.map((board, boardIdx) => {
              // If focused on a single board on mobile, hide the others
              if (mobileBoardFocus !== null && mobileBoardFocus !== boardIdx) {
                return null;
              }

              return (
                <div 
                  key={board.id} 
                  className="bg-[#18181a]/40 border border-[#2e2e30]/60 rounded-xl p-1.5 sm:p-2"
                >
                  <GameBoard
                    secretWord={board.secretWord}
                    guesses={board.guesses}
                    currentGuess={currentGuess}
                    isSolved={board.isSolved}
                    maxGuesses={maxGuesses}
                    selectedLetterIndex={selectedLetterIndex}
                    mode={gameMode}
                    boardNumber={board.id}
                    totalBoards={boards.length}
                    onCellClick={(letterIndex) => {
                      if (gameStatus === 'playing') {
                        setSelectedLetterIndex(letterIndex);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Keyboard Area with split status coloring */}
      <footer className="pb-3 sm:pb-6 pt-1 bg-gradient-to-t from-[#18181a] via-[#121213] to-transparent">
        <Keyboard
          boards={boards}
          mode={gameMode}
          onKeyPress={handleKeyPress}
        />
      </footer>

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onWordsUpdated={(newWords) => {
          setWords(newWords);
          resetGame(false, gameMode, wordSize, newWords);
        }}
      />

      {/* Statistics Modal */}
      {isStatsOpen && (
        <StatsModal
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          status={gameStatus === 'won' ? 'won' : 'lost'}
          secretWords={boards.map(b => b.secretWord)}
          stats={currentModeStats}
          guessesCount={totalGuesses}
          maxGuesses={maxGuesses}
          mode={gameMode}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Help / Rules Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            id="help-modal-panel"
            className="bg-[#1e1e20] border-2 border-[#3a3a3c] w-full max-w-lg rounded-xl overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#3a3a3c] pb-2">
              <h2 className="text-lg font-black uppercase text-white flex items-center gap-1.5">
                <HelpCircle className="w-5 h-5 text-[#3aa394]" />
                Como Jogar Termo, Dueto e Quarteto?
              </h2>
              <button
                id="close-help-modal-btn"
                onClick={() => setIsHelpOpen(false)}
                className="text-gray-400 hover:text-white p-1 hover:bg-[#272729] rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation */}
            <div className="space-y-3 text-xs sm:text-sm text-gray-300 leading-relaxed">
              <p>
                Escolha o modo no topo da tela:
              </p>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#121213] p-2 rounded-lg border border-[#3a3a3c]">
                  <span className="font-bold text-white block">TERMO</span>
                  <span className="text-gray-400 text-[11px]">1 palavra</span>
                  <span className="text-[#3aa394] font-bold block text-[11px]">6 chances</span>
                </div>
                <div className="bg-[#121213] p-2 rounded-lg border border-[#3a3a3c]">
                  <span className="font-bold text-white block">DUETO</span>
                  <span className="text-gray-400 text-[11px]">2 palavras</span>
                  <span className="text-amber-400 font-bold block text-[11px]">7 chances</span>
                </div>
                <div className="bg-[#121213] p-2 rounded-lg border border-[#3a3a3c]">
                  <span className="font-bold text-white block">QUARTETO</span>
                  <span className="text-gray-400 text-[11px]">4 palavras</span>
                  <span className="text-purple-400 font-bold block text-[11px]">9 chances</span>
                </div>
              </div>

              <div className="bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg text-amber-300 text-xs flex gap-2 items-start">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Chute Simultâneo:</strong> No Dueto e Quarteto, cada palavra que você envia é testada em <strong>todas as palavras secretas ao mesmo tempo</strong>! Quando uma palavra é acertada, ela fica verde e é congelada. As próximas tentativas continuam apenas nas restantes!
                </span>
              </div>

              {/* Color Indicators */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Significado das Cores</span>

                <div className="bg-[#121213] p-2.5 rounded-lg border border-[#3a3a3c] flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#3aa394] flex items-center justify-center font-black text-white shrink-0">
                    A
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-[#3aa394] uppercase block">Verde (Posição Exata):</span>
                    A letra faz parte da palavra e está na posição correta.
                  </div>
                </div>

                <div className="bg-[#121213] p-2.5 rounded-lg border border-[#3a3a3c] flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#d1a252] flex items-center justify-center font-black text-white shrink-0">
                    B
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-[#d1a252] uppercase block">Amarela (Posição Incorreta):</span>
                    A letra faz parte da palavra, mas em outra posição.
                  </div>
                </div>

                <div className="bg-[#121213] p-2.5 rounded-lg border border-[#3a3a3c] flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#312c2d] flex items-center justify-center font-black text-white shrink-0">
                    C
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-gray-400 uppercase block">Cinza (Ausente):</span>
                    A letra não faz parte dessa palavra secreta.
                  </div>
                </div>
              </div>

              <div className="bg-[#121213]/40 p-2.5 rounded-lg border border-[#3a3a3c] text-xs flex gap-2 text-gray-400">
                <Info className="w-4 h-4 text-[#3aa394] shrink-0 mt-0.5" />
                <p>
                  <strong>Teclado Dividido:</strong> No Dueto, cada tecla é dividida em duas metades (esquerda = Palavra 1, direita = Palavra 2). No Quarteto, cada tecla é dividida em 4 quadrantes!
                </p>
              </div>

              <div className="bg-[#121213]/60 p-2.5 rounded-lg border border-[#3a3a3c] text-xs flex gap-2 text-amber-300/90">
                <span>📖</span>
                <p>
                  <strong>Vocabulário Real:</strong> Apenas palavras existentes da língua portuguesa são aceitas. Não é permitido chutar letras aleatórias (como "AORSE" ou "AAAAA") para testar posições.
                </p>
              </div>
            </div>

            {/* Start Button */}
            <button
              id="start-playing-help-btn"
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-2.5 bg-[#3aa394] hover:bg-[#45b7a7] text-white font-black uppercase text-xs tracking-wider transition rounded-lg cursor-pointer"
            >
              Começar a Jogar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
