import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { showFlash } from '../components/Flash';
import ProgressTrack from '../components/ProgressTrack';

export default function BossScreen({ audio }) {
  const { config, diff, setScreen } = useGame();
  const seqLen  = diff.bossSeqLen;
  const answer  = config.bossAnswer.slice(0, seqLen);
  // Pool shows only the symbols that are part of this level's answer
  // so available options always equals the number of slots — fair across all levels
  const symbols = config.bossSymbols.filter(s => answer.includes(s.id));

  const [seq,      setSeq]      = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [shake,    setShake]    = useState(false);

  function selectSym(id) {
    if (seq.length >= seqLen || revealed) return;
    audio.playClick();
    setSeq(prev => [...prev, id]);
  }

  function clearSeq() { setSeq([]); }

  function checkBoss() {
    audio.playClick();
    if (seq.length < seqLen) { showFlash(`Select ${seqLen} symbols.`, 'error'); return; }
    if (seq.every((id, i) => id === answer[i])) {
      setRevealed(true);
      audio.playVaultOpen();
      showFlash('The vault barrier crumbles…', 'info', 3000);
    } else {
      audio.playError(); audio.playAlarm();
      setShake(true); setTimeout(() => setShake(false), 400);
      showFlash('Incorrect sequence. The vault resists.', 'error');
      clearSeq();
    }
  }

  const selectedIds = new Set(seq);

  return (
    <div className="screen screen-padded">
      <div className="panel">
        <h2>⬡ FINAL BARRIER</h2>
        <p className="subtitle">
          The Vault Cipher — Boss Stage
          <span className={`diff-badge ${config.difficulty}`}>{config.difficulty}</span>
        </p>
        <ProgressTrack current={4} />

        <div className="voice-box">
          <div className="voice-speaker">⬡ Vault AI — ALERT</div>
          Last line of defence active. Decode the symbol sequence from the clue to proceed.
        </div>

        <div className="clue-box">{config.bossClue}</div>
        <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: '0.5rem' }}>Select {seqLen} symbols in the exact order described.</p>

        <div className={`symbol-grid ${shake ? 'shake' : ''}`}>
          {symbols.map(s => (
            <div
              key={s.id}
              className={`sym-card ${selectedIds.has(s.id) ? 'selected' : ''}`}
              onClick={() => selectSym(s.id)}
            >
              <span className="sym">{s.sym}</span>
              <span className="sym-lbl">{s.label}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: '#666', textTransform: 'uppercase', margin: '0.8rem 0 0.3rem' }}>Your Sequence:</div>
        <div className="boss-seq">
          {Array.from({ length: seqLen }, (_, i) => {
            const id = seq[i];
            const sym = id ? symbols.find(s => s.id === id)?.sym : '';
            return (
              <div key={i} className={`boss-seq-slot ${sym ? 'filled' : ''}`}>{sym}</div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem' }}>
          <button className="btn btn-sm" onClick={clearSeq}>CLEAR</button>
          <button className="btn btn-primary btn-sm" onClick={checkBoss}>SUBMIT SEQUENCE</button>
        </div>

        {revealed && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
            <div className="frag-reveal" style={{ borderColor: 'var(--gold)' }}>
              <div className="frag-label">⬡ Final Barrier Breached</div>
              <div className="frag-value">PROCEED</div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setScreen('final')}>
              ENTER THE VAULT →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
