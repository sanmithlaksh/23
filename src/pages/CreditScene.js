import { useEffect, useState } from 'react';

export default function CreditScene({ team, elapsed, fragments, onRestart }) {
  const [phase, setPhase]     = useState('vault');   // vault → revealing → finale
  const [armageddonCode]      = useState("GRADIENT");
  
  // Story Monologue Finale
  const storyText = `Access confirmed.

Vault integrity: [ COMPROMISED ]
Security layers: [ BYPASSED ]
Core credentials: [ EXTRACTED ]

CIPHER network status: [ OFFLINE ]

All barriers have been systematically dismantled.
Every safeguard has failed under your logic.

You didn't guess your way through.
You understood the system... and then you rewrote it.

Mission complete.`;

  const [typedChars, setTypedChars] = useState('');
  const [showBtn, setShowBtn] = useState(false);

  const fmt = s => `${String(Math.floor((s||0)/60)).padStart(2,'0')}:${String((s||0)%60).padStart(2,'0')}`;

  // Transition from Loading to Revealing
  useEffect(() => {
    if (phase !== 'vault') return;
    const t = setTimeout(() => {
      setPhase('revealing');
      // Trigger finale after 6.5s of scoreboard reading
      setTimeout(() => setPhase('finale'), 6500);
    }, 2500); // 2.5s of "initialising vault sequence"
    return () => clearTimeout(t);
  }, [phase]);

  // Cinematic Typewriter Effect
  useEffect(() => {
    if (phase !== 'finale') return;
    let cancelled = false;
    let charIdx = 0;
    
    setTimeout(() => {
      const typeChar = () => {
        if (cancelled) return;
        charIdx++;
        setTypedChars(storyText.slice(0, charIdx));
        
        if (charIdx < storyText.length) {
          let delay = 35;
          const char = storyText[charIdx-1];
          if (char === '\\n') delay = 400; // Pause longer on new lines
          else if (char === '.' || char === ':') delay = 300; // Pause on punctuation
          
          setTimeout(typeChar, delay);
        } else {
          setTimeout(() => { if (!cancelled) setShowBtn(true); }, 1500);
        }
      };
      typeChar();
    }, 1000); // 1s delay before typing starts
    
    return () => { cancelled = true; };
  }, [phase]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', overflow: 'hidden', fontFamily: "'Cinzel', serif", zIndex: 9999 }}>
      
      {/* PHASE 1: Loading Text */}
      {phase === 'vault' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '8vh', zIndex: 10 }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.45em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', animation: 'pulseText 2s ease-in-out infinite' }}>
            ⬡ &nbsp; initialising vault sequence &nbsp; ⬡
          </div>
        </div>
      )}

      {/* PHASE 2: SCOREBOARD REVEAL */}
      {(phase === 'revealing' || phase === 'finale') && (
        <div className={`reveal-container ${phase === 'finale' ? 'shrink-top' : ''}`}>
          <h1 className="reveal-title slide-up-1">MYSTIC VAULT UNLOCKED</h1>
          
          <div className="stats-row slide-up-2">
            <div className="stat-box">
              <div className="stat-label">TEAM NAME</div>
              <div className="stat-value">{team?.name || 'UNKNOWN'}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">TIME</div>
              <div className="stat-value">{fmt(elapsed)}</div>
            </div>
          </div>

          <div className="fragments-section slide-up-3">
            <div className="stat-label" style={{marginBottom: '0.8rem'}}>COLLECTED FRAGMENTS</div>
            <div className="frag-row">
              {(fragments || []).map((f, i) => (
                <div key={i} className="frag-badge">{f || `FRAGMENT ${i+1}`}</div>
              ))}
            </div>
          </div>

          <div className="code-section slide-up-4">
            <div className="code-label">ARMAGEDDON STOP CODE REVEALED:</div>
            <div className="code-value">[ {armageddonCode} ]</div>
          </div>
        </div>
      )}

      {/* PHASE 3: STORYLINE FINALE */}
      {phase === 'finale' && (
        <div className="story-container fade-in-slow">
          <div className="story-line">
            {typedChars}<span className="cursor" />
          </div>
          
          {showBtn && (
            <button className="reset-btn" onClick={onRestart}>
              ⬡ INITIATE SYSTEM RESET ⬡
            </button>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Share+Tech+Mono&display=swap');
        
        .reveal-container {
          position: absolute; inset: 0; z-index: 20;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 2rem;
          transition: transform 2s ease, opacity 2s ease;
        }
        .reveal-container.shrink-top {
          transform: translateY(-28vh) scale(0.55);
          opacity: 0.8;
        }

        .reveal-title { color: #c9a84c; font-size: clamp(2rem, 5vw, 3.5rem); letter-spacing: 0.25em; text-shadow: 0 0 30px rgba(201,168,76,0.6); margin-bottom: 3rem; text-align: center; }
        .stats-row { display: flex; gap: 4rem; margin-bottom: 3rem; justify-content: center; width: 100%; }
        .stat-box { text-align: center; }
        .stat-label { font-family: 'Share Tech Mono', monospace; color: rgba(255,255,255,0.5); font-size: 0.9rem; letter-spacing: 0.3em; margin-bottom: 0.5rem; }
        .stat-value { color: #60e0ff; font-size: 1.8rem; letter-spacing: 0.15em; font-family: 'Cinzel', serif; }

        .fragments-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 3.5rem; width: 100%; }
        .frag-row { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; }
        .frag-badge { border: 1px solid rgba(201,168,76,0.5); background: rgba(201,168,76,0.1); color: #c9a84c; padding: 0.8rem 1.5rem; font-family: 'Share Tech Mono', monospace; font-size: 1.1rem; letter-spacing: 0.2em; box-shadow: 0 0 20px rgba(201,168,76,0.15); }

        .code-section { background: rgba(10, 0, 0, 0.7); border: 1px solid rgba(255,68,68,0.4); padding: 2rem; border-radius: 4px; text-align: center; min-width: 60%; box-shadow: inset 0 0 30px rgba(255,0,0,0.1); max-width: 800px; }
        .code-label { font-family: 'Share Tech Mono', monospace; color: #ff6666; font-size: 1rem; letter-spacing: 0.3em; margin-bottom: 1rem; }
        .code-value { font-family: 'Share Tech Mono', monospace; color: #00ff88; font-size: clamp(2rem, 4vw, 3rem); letter-spacing: 0.2em; text-shadow: 0 0 20px rgba(0,255,136,0.5); }

        .story-container {
          position: absolute; top: 38vh; left: 0; right: 0; bottom: 5vh;
          z-index: 30;
          display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
          overflow-y: auto; padding: 0 1rem;
        }
        .story-line {
          font-family: 'Share Tech Mono', monospace;
          color: rgba(200, 200, 220, 0.95);
          font-size: clamp(0.95rem, 2.2vw, 1.35rem);
          letter-spacing: 0.12em;
          text-align: left;
          line-height: 1.6;
          text-shadow: 0 0 10px rgba(200,200,220,0.3);
          width: 100%; max-width: 700px;
          white-space: pre-line;
        }
        .cursor {
          display: inline-block; width: 0.6em; height: 1em; background: rgba(200,200,220,0.8);
          animation: blink 1s step-end infinite; vertical-align: bottom; margin-left: 4px;
        }

        .reset-btn { font-family: 'Cinzel', serif; font-size: 0.9rem; letter-spacing: 0.3em; padding: 1rem 3rem; background: transparent; border: 1px solid rgba(201,168,76,0.5); color: rgba(201,168,76,0.9); cursor: pointer; transition: all 0.3s; margin-top: 2rem; animation: fadeIn 2s ease both; }
        .reset-btn:hover { background: rgba(201,168,76,0.15); box-shadow: 0 0 30px rgba(201,168,76,0.3); border-color: #c9a84c; }

        .slide-up-1 { animation: slideUp 1s ease 0.5s both; } .slide-up-2 { animation: slideUp 1s ease 1s both; } .slide-up-3 { animation: slideUp 1s ease 1.5s both; } .slide-up-4 { animation: slideUp 1s ease 2.5s both; }
        .fade-in-slow { animation: fadeIn 2s ease 0s both; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulseText { 0%,100% { opacity:0.4; letter-spacing:0.45em; } 50% { opacity:0.9; letter-spacing:0.55em; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
