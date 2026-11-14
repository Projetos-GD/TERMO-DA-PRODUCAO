/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeText, WORD_BANK, DEFAULT_RAW_WORDS } from './utils';

// In-memory cache of valid words by length
const dictionaryCache: Map<number, Set<string>> = new Map();
const loadingPromises: Map<number, Promise<Set<string>>> = new Map();

/**
 * Carrega a lista completa de palavras válidas em português brasileiro para o tamanho especificado.
 */
export async function loadDictionary(length: number): Promise<Set<string>> {
  if (dictionaryCache.has(length)) {
    return dictionaryCache.get(length)!;
  }

  if (loadingPromises.has(length)) {
    return loadingPromises.get(length)!;
  }

  const promise = (async () => {
    try {
      const response = await fetch(`/words/${length}.txt`);
      if (!response.ok) {
        throw new Error(`Failed to load word list for length ${length}`);
      }
      const text = await response.text();
      const words = text
        .split(/\r?\n/)
        .map(w => normalizeText(w))
        .filter(w => w.length === length);

      const wordSet = new Set<string>(words);

      // Sempre garantir que as palavras do banco do jogo também estejam presentes
      const bank = WORD_BANK[length] || DEFAULT_RAW_WORDS[length] || [];
      bank.forEach(w => wordSet.add(normalizeText(w)));

      dictionaryCache.set(length, wordSet);
      return wordSet;
    } catch (err) {
      console.warn(`Aviso: não foi possível carregar o arquivo /words/${length}.txt, usando vocabulário base.`);
      // Fallback base
      const fallbackSet = new Set<string>();
      const bank = WORD_BANK[length] || DEFAULT_RAW_WORDS[length] || [];
      bank.forEach(w => fallbackSet.add(normalizeText(w)));
      dictionaryCache.set(length, fallbackSet);
      return fallbackSet;
    } finally {
      loadingPromises.delete(length);
    }
  })();

  loadingPromises.set(length, promise);
  return promise;
}

/**
 * Verifica de forma síncrona se a palavra digitada é válida no vocabulário.
 * Também aceita uma lista opcional de palavras ativas (ex: palavras cadastradas pelo admin).
 */
export function isValidPortugueseWord(
  guess: string, 
  length: number, 
  extraValidWords: string[] = []
): boolean {
  const normalized = normalizeText(guess);
  if (normalized.length !== length) {
    return false;
  }

  // Verifica se coincide com alguma das palavras secretas ativas ou configuradas
  for (const word of extraValidWords) {
    if (normalizeText(word) === normalized) {
      return true;
    }
  }

  // Verifica no cache do dicionário
  const cachedSet = dictionaryCache.get(length);
  if (cachedSet && cachedSet.size > 0) {
    return cachedSet.has(normalized);
  }

  // Se o dicionário ainda não terminou de baixar, verifica no banco de palavras local
  const bank = WORD_BANK[length] || DEFAULT_RAW_WORDS[length] || [];
  return bank.some(w => normalizeText(w) === normalized);
}
