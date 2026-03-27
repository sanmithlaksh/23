import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { saveProgress } from '../supabase';
import { showFlash } from '../components/Flash';
import ProgressTrack from '../components/ProgressTrack';
import CTFClue, { getCTFConfig, onCTFConfigLoad } from '../components/CTFClue';
import ImageCTFPuzzle from '../components/ImageCTFPuzzle';

export default function Round1Screen({ audio }) {
  const { config, diff, team, collectFragment, setScreen, getElapsedNow } = useGame();

  // Split puzzles into normal and CTF types
  const allPuzzles = config.r1Puzzles.slice(0, diff.r1Count);
  const normalPuzzles = allPuzzles.filter(p => !isCTF(p) && !isImageCTF(p));
  const htmlCTFPuzzle = allPuzzles.find(p => isCTF(p));
  const imageCTFPuzzle = allPuzzles.find(p => isImageCTF(p));

  const totalCount = normalPuzzles.length + (htmlCTFPuzzle ? 1 : 0) + (imageCTFPuzzle ? 1 : 0);

  const [normalSolved,   setNormalSolved]   = useState(Array(normalPuzzles.length).fill(false));
  const [inputs,         setInputs]         = useState(Array(normalPuzzles.length).fill(''));
  const [htmlCTFSolved,  setHtmlCTFSolved]  = useState(false);
  const [htmlCTFInput,   setHtmlCTFInput]   = useState('');
  const [imageCTFSolved, setImageCTFSolved] = useState(false);
  const [revealed,       setRevealed]       = useState(false);
  const [shake,          setShake]          = useState(-1);
  const [ctfConfig,      setCTFConfig]      = useState(getCTFConfig());

  // Listen for CTF config from DB
  useEffect(() => {
    const unsub = onCTFConfigLoad(cfg => setCTFConfig(cfg));
    return unsub;
  }, []);

  // Check if all puzzles solved
  useEffect(() => {
    const allNormal = normalSolved.every(Boolean);
    const allCTF    = (!htmlCTFPuzzle  || htmlCTFSolved);
    const allImage  = (!imageCTFPuzzle || imageCTFSolved);
    if (allNormal && allCTF && allImage && !revealed) revealFragment();
  }, [normalSolved, htmlCTFSolved, imageCTFSolved]);

  function triggerShake(i) { setShake(i); setTimeout(() => setShake(-1), 400); }

  // Normal puzzle check
  function checkNormal(idx) {
    audio.playClick();
    const val = inputs[idx].trim().toUpperCase();
    if (val === normalPuzzles[idx].answer.toUpperCase()) {
      const next = [...normalSolved]; next[idx] = true; setNormalSolved(next);
      audio.playSuccess();
      showFlash('Correct!', 'success');
    } else {
      audio.playError(); audio.playAlarm();
      triggerShake(idx);
      showFlash('Incorrect. Try again.', 'error');
    }
  }
  function setInput(i, v) { const a = [...inputs]; a[i] = v; setInputs(a); }

  // HTML CTF check
  function checkHTMLCTF() {
    audio.playClick();
    const val = htmlCTFInput.trim().toUpperCase();
    const expected = ctfConfig?.html_flag || 'SHADOW';
    if (val === expected) {
      setHtmlCTFSolved(true);
      audio.playSuccess();
      audio.playCTFFound(); showFlash('Source code flag found!', 'success');
    } else {
      audio.playError(); audio.playAlarm();
      showFlash('Incorrect flag. Keep looking.', 'error');
    }
  }

  async function revealFragment() {
    setRevealed(true);
    collectFragment(0, config.fragments[0]);
    audio.playRoundWin();
    showFlash(`Fragment 1 unlocked: ${config.fragments[0]}`, 'info', 4000);
    if (team) await saveProgress(team.id, { currentRound: 2, fragment1: config.fragments[0] , elapsedSeconds: getElapsedNow() });
  }

  const solvedCount = normalSolved.filter(Boolean).length +
                      (htmlCTFSolved ? 1 : 0) +
                      (imageCTFSolved ? 1 : 0);

  return (
    <div className="screen screen-padded">
      <div className="panel">
        <h2>ROUND 1 — CIPHER GATE</h2>
        <p className="subtitle">
          Break the first layer of encryption
          <span className={`diff-badge ${config.difficulty}`}>{config.difficulty}</span>
        </p>
        <ProgressTrack current={1} />

        {/* Inject HTML CTF clue into DOM */}
        <CTFClue />

        <div className="voice-box">
          <div className="voice-speaker">⬡ Vault AI</div>
          CIPHER Gate detected. All entry codes have been encrypted. Our analysts recovered fragments — but CIPHER is watching. Decode every cipher before it locks us out permanently.
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem', padding: '0.65rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid #1a1a2e' }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: '0.72rem', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Progress:</div>
          <div style={{ flex: 1, height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalCount > 0 ? (solvedCount / totalCount) * 100 : 0}%`, background: 'var(--gold)', transition: 'width 0.4s ease', borderRadius: 2 }} />
          </div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: '0.72rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>{solvedCount}/{totalCount}</div>
        </div>

        {/* ── Normal puzzles ── */}
        {normalPuzzles.map((p, i) => (
          <div key={p.id} className={`puzzle-card ${normalSolved[i] ? 'solved' : ''} ${shake === i ? 'shake' : ''}`}>
            <h3 style={{ fontSize: '0.82rem' }}>{p.label}</h3>
            <div className="cipher-text">{p.encrypted}</div>
            <div className="hint-text">Hint: {p.hint}</div>
            {!normalSolved[i] ? (
              <div className="input-row">
                <input type="text" placeholder="Your answer…" value={inputs[i]}
                  onChange={e => setInput(i, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkNormal(i)}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }} />
                <button className="btn btn-sm" onClick={() => checkNormal(i)}>CHECK</button>
              </div>
            ) : <div className="solved-badge">✓ Solved</div>}
          </div>
        ))}

        {/* ── HTML CTF Puzzle ── */}
        {htmlCTFPuzzle && (
          <div className={`puzzle-card ${htmlCTFSolved ? 'solved' : ''}`}>
            <h3 style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {htmlCTFPuzzle.label}
              <span style={{ fontSize: '0.6rem', border: '1px solid var(--blue)', color: 'var(--blue)', padding: '0.1rem 0.35rem', letterSpacing: '0.1em' }}>CTF — SOURCE CODE</span>
            </h3>
            <div style={{ background: 'rgba(20,30,60,0.5)', border: '1px solid #1a3366', borderLeft: '3px solid var(--blue)', padding: '0.9rem 1.1rem', margin: '0.6rem 0', fontSize: '0.92rem', color: '#99aacc', lineHeight: 1.7 }}>
              The vault has left a trace in this page. Inspect the source code to find it.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #1a1a2e', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#888', lineHeight: 2, marginBottom: '0.75rem' }}>
              <div>1. Press <code style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #333', padding: '0.1rem 0.4rem', color: 'var(--gold-dim)', fontFamily: 'Share Tech Mono,monospace' }}>F12</code> to open DevTools</div>
              <div>2. Go to the <code style={{ color: 'var(--gold-dim)', fontFamily: 'Share Tech Mono,monospace' }}>Elements</code> tab</div>
              <div>3. Expand the <code style={{ color: 'var(--gold-dim)', fontFamily: 'Share Tech Mono,monospace' }}>&lt;head&gt;</code> tag and look for a hidden comment</div>
              <div style={{ color: '#555', fontSize: '0.76rem' }}>Alt: Right-click page → View Page Source → search for VAULT</div>
            </div>
            <div className="hint-text">Hint: {htmlCTFPuzzle.hint}</div>
            {!htmlCTFSolved ? (
              <div className="input-row">
                <input type="text" placeholder="Enter the flag you found in the source…"
                  value={htmlCTFInput} onChange={e => setHtmlCTFInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkHTMLCTF()}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }} />
                <button className="btn btn-sm" onClick={checkHTMLCTF}>CHECK</button>
              </div>
            ) : <div className="solved-badge">✓ Flag Found</div>}
          </div>
        )}

        {/* ── Image CTF Puzzle ── */}
        {imageCTFPuzzle && (
          <div className={`puzzle-card ${imageCTFSolved ? 'solved' : ''}`}>
            <h3 style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {imageCTFPuzzle.label}
              <span style={{ fontSize: '0.6rem', border: '1px solid var(--purple)', color: 'var(--purple)', padding: '0.1rem 0.35rem', letterSpacing: '0.1em' }}>CTF — IMAGE METADATA</span>
            </h3>
            {!imageCTFSolved ? (
              <ImageCTFPuzzle
                teamId={team?.id}
                solved={imageCTFSolved}
                onCheck={(correct) => {
                  if (correct) {
                    setImageCTFSolved(true);
                    audio.playSuccess();
                    showFlash('Image metadata flag found!', 'success');
                  } else {
                    audio.playError(); audio.playAlarm();
                    showFlash('Incorrect flag. Keep searching.', 'error');
                  }
                }}
              />
            ) : <div className="solved-badge">✓ Metadata Flag Found</div>}
          </div>
        )}

        {/* Fragment reveal */}
        {revealed && (
          <>
            <div className="frag-reveal">
              <div className="frag-label">⬡ Vault Fragment 1 Acquired</div>
              <div className="frag-value">{config.fragments[0]}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={() => setScreen('r2')}>
                ADVANCE TO ROUND 2 — MAZE SYSTEM →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helpers
function isCTF(p) {
  return p.encrypted && p.encrypted.trim().startsWith('<!--') && !p.encrypted.includes('IMAGE_CTF');
}
function isImageCTF(p) {
  return p.encrypted && p.encrypted.trim() === '[[IMAGE_CTF]]';
}
