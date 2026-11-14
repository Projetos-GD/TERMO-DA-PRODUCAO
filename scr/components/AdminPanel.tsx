/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WordConfig } from '../types';
import { 
  deobfuscate, 
  obfuscate, 
  DEFAULT_OBFUSCATED_WORDS, 
  DEFAULT_ADMIN_PASSWORD_HASH, 
  normalizeText,
  DEFAULT_RAW_WORDS
} from '../utils';

import { 
  Lock, 
  Unlock, 
  Settings, 
  Check, 
  RotateCcw, 
  X, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  Sparkles,
  Users,
  Grid
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onWordsUpdated: (newWords: WordConfig) => void;
}

export default function AdminPanel({ isOpen, onClose, onWordsUpdated }: AdminPanelProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Selected length tab in admin panel (5, 6, 7, 8, 9, 10)
  const [activeLengthTab, setActiveLengthTab] = useState<number>(5);

  // Form states for words: each length has 7 distinct words
  // 0: Termo
  // 1, 2: Dueto (1 e 2)
  // 3, 4, 5, 6: Quarteto (1, 2, 3 e 4)
  const [editableWords, setEditableWords] = useState<{ [length: number]: string[] }>({
    5: ['', '', '', '', '', '', ''],
    6: ['', '', '', '', '', '', ''],
    7: ['', '', '', '', '', '', ''],
    8: ['', '', '', '', '', '', ''],
    9: ['', '', '', '', '', '', ''],
    10: ['', '', '', '', '', '', '']
  });

  const [saveErrors, setSaveErrors] = useState<{ [key: string]: string }>({});
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');

  // Load words & password hash from localStorage on open
  useEffect(() => {
    if (isOpen) {
      const storedWords = localStorage.getItem('termo_words');
      const stateObj: { [length: number]: string[] } = {};

      let parsed: any = null;
      if (storedWords) {
        try {
          parsed = JSON.parse(storedWords);
        } catch {
          parsed = null;
        }
      }

      [5, 6, 7, 8, 9, 10].forEach(len => {
        const fallback = DEFAULT_RAW_WORDS[len];
        if (parsed && parsed[len]) {
          if (Array.isArray(parsed[len])) {
            stateObj[len] = parsed[len].map((w: string, idx: number) => {
              const deob = deobfuscate(w);
              return deob || fallback[idx] || '';
            });
            // Ensure 7 items
            while (stateObj[len].length < 7) {
              stateObj[len].push(fallback[stateObj[len].length] || '');
            }
          } else if (typeof parsed[len] === 'string') {
            const word1 = deobfuscate(parsed[len]) || fallback[0];
            stateObj[len] = [word1, fallback[1], fallback[2], fallback[3], fallback[4], fallback[5], fallback[6]];
          } else {
            stateObj[len] = [...fallback];
          }
        } else {
          stateObj[len] = [...fallback];
        }
      });

      setEditableWords(stateObj);
      setIsAuthenticated(false);
      setPassword('');
      setLoginError('');
      setSaveSuccessMessage('');
      setPasswordChangeMessage('');
      setPasswordChangeError('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedHash = localStorage.getItem('termo_admin_hash') || DEFAULT_ADMIN_PASSWORD_HASH;
    const inputHash = btoa(password);

    if (inputHash === storedHash) {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Senha incorreta! Use a senha padrão "termo123" ou a senha que você configurou.');
    }
  };

  const handleSingleWordChange = (length: number, wordIndex: number, value: string) => {
    const cleaned = value.toUpperCase();
    setEditableWords(prev => {
      const copyList = [...(prev[length] || ['', '', '', '', '', '', ''])];
      copyList[wordIndex] = cleaned;
      return { ...prev, [length]: copyList };
    });

    const errorKey = `${length}-${wordIndex}`;
    if (saveErrors[errorKey]) {
      setSaveErrors(prev => {
        const copy = { ...prev };
        delete copy[errorKey];
        return copy;
      });
    }
  };

  const validateAndSaveWords = () => {
    const errors: { [key: string]: string } = {};
    const updatedConfig: Partial<WordConfig> = {};

    [5, 6, 7, 8, 9, 10].forEach(len => {
      const wordsForLen = editableWords[len] || [];
      const obfuscatedList: string[] = [];

      for (let i = 0; i < 7; i++) {
        const raw = wordsForLen[i] || '';
        const trimmed = raw.trim();
        const normalized = normalizeText(trimmed);
        const errorKey = `${len}-${i}`;

        if (!trimmed) {
          errors[errorKey] = `A palavra do campo ${i + 1} não pode ser vazia.`;
        } else if (normalized.length !== len) {
          errors[errorKey] = `Deve ter exatamente ${len} letras (atualmente: ${normalized.length}).`;
        } else if (/[^A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(trimmed)) {
          errors[errorKey] = 'Utilize apenas letras do nosso alfabeto.';
        } else {
          obfuscatedList.push(obfuscate(trimmed));
        }
      }

      updatedConfig[len as keyof WordConfig] = obfuscatedList;
    });

    if (Object.keys(errors).length > 0) {
      setSaveErrors(errors);
      setSaveSuccessMessage('');
      // Switch tab to first length with error
      const firstErrorKey = Object.keys(errors)[0];
      const errorLength = parseInt(firstErrorKey.split('-')[0]);
      if (!isNaN(errorLength)) {
        setActiveLengthTab(errorLength);
      }
      return;
    }

    const finalWords = updatedConfig as WordConfig;
    localStorage.setItem('termo_words', JSON.stringify(finalWords));
    onWordsUpdated(finalWords);
    setSaveSuccessMessage('Todas as palavras exclusivas de Termo, Dueto e Quarteto foram salvas com sucesso!');
    setTimeout(() => setSaveSuccessMessage(''), 4500);
  };

  const handleResetToDefaults = () => {
    if (confirm('Deseja realmente redefinir todas as palavras para as originais do código?')) {
      localStorage.removeItem('termo_words');
      
      const resetObj: { [length: number]: string[] } = {};
      [5, 6, 7, 8, 9, 10].forEach(len => {
        resetObj[len] = [...DEFAULT_RAW_WORDS[len]];
      });

      setEditableWords(resetObj);
      onWordsUpdated({ ...DEFAULT_OBFUSCATED_WORDS });
      setSaveErrors({});
      setSaveSuccessMessage('Palavras originais restauradas!');
      setTimeout(() => setSaveSuccessMessage(''), 4000);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordChangeError('A nova senha não pode estar vazia.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('As senhas não coincidem!');
      return;
    }

    const newHash = btoa(newPassword);
    localStorage.setItem('termo_admin_hash', newHash);
    setPasswordChangeMessage('Senha administrativa atualizada com sucesso!');
    setPasswordChangeError('');
    setNewPassword('');
    setConfirmNewPassword('');
    setTimeout(() => setPasswordChangeMessage(''), 4000);
  };

  const handleResetPassword = () => {
    if (confirm('Tem certeza que deseja redefinir a senha para a original ("termo123")?')) {
      localStorage.removeItem('termo_admin_hash');
      setPasswordChangeMessage('Senha redefinida para "termo123"!');
      setPasswordChangeError('');
      setTimeout(() => setPasswordChangeMessage(''), 4000);
    }
  };

  const renderWordInput = (index: number, label: string) => {
    const errorKey = `${activeLengthTab}-${index}`;
    const err = saveErrors[errorKey];

    return (
      <div key={index} className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span className="font-semibold text-gray-300">{label}</span>
        </div>
        <input
          type="text"
          maxLength={activeLengthTab + 2}
          value={editableWords[activeLengthTab]?.[index] || ''}
          onChange={e => handleSingleWordChange(activeLengthTab, index, e.target.value)}
          placeholder={`Digite palavra de ${activeLengthTab} letras...`}
          className={`w-full bg-[#121213] text-white border ${
            err ? 'border-red-500 focus:border-red-500' : 'border-[#3a3a3c] focus:border-amber-500'
          } rounded-lg px-3 py-1.5 text-sm font-mono tracking-wider outline-none transition-colors`}
        />
        {err && (
          <p className="text-red-400 text-[11px] font-medium">{err}</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        id="admin-modal-container"
        className="bg-[#1e1e20] border-2 border-[#3a3a3c] w-full max-w-xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-[#161617] p-4 flex items-center justify-between border-b border-[#3a3a3c]">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <Settings className="w-5 h-5" />
            <span>Painel de Cadastro de Palavras</span>
          </div>
          <button 
            id="close-admin-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#272729] rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto flex-1">
          {!isAuthenticated ? (
            /* Login Gate */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-500/30">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-white font-semibold text-lg">Área Restrita</h3>
                <p className="text-gray-400 text-sm">
                  Configure as palavras secretas exclusivas para cada modo de jogo (Termo, Dueto e Quarteto).
                </p>
                <div className="text-xs text-amber-400/80 bg-amber-950/20 p-2 rounded border border-amber-900/40">
                  Senha padrão inicial: <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-white font-bold select-all">termo123</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                  Senha Administrativa
                </label>
                <div className="relative">
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Digite a senha..."
                    className="w-full bg-[#121213] text-white border border-[#3a3a3c] rounded-lg px-3 py-2.5 pr-10 outline-none focus:border-amber-500 transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginError && (
                  <p className="text-red-400 text-xs mt-1 flex items-start gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{loginError}</span>
                  </p>
                )}
              </div>

              <button
                id="admin-login-submit-btn"
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition text-black font-semibold rounded-lg flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                Acessar Cadastro
              </button>
            </form>
          ) : (
            /* Logged in Area - Words Management */
            <div className="space-y-5">
              <div className="space-y-1">
                <h4 className="text-white font-medium text-sm uppercase tracking-wide">
                  Palavras Secretas Exclusivas por Modo
                </h4>
                <p className="text-xs text-gray-400">
                  Cada modo possui palavras exclusivas e independentes, garantindo que o termo secreto nunca seja revelado ou repetido no dueto ou quarteto.
                </p>
              </div>

              {/* Length Tabs */}
              <div className="flex bg-[#121213] p-1 rounded-lg border border-[#3a3a3c] gap-1 overflow-x-auto">
                {[5, 6, 7, 8, 9, 10].map(len => {
                  const hasErr = Object.keys(saveErrors).some(k => k.startsWith(`${len}-`));
                  const isActive = activeLengthTab === len;
                  return (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setActiveLengthTab(len)}
                      className={`flex-1 py-1.5 px-2 text-xs font-bold rounded transition cursor-pointer flex items-center justify-center gap-1 ${
                        isActive 
                          ? 'bg-amber-500 text-black shadow' 
                          : 'text-gray-400 hover:text-white'
                      } ${hasErr ? 'ring-1 ring-red-500' : ''}`}
                    >
                      <span>{len} letras</span>
                      {hasErr && <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />}
                    </button>
                  );
                })}
              </div>

              {/* Words configuration grouped by mode */}
              <div className="space-y-4">
                
                {/* 1. Termo Section */}
                <div className="bg-[#18181b] p-3.5 rounded-lg border border-[#3a3a3c] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#2e2e32] pb-1.5">
                    <span className="text-xs font-bold text-[#3aa394] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Palavra Exclusiva do TERMO
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">1 palavra</span>
                  </div>
                  {renderWordInput(0, `Palavra Secreta do Termo (${activeLengthTab} letras)`)}
                </div>

                {/* 2. Dueto Section */}
                <div className="bg-[#18181b] p-3.5 rounded-lg border border-[#3a3a3c] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#2e2e32] pb-1.5">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Palavras Exclusivas do DUETO
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">2 palavras distintas</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderWordInput(1, 'Palavra 1 do Dueto')}
                    {renderWordInput(2, 'Palavra 2 do Dueto')}
                  </div>
                </div>

                {/* 3. Quarteto Section */}
                <div className="bg-[#18181b] p-3.5 rounded-lg border border-[#3a3a3c] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#2e2e32] pb-1.5">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5" />
                      Palavras Exclusivas do QUARTETO
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">4 palavras distintas</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderWordInput(3, 'Palavra 1 do Quarteto')}
                    {renderWordInput(4, 'Palavra 2 do Quarteto')}
                    {renderWordInput(5, 'Palavra 3 do Quarteto')}
                    {renderWordInput(6, 'Palavra 4 do Quarteto')}
                  </div>
                </div>

              </div>

              {/* Status outputs */}
              {saveSuccessMessage && (
                <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* Action row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#3a3a3c] justify-between">
                <button
                  id="reset-words-defaults-btn"
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-3 py-2 text-xs border border-[#3a3a3c] hover:text-white text-gray-300 hover:border-white transition rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrões
                </button>

                <button
                  id="save-words-btn"
                  type="button"
                  onClick={validateAndSaveWords}
                  className="px-5 py-2 text-xs bg-[#3aa394] hover:bg-[#45b7a7] text-white font-bold transition rounded-lg flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar Todas as Palavras
                </button>
              </div>

              {/* Change Password Sub-Panel */}
              <div className="mt-6 pt-5 border-t border-[#3a3a3c] space-y-3">
                <h4 className="text-white font-medium text-xs uppercase tracking-wide text-gray-300">
                  Gerenciamento de Senha de Administrador
                </h4>
                
                <form onSubmit={handleChangePassword} className="space-y-3 bg-[#272729] p-3 rounded-lg border border-[#3a3a3c]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Nova Senha</label>
                      <input
                        id="new-password-input"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mudar senha..."
                        className="w-full bg-[#121213] text-white border border-[#3a3a3c] rounded-lg px-2 text-xs py-1.5 outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Confirmar Senha</label>
                      <input
                        id="confirm-new-password-input"
                        type="password"
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        placeholder="Repetir senha..."
                        className="w-full bg-[#121213] text-white border border-[#3a3a3c] rounded-lg px-2 text-xs py-1.5 outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  {passwordChangeError && (
                    <p className="text-red-400 text-xs font-semibold">{passwordChangeError}</p>
                  )}
                  {passwordChangeMessage && (
                    <p className="text-emerald-400 text-xs font-semibold">{passwordChangeMessage}</p>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <button
                      id="reset-password-btn"
                      type="button"
                      onClick={handleResetPassword}
                      className="text-[10px] text-gray-400 hover:text-white transition underline cursor-pointer"
                    >
                      Resetar para "termo123"
                    </button>
                    <button
                      id="save-new-password-btn"
                      type="submit"
                      className="px-3 py-1 text-[11px] bg-amber-500 hover:bg-amber-600 transition rounded text-black font-semibold cursor-pointer"
                    >
                      Alterar Senha
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
