/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LetterStatus, WordConfig, GameMode } from './types';

/**
 * Normaliza uma string removendo acentos e caracteres especiais,
 * transformando-a em maiúsculas limpas (A-Z).
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Codifica uma palavra em base64 para evitar que jogadores leiam no código ou storage.
 */
export function obfuscate(word: string): string {
  try {
    const trimmed = word.trim().toUpperCase();
    const utf8Bytes = new TextEncoder().encode(trimmed);
    const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } catch {
    return '';
  }
}

/**
 * Decodifica uma palavra de base64.
 */
export function deobfuscate(hash: string): string {
  try {
    if (!hash) return '';
    const binaryString = atob(hash);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
       bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes).trim().toUpperCase();
  } catch {
    return '';
  }
}

/**
 * Retorna o número de tentativas permitidas com base no modo de jogo:
 * - Termo (1 palavra): 6 tentativas
 * - Dueto (2 palavras): 7 tentativas (conforme regras oficiais)
 * - Quarteto (4 palavras): 9 tentativas (conforme regras oficiais)
 */
export function getMaxGuessesForMode(mode: GameMode): number {
  switch (mode) {
    case 'termo':
      return 6;
    case 'dueto':
      return 7;
    case 'quarteto':
      return 9;
    default:
      return 6;
  }
}

/**
 * Retorna quantas palavras são jogadas simultaneamente no modo.
 */
export function getWordCountForMode(mode: GameMode): number {
  switch (mode) {
    case 'termo':
      return 1;
    case 'dueto':
      return 2;
    case 'quarteto':
      return 4;
    default:
      return 1;
  }
}

/**
 * Lista Oficial de Termos de Engenharia de Produção & Gestão Operacional:
 * 7 palavras exclusivas por tamanho (5 a 10 letras):
 * - Índice 0: Termo (1 palavra)
 * - Índices 1 e 2: Dueto (2 palavras exclusivas)
 * - Índices 3, 4, 5 e 6: Quarteto (4 palavras exclusivas)
 * 100% calibrado: tamanhos exatos e sem sobreposição de palavras entre os modos!
 */
export const DEFAULT_RAW_WORDS: { [key: number]: string[] } = {
  5: ['FLUXO', 'SETUP', 'ANDON', 'SEIRI', 'PERDA', 'CICLO', 'GANHO'],
  6: ['KAIZEN', 'KANBAN', 'CUSTOS', 'SEITON', 'SEISOU', 'PADRÃO', 'MARGEM'],
  7: ['GARGALO', 'ESTOQUE', 'DEMANDA', 'DEFEITO', 'REJEITO', 'ENTREGA', 'CLIENTE'],
  8: ['PRODUÇÃO', 'PROCESSO', 'DIAGRAMA', 'SEIKETSU', 'SHITSUKE', 'OTIMIZAR', 'CONTROLE'],
  9: ['QUALIDADE', 'RESTRIÇÃO', 'LOGÍSTICA', 'OPERAÇÕES', 'SIMULAÇÃO', 'ERGONOMIA', 'PRODUTIVO'],
  10: ['EFICIÊNCIA', 'CAPACIDADE', 'MANUTENÇÃO', 'FLUXOGRAMA', 'RETRABALHO', 'OTIMIZAÇÃO', 'DISPONÍVEL']
};

export const DEFAULT_OBFUSCATED_WORDS: WordConfig = {
  5: DEFAULT_RAW_WORDS[5].map(obfuscate),
  6: DEFAULT_RAW_WORDS[6].map(obfuscate),
  7: DEFAULT_RAW_WORDS[7].map(obfuscate),
  8: DEFAULT_RAW_WORDS[8].map(obfuscate),
  9: DEFAULT_RAW_WORDS[9].map(obfuscate),
  10: DEFAULT_RAW_WORDS[10].map(obfuscate),
};

export const DEFAULT_ADMIN_PASSWORD_HASH = 'dGVybW8xMjM='; // base64 of 'termo123'

export const WORD_BANK = DEFAULT_RAW_WORDS;

/**
 * Retorna as palavras exclusivas para cada modo de jogo (Termo, Dueto e Quarteto).
 * Mantém o jogo 100% focado nos termos de Engenharia de Produção,
 * sem sortear palavras aleatórias genéricas do vocabulário comum.
 */
export function getWordsForGame(
  size: number, 
  mode: GameMode,
  customWords?: string[]
): string[] {
  const count = getWordCountForMode(mode);

  // Se houver palavras customizadas pelo administrador no painel
  if (customWords && customWords.length >= 7) {
    const rawList = customWords.map(deobfuscate);
    let modeWords: string[] = [];
    if (mode === 'termo') {
      modeWords = [rawList[0]];
    } else if (mode === 'dueto') {
      modeWords = [rawList[1], rawList[2]];
    } else if (mode === 'quarteto') {
      modeWords = [rawList[3], rawList[4], rawList[5], rawList[6]];
    }

    const valid = modeWords.filter(w => w && w.length === size);
    if (valid.length === count) {
      return valid;
    }
  }

  // Compatibilidade com cadastros antigos com menos itens
  if (customWords && customWords.length >= 1) {
    const rawList = customWords.map(deobfuscate);
    const defaults = DEFAULT_RAW_WORDS[size] || [];
    if (mode === 'termo' && rawList[0]?.length === size) {
      return [rawList[0]];
    }
    if (mode === 'dueto') {
      const w1 = rawList[1]?.length === size ? rawList[1] : defaults[1];
      const w2 = rawList[2]?.length === size ? rawList[2] : defaults[2];
      if (w1 && w2) return [w1, w2];
    }
    if (mode === 'quarteto') {
      const w1 = rawList[3]?.length === size ? rawList[3] : defaults[3];
      const w2 = rawList[4]?.length === size ? rawList[4] : defaults[4];
      const w3 = rawList[5]?.length === size ? rawList[5] : defaults[5];
      const w4 = rawList[6]?.length === size ? rawList[6] : defaults[6];
      if (w1 && w2 && w3 && w4) return [w1, w2, w3, w4];
    }
  }

  // Padrão oficial de Engenharia de Produção
  const defaults = DEFAULT_RAW_WORDS[size] || [];
  if (mode === 'termo') return [defaults[0]];
  if (mode === 'dueto') return [defaults[1], defaults[2]];
  if (mode === 'quarteto') return [defaults[3], defaults[4], defaults[5], defaults[6]];

  return defaults.slice(0, count);
}

/**
 * Algoritmo exato de verificação do Termo/Wordle.
 */
export function evaluateGuess(guess: string, targetOriginal: string): LetterStatus[] {
  const size = targetOriginal.length;
  const guessNorm = normalizeText(guess);
  const targetNorm = normalizeText(targetOriginal);

  const statuses: LetterStatus[] = Array(size).fill('absent');
  const targetLetterCounts: { [key: string]: number } = {};

  // Contabilizar frequências das letras normalizadas na palavra secreta
  for (let i = 0; i < size; i++) {
    const letter = targetNorm[i];
    targetLetterCounts[letter] = (targetLetterCounts[letter] || 0) + 1;
  }

  // 1a Passagem: Identificar letras VERDES (exatas)
  for (let i = 0; i < size; i++) {
    if (guessNorm[i] === targetNorm[i]) {
      statuses[i] = 'correct';
      targetLetterCounts[guessNorm[i]]--;
    }
  }

  // 2a Passagem: Identificar letras AMARELAS (presentes) ou CINZAS (ausentes)
  for (let i = 0; i < size; i++) {
    if (statuses[i] !== 'correct') {
      const letter = guessNorm[i];
      if (targetLetterCounts[letter] && targetLetterCounts[letter] > 0) {
        statuses[i] = 'present';
        targetLetterCounts[letter]--;
      } else {
        statuses[i] = 'absent';
      }
    }
  }

  return statuses;
}
