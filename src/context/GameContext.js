import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { saveSession, loadSession, clearSession } from '../hooks/useSession';

export const DEFAULT_CONFIG = {
  difficulty: 'medium',
  fragments: ['ORION', 'X17', 'OMEGA'],

  // Round 1 — Cipher Gate (6-8 puzzles, difficulty controls how many shown)
  r1Puzzles: [
    { id: 0, label: 'Cipher 1',       encrypted: 'YDXOW',        hint: 'Caesar Cipher (shift 3)',                answer: 'VAULT'    },
    { id: 1, label: 'Cipher 2',       encrypted: 'FRGH',         hint: 'Caesar Cipher (shift 3)',                answer: 'CODE'     },
    { id: 2, label: 'Scrambled Word', encrypted: 'C-I-P-H-E-R',  hint: 'Unscramble: RPIEHC',                    answer: 'CIPHER'   },
    { id: 3, label: 'Hidden Message', encrypted: 'T_K_ TH_ K_Y', hint: 'Fill in the vowels (E, A, E)',          answer: 'TAKE THE KEY' },
    { id: 4, label: 'Pattern',        encrypted: '1-4-9-16-?',   hint: 'Square numbers. What comes next?',      answer: '25'       },
    { id: 5, label: 'Riddle',         encrypted: 'I have keys but no locks. I have space but no room. You can enter but cannot go inside. What am I?', hint: 'Think about a computer peripheral', answer: 'KEYBOARD' },
    { id: 6, label: 'Logic',          encrypted: 'If HACK = 8-1-3-11, what does LOCK equal?', hint: 'A=1, B=2, C=3...', answer: '12-15-3-11' },
    { id: 7, label: 'CTF — Source Code', encrypted: '<!-- FLAG: SHADOW -->', hint: 'Check the HTML source code (F12 → Elements → head tag)', answer: 'SHADOW' },
    { id: 8, label: 'CTF — Image Metadata', encrypted: '[[IMAGE_CTF]]', hint: 'Download the image and inspect its metadata using an online tool', answer: 'NEXUS' },
  ],

  // Round 2 settings
  r2Level1MazeSize: [15, 11],
  r2Level2MazeSize: [13, 9],
  r2BotSpeed: 5,    // 1-10, controls drone chase speed
  r2PlayerSpeed: 5, // 1-10, controls agent movement speed

  // Round 3 — System Reconstruction
  r3Scrambled: ['EDEXCRPYT', 'VOERDRI', 'ETXECU', 'TINI'],
  r3Correct:   ['DECRYPT',   'OVERRIDE', 'EXECUTE', 'INIT'],
  r3Decoys:    ['DELETE'],                          // commands to identify & remove
  r3Sequence:  ['INIT', 'DECRYPT', 'OVERRIDE', 'EXECUTE'],
  r3Clue: '"The system must begin with initialization and end with execution."',
  r3DecoyCue: '"Not all commands belong to the recovery protocol."',

  // Final Vault — transformation rule
  finalInstruction: 'Shift the first fragment by +1 letter, reverse the numeric code, and keep the last fragment unchanged.',
  finalAnswer: 'PSJPO-71X-OMEGA',   // pre-computed; admin can override
};

// r1Count includes both CTF puzzles (HTML + image) which are always the last 2 entries
// Easy: 4 normal + 2 CTF = 6 total
// Medium: 6 normal + 2 CTF = 8 total
// Hard: 7 normal + 2 CTF = 9 total
export const DIFFICULTY_SETTINGS = {
  easy:   { r1Count: 6, r3SeqLen: 3, bossSeqLen: 3, mazeSize: [13, 9],  visibility: 4, label: 'Easy'   },
  medium: { r1Count: 8, r3SeqLen: 4, bossSeqLen: 4, mazeSize: [19, 15], visibility: 3, label: 'Medium' },
  hard:   { r1Count: 9, r3SeqLen: 4, bossSeqLen: 5, mazeSize: [25, 19], visibility: 2, label: 'Hard'   },
};

const GameContext = createContext(null);

// Store start time at module level so it is never lost due to re-renders
let _startMs = null;
let _timerInterval = null;

export function GameProvider({ children }) {
  // Restore session from localStorage if available
  const savedSession = loadSession();

  const [team,      setTeamRaw]   = useState(savedSession?.team || null);
  const [screen,    setScreenRaw] = useState(savedSession?.screen || 'intro');
  const [fragments, setFragments] = useState(savedSession?.fragments || ['', '', '']);
  const [config,    setConfig]    = useState(savedSession ? { ...DEFAULT_CONFIG, ...savedSession.config } : DEFAULT_CONFIG);
  const [elapsed,   setElapsed]   = useState(savedSession?.elapsed || 0);

  // Wrapped setters that also persist session
  function setTeam(t) {
    setTeamRaw(t);
    if (t) saveSession({ team: t, screen, fragments, config: { difficulty: config.difficulty, fragments: config.fragments, finalAnswer: config.finalAnswer }, elapsed });
  }
  function setScreen(s) {
    setScreenRaw(s);
    saveSession({ team, screen: s, fragments, config: { difficulty: config.difficulty, fragments: config.fragments, finalAnswer: config.finalAnswer }, elapsed });
  }

  function startTimer() {
    if (_timerInterval) return; // already running
    // If resuming, offset start time by already elapsed seconds
    _startMs = savedSession?.elapsed ? Date.now() - (savedSession.elapsed * 1000) : Date.now();
    console.log('[Timer] Started at', _startMs);
    _timerInterval = setInterval(() => {
      if (_startMs) setElapsed(Math.floor((Date.now() - _startMs) / 1000));
    }, 500);
  }

  function stopTimer() {
    clearInterval(_timerInterval);
    _timerInterval = null;
    console.log('[Timer] Stopped. startMs was:', _startMs);
  }

  // Returns exact elapsed seconds right now — reads module-level _startMs (never stale)
  function getElapsedNow() {
    if (!_startMs) {
      console.warn('[Timer] getElapsedNow called but _startMs is null!');
      return elapsed; // fall back to last known state value
    }
    const val = Math.floor((Date.now() - _startMs) / 1000);
    console.log('[Timer] getElapsedNow =', val, 'seconds');
    return val;
  }

  useEffect(() => () => stopTimer(), []);

  function collectFragment(index, value) {
    setFragments(prev => {
      const n = [...prev]; n[index] = value;
      saveSession({ team, screen, fragments: n, config: { difficulty: config.difficulty, fragments: config.fragments, finalAnswer: config.finalAnswer }, elapsed });
      return n;
    });
  }

  function resetGame() {
    stopTimer();
    _startMs = null;
    clearSession();
    setTeamRaw(null); setScreenRaw('intro');
    setFragments(['', '', '']); setElapsed(0);
  }

  const diff = DIFFICULTY_SETTINGS[config.difficulty];

  return (
    <GameContext.Provider value={{
      team, setTeam, screen, setScreen,
      fragments, collectFragment,
      config, setConfig,
      elapsed, startTimer, stopTimer, getElapsedNow,
      diff, resetGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() { return useContext(GameContext); }
