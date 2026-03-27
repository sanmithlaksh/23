import { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';

const BRIEFING_LINES = [
  "YEAR 2087. CLASSIFICATION: ULTRA SECRET.",
  "A rogue AI designated CIPHER has seized the Mystic Vault —",
  "the most secure digital fortress ever constructed.",
  "Inside: encryption keys to every government system on Earth.",
  "If CIPHER reaches the vault core... civilization falls.",
  "You are our last line of defence.",
  "Three security layers stand between you and the vault core.",
  "Breach them. Recover the fragments. Unlock the vault.",
  "Operation Vault Zero begins now.",
];

const MAP_NODES = [
  { label: 'Login',       icon: '🔐', x: '8%',  y: '50%', status: 'active' },
  { label: 'Cipher Gate', icon: '📜', x: '28%', y: '28%', status: '' },
  { label: 'Dark Maze',   icon: '🌑', x: '50%', y: '62%', status: '' },
  { label: 'Cmd Override',icon: '💻', x: '70%', y: '28%', status: '' },
  { label: 'Boss Stage',  icon: '⚡', x: '82%', y: '65%', status: '' },
  { label: 'Vault',       icon: '🏛️', x: '91%', y: '38%', status: '' },
];

export default function IntroScreen() {
  const { setScreen } = useGame();
  const [phase,       setPhase]       = useState('glitch');   // glitch → title → brief → map → ready
  const [glitchText,  setGlitchText]  = useState('');
  const [titleVisible,setTitleVisible]= useState(false);
  const [lineIdx,     setLineIdx]     = useState(0);
  const [lineText,    setLineText]    = useState('');
  const [linesShown,  setLinesShown]  = useState([]);
  const [mapVisible,  setMapVisible]  = useState(false);
  const [btnVisible,  setBtnVisible]  = useState(false);
  const [scanline,    setScanline]    = useState(0);
  const rafRef = useRef(null);

  const GLITCH_CHARS = '!@#$%^&*<>?/\\|[]{}ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  // Scanline animation
  useEffect(() => {
    const iv = setInterval(() => setScanline(p => (p + 2) % 100), 16);
    return () => clearInterval(iv);
  }, []);

  // Phase controller
  useEffect(() => {
    // Phase 1: Glitch text for 1.8s
    let glitchIv = setInterval(() => {
      setGlitchText(Array.from({length:12},()=>GLITCH_CHARS[Math.floor(Math.random()*GLITCH_CHARS.length)]).join(''));
    }, 60);

    const t1 = setTimeout(() => {
      clearInterval(glitchIv);
      setGlitchText('');
      setPhase('title');
      setTitleVisible(true);

      // Phase 2: After title fades in, start briefing
      const t2 = setTimeout(() => {
        setPhase('brief');
        setLineIdx(0);
      }, 1200);
      return () => clearTimeout(t2);
    }, 1800);

    return () => { clearTimeout(t1); clearInterval(glitchIv); };
  }, []);

  // Typewriter for briefing lines
  useEffect(() => {
    if (phase !== 'brief') return;
    if (lineIdx >= BRIEFING_LINES.length) {
      setTimeout(() => { setMapVisible(true); setPhase('map'); }, 400);
      setTimeout(() => setBtnVisible(true), 900);
      return;
    }
    const line = BRIEFING_LINES[lineIdx];
    let charIdx = 0;
    setLineText('');
    const iv = setInterval(() => {
      charIdx++;
      setLineText(line.slice(0, charIdx));
      if (charIdx >= line.length) {
        clearInterval(iv);
        setTimeout(() => {
          setLinesShown(prev => [...prev, line]);
          setLineText('');
          setLineIdx(i => i + 1);
        }, lineIdx === BRIEFING_LINES.length - 1 ? 300 : 180);
      }
    }, 22);
    return () => clearInterval(iv);
  }, [phase, lineIdx]);

  function handleSkip() {
    setPhase('map');
    setLinesShown(BRIEFING_LINES);
    setLineText('');
    setLineIdx(BRIEFING_LINES.length);
    setMapVisible(true);
    setBtnVisible(true);
  }

  return (
    <div style={{
      position: 'relative', zIndex: 1, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '2rem 1rem', overflow: 'hidden',
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: `linear-gradient(transparent ${scanline}%, rgba(0,255,100,0.015) ${scanline}%, rgba(0,255,100,0.015) ${scanline+0.5}%, transparent ${scanline+0.5}%)`,
      }}/>

      {/* CRT vignette */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)',
      }}/>

      <div style={{ maxWidth: 860, width: '100%', position: 'relative', zIndex: 3 }}>

        {/* Glitch phase */}
        {phase === 'glitch' && (
          <div style={{
            fontFamily: 'Share Tech Mono, monospace', fontSize: 'clamp(1.5rem,4vw,2.5rem)',
            color: '#00ff88', textAlign: 'center', letterSpacing: '0.3em',
            textShadow: '0 0 20px #00ff88, 0 0 40px #00ff88',
            animation: 'glitchFlicker 0.1s infinite',
          }}>
            {glitchText}
          </div>
        )}

        {/* Title */}
        {titleVisible && (
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.4em',
              color: '#666', textTransform: 'uppercase', marginBottom: '0.75rem',
              animation: 'fadeSlideDown 0.8s ease forwards',
            }}>
              — A Team Puzzle Challenge —
            </div>
            <div style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(2.5rem, 7vw, 5rem)',
              fontWeight: 900,
              letterSpacing: '0.18em',
              background: 'linear-gradient(180deg, #f0cc6e 0%, #c9a84c 40%, #7a6030 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.6))',
              animation: 'titleReveal 1.2s cubic-bezier(0.16,1,0.3,1) forwards',
              transformOrigin: 'center',
            }}>
              MYSTIC VAULT
            </div>
            {/* Animated underline */}
            <div style={{
              height: 2, marginTop: '0.5rem',
              background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
              animation: 'expandWidth 1s ease 0.5s forwards',
              width: 0, margin: '0.5rem auto 0',
            }}/>
          </div>
        )}

        {/* Map */}
        {mapVisible && (
          <div style={{
            position: 'relative', width: '100%', height: 200,
            background: 'rgba(0,0,0,0.4)', border: '1px solid #1a1a2e',
            margin: '1.5rem 0', overflow: 'hidden',
            animation: 'fadeSlideUp 0.6s ease forwards',
          }}>
            <svg style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none' }}>
              {[[0,1],[1,2],[2,3],[3,4],[4,5]].map(([a,b],i) => {
                const na=MAP_NODES[a], nb=MAP_NODES[b];
                return (
                  <line key={i}
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke="#2a2a3a" strokeWidth="1" strokeDasharray="4 4"
                    style={{ animation: `dashDraw 1s ease ${i*0.15}s forwards` }}
                  />
                );
              })}
            </svg>
            {MAP_NODES.map((n, i) => (
              <div key={i} style={{
                position: 'absolute', left: n.x, top: n.y,
                transform: 'translate(-50%,-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                animation: `popIn 0.4s ease ${0.2 + i*0.1}s both`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: `2px solid ${i===0?'var(--gold)':'#333'}`,
                  background: i===0?'rgba(201,168,76,0.15)':'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem',
                  boxShadow: i===0?'0 0 12px rgba(201,168,76,0.5)':'none',
                  animation: i===0?'pulseDot 2s infinite':'none',
                }}>
                  {n.icon}
                </div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.08em', color: '#555', whiteSpace: 'nowrap' }}>
                  {n.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Briefing terminal */}
        {(phase === 'brief' || phase === 'map') && (
          <div style={{
            background: 'rgba(0,5,2,0.85)', border: '1px solid #0a3a1a',
            borderLeft: '3px solid #00ff88', padding: '1rem 1.25rem',
            fontFamily: 'Share Tech Mono, monospace', fontSize: '0.82rem',
            lineHeight: 1.9, marginBottom: '1.5rem',
            animation: 'fadeSlideUp 0.5s ease forwards',
          }}>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', color: '#00aa55', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              ⬡ System Broadcast — Operation Vault Zero
            </div>
            {linesShown.map((line, i) => (
              <div key={i} style={{ color: i < 2 ? '#00ff88' : i < 5 ? '#aaffcc' : '#88ccaa' }}>
                {line}
              </div>
            ))}
            {lineText && (
              <div style={{ color: '#00ff88' }}>
                {lineText}<span style={{ animation: 'blink 0.6s step-end infinite', display: 'inline-block', width: 8, height: '1em', background: '#00ff88', verticalAlign: 'middle', marginLeft: 2 }}/>
              </div>
            )}
            
            {phase === 'brief' && !btnVisible && (
              <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                 <button onClick={handleSkip} style={{ background: 'transparent', color: '#00aa55', border: '1px solid #00aa55', padding: '0.2rem 1rem', cursor: 'pointer', fontFamily: 'Share Tech Mono', fontSize: '0.75rem', borderRadius: '2px', textTransform:'uppercase' }}>
                   Skip Transmission [&gt;&gt;]
                 </button>
              </div>
            )}
          </div>
        )}

        {/* CTA Button */}
        {btnVisible && (
          <div style={{ textAlign: 'center', animation: 'fadeSlideUp 0.6s ease forwards' }}>
            <button
              onClick={() => setScreen('login')}
              style={{
                fontFamily: 'Cinzel, serif', fontSize: '0.88rem', letterSpacing: '0.2em',
                padding: '1.1rem 3rem', textTransform: 'uppercase',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))',
                border: '1px solid var(--gold)', color: 'var(--gold-bright)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.35), rgba(201,168,76,0.15))';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(201,168,76,0.4), 0 0 60px rgba(201,168,76,0.1)';
                e.currentTarget.style.letterSpacing = '0.25em';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.letterSpacing = '0.2em';
              }}
            >
              ENTER THE VAULT SYSTEM →
            </button>
            <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase' }}>
              Authorised Personnel Only
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes glitchFlicker {
          0%,100%{opacity:1;transform:skewX(0)}
          20%{opacity:0.8;transform:skewX(-2deg)}
          60%{opacity:0.9;transform:skewX(1deg)}
        }
        @keyframes titleReveal {
          0%{opacity:0;transform:scale(0.85) translateY(20px);filter:drop-shadow(0 0 40px rgba(201,168,76,0.8)) blur(8px)}
          60%{filter:drop-shadow(0 0 30px rgba(201,168,76,0.6)) blur(2px)}
          100%{opacity:1;transform:scale(1) translateY(0);filter:drop-shadow(0 0 20px rgba(201,168,76,0.5))}
        }
        @keyframes fadeSlideDown {
          from{opacity:0;transform:translateY(-15px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes fadeSlideUp {
          from{opacity:0;transform:translateY(15px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes expandWidth {
          from{width:0} to{width:60%}
        }
        @keyframes popIn {
          from{opacity:0;transform:translate(-50%,-50%) scale(0.5)}
          to{opacity:1;transform:translate(-50%,-50%) scale(1)}
        }
        @keyframes pulseDot {
          0%,100%{box-shadow:0 0 8px rgba(201,168,76,0.5)}
          50%{box-shadow:0 0 22px rgba(201,168,76,0.9),0 0 40px rgba(201,168,76,0.3)}
        }
      `}</style>
    </div>
  );
}
