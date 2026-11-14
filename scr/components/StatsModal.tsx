/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, Flame, Play, Award, X } from 'lucide-react';
import { GameStats, GameMode } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'won' | 'lost';
  secretWords: string[];
  stats: GameStats;
  guessesCount: number;
  maxGuesses?: number;
  mode: GameMode;
  onPlayAgain: () => void;
}

export default function StatsModal({
  isOpen,
  onClose,
  status,
  secretWords,
  stats,
  guessesCount,
  maxGuesses = 6,
  mode,
  onPlayAgain
}: StatsModalProps) {
  if (!isOpen) return null;

  const winPercentage = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;

  // Max value in distribution to scale bars
  const maxDistributionValue = Math.max(...Object.values(stats.distribution), 1);

  const modeDisplayName = {
    termo: 'Termo (1 palavra)',
    dueto: 'Dueto (2 palavras)',
    quarteto: 'Quarteto (4 palavras)'
  }[mode];

  const distributionRange = Array.from({ length: maxGuesses }, (_, i) => i + 1);

  const handlePlayAgainClick = () => {
    onClose();
    onPlayAgain();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        id="stats-modal-container"
        className="bg-[#1e1e20] border-2 border-[#3a3a3c] w-full max-w-md rounded-xl overflow-hidden shadow-2xl p-5 sm:p-6 text-center space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button (X) */}
        <button
          id="close-stats-modal-btn"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-gray-400 hover:text-white p-1.5 hover:bg-[#272729] rounded-lg transition cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Outcome Header */}
        <div className="space-y-2 pt-1">
          {status === 'won' ? (
            <div className="space-y-1">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-[#3aa394] border border-[#3aa394]/30">
                <Trophy className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-[#3aa394] uppercase tracking-widest">Sensacional!</h2>
              <p className="text-gray-300 text-sm">
                Você completou o {mode.toUpperCase()} em <span className="font-bold text-white bg-black/30 px-2 py-0.5 rounded">{guessesCount}</span> {guessesCount === 1 ? 'tentativa' : 'tentativas'}!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-400 border border-red-500/30">
                <Award className="w-7 h-7 opacity-70" />
              </div>
              <h2 className="text-xl font-black text-red-500 uppercase tracking-widest">Fim de Jogo</h2>
              <p className="text-gray-300 text-sm">As {maxGuesses} tentativas acabaram.</p>
            </div>
          )}
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-950/30 border border-amber-900/40 px-2.5 py-0.5 rounded-full">
            {modeDisplayName}
          </span>
        </div>

        {/* Revealed Secret Words */}
        <div className="bg-[#121213] p-3.5 rounded-lg border border-[#3a3a3c] space-y-2 text-left">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block text-center">
            {secretWords.length === 1 ? 'Palavra Secreta' : 'Palavras Secretas'}
          </span>
          <div className={`grid ${secretWords.length > 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-center`}>
            {secretWords.map((word, idx) => (
              <div key={idx} className="bg-[#272729] py-1.5 px-2 rounded border border-[#3a3a3c]">
                {secretWords.length > 1 && (
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Palavra {idx + 1}</span>
                )}
                <span className="text-lg font-black tracking-widest text-[#3aa394] uppercase select-all font-sans">
                  {word}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Core Statistics Metrics */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold border-b border-[#3a3a3c] pb-1 text-left">
            Estatísticas ({mode.toUpperCase()})
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#272729] p-2 rounded border border-[#3a3a3c]">
              <span className="text-xl font-black text-white block">{stats.gamesPlayed}</span>
              <span className="text-[9px] uppercase font-bold text-gray-400">Partidas</span>
            </div>
            <div className="bg-[#272729] p-2 rounded border border-[#3a3a3c]">
              <span className="text-xl font-black text-white block">{winPercentage}%</span>
              <span className="text-[9px] uppercase font-bold text-gray-400">Vitórias</span>
            </div>
            <div className="bg-[#272729] p-2 rounded border border-[#3a3a3c]">
              <span className="text-xl font-black text-[#d1a252] flex items-center justify-center gap-0.5">
                <Flame className="w-4 h-4 text-[#d1a252] fill-[#d1a252]/10 shrink-0" />
                {stats.currentStreak}
              </span>
              <span className="text-[9px] uppercase font-bold text-gray-400">Seq. Atual</span>
            </div>
            <div className="bg-[#272729] p-2 rounded border border-[#3a3a3c]">
              <span className="text-xl font-black text-[#d1a252] flex items-center justify-center gap-0.5">
                <Flame className="w-4 h-4 text-[#d1a252] fill-[#d1a252]/30 shrink-0" />
                {stats.maxStreak}
              </span>
              <span className="text-[9px] uppercase font-bold text-gray-400">Melhor Seq.</span>
            </div>
          </div>
        </div>

        {/* Guess Distribution Chart */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold border-b border-[#3a3a3c] pb-1 text-left">
            Distribuição de Tentativas
          </h3>
          <div className="space-y-1 text-left font-mono text-xs">
            {distributionRange.map(guessIndex => {
              const value = stats.distribution[guessIndex] || 0;
              const isCurrentWinRow = status === 'won' && guessesCount === guessIndex;
              const percent = maxDistributionValue > 0 ? (value / maxDistributionValue) * 100 : 0;

              return (
                <div key={guessIndex} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-bold w-2.5 text-right">{guessIndex}</span>
                  <div className="flex-1 bg-black/30 h-5 rounded overflow-hidden">
                    {value > 0 ? (
                      <div
                        className="h-full flex items-center pl-2 text-[10px] font-bold text-white transition-all duration-700"
                        style={{ 
                          width: `${Math.max(percent, 8)}%`,
                          backgroundColor: isCurrentWinRow ? '#3aa394' : '#3a3a3c'
                        }}
                      >
                        {value}
                      </div>
                    ) : (
                      <div className="h-full pl-2 text-[10px] flex items-center font-bold text-gray-600">0</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-[#3a3a3c]">
          <button
            id="play-again-modal-btn"
            onClick={handlePlayAgainClick}
            className="w-full py-3 px-4 bg-[#3aa394] hover:bg-[#45b7a7] active:scale-[0.98] transition text-white font-black uppercase text-sm tracking-widest rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-[#3aa394]/20 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            Jogar Novamente
          </button>
        </div>
      </div>
    </div>
  );
}
