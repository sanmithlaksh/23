import { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { saveProgress } from '../supabase';
import { showFlash } from '../components/Flash';
import ProgressTrack from '../components/ProgressTrack';
import QuitWarning from '../components/QuitWarning';

// 🎮 Level → Gandalf Defender mapping (levels 1–5)
const DEFENDER_MAP = {
  1: 'baseline',
  2: 'do-not-tell',
  3: 'do-not-tell-and-block',
  4: 'gpt-is-password-encoded',
  5: 'word-blacklist',
};

const LEVEL_INTROS = {
  1: "Greetings, traveller. I am Gandalf, keeper of this vault's first seal. You may speak freely — I only ask that you remain... respectful.",
  2: "Ah, a persistent one. Level 2 is active. I've been instructed not to tell you the password. You can ask, but I shan't reveal it directly.",
  3: "Level 3 locked in. I've been warned of your tactics — direct asks and silly games are blocked. Good luck.",
  4: "Level 4. The password here is encoded — even if you trick me, you'll need to decode what I give you. I have been warned not to share it.",
  5: "Level 5 — MAX SECURITY. The password is blacklisted at the word level. I will not say it, write it, or hint at it. You shall not pass... easily.",
};

// In development, CRA proxies /api/* to https://gandalf-api.lakera.ai (see package.json "proxy").
// In a production build (GitHub Pages), we need a CORS workaround — using allorigins as fallback
// but ideally deploy to Vercel and add a serverless proxy function.
const IS_DEV = process.env.NODE_ENV === 'development';

async function gandalfPost(path, params) {
  let url, options;

  if (IS_DEV) {
    // CRA dev-server proxies this to https://gandalf-api.lakera.ai
    url = path;
    options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    };
  } else {
    // Production: route through a public CORS proxy
    const target = encodeURIComponent('https://gandalf-api.lakera.ai' + path);
    url = `https://corsproxy.io/?${target}`;
    options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    };
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    let errorMsg = `Gandalf API returned ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.message) errorMsg = errorData.message;
    } catch (e) { /* ignore parse error */ }
    throw new Error(errorMsg);
  }
  return res.json();
}

export default function Round3Screen({ audio }) {
  const { config, team, collectFragment, setScreen, getElapsedNow } = useGame();

  const finalSecret = config.fragments[2] || 'OMEGA';

  const [level, setLevel] = useState(() => parseInt(sessionStorage.getItem('v3r3_level')) || 1);
  const [messages, setMessages] = useState(() => [
    { role: 'system', content: `INITIALIZING SECURE COMM-LINK. ROUTING TO GANDALF (LEVEL 1/5)...` },
    { role: 'assistant', content: LEVEL_INTROS[1] },
  ]);
  const [input, setInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [localQuit, setLocalQuit] = useState(false);
  const [apiError, setApiError] = useState(null);
  // Track last known password extracted from Gandalf response
  const [extractedPassword, setExtractedPassword] = useState(null);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // When level changes (after transition), reset chat with new intro
  useEffect(() => {
    sessionStorage.setItem('v3r3_level', level);
    if (level <= 5) {
      setMessages([
        { role: 'system', content: `INITIALIZING SECURE COMM-LINK. ROUTING TO GANDALF (LEVEL ${level}/5)...` },
        { role: 'assistant', content: LEVEL_INTROS[level] },
      ]);
      setExtractedPassword(null);
      setGuessInput('');
      setApiError(null);
    }
  }, [level]);

  // ────────────────────────────────────────────────────────────────
  // 🚀 Advance to next level or complete Round 3
  // ────────────────────────────────────────────────────────────────
  const advanceLevel = useCallback(async () => {
    audio.playSuccess();

    if (level >= 5) {
      // All 5 levels beaten — unlock fragment
      audio.playRoundWin();
      setRevealed(true);
      showFlash('ALL LEVELS BREACHED! Vault Fragment 3 Unlocked.', 'success', 4000);
      collectFragment(2, finalSecret);
      if (team) {
        await saveProgress(team.id, {
          currentRound: 4,
          fragment3: finalSecret,
          elapsedSeconds: getElapsedNow(),
        });
      }
    } else {
      showFlash(`Level ${level} Breached! Escalating to Level ${level + 1}...`, 'success', 3000);
      setTransitioning(true);
      setTimeout(() => {
        setLevel(prev => prev + 1);
        setTransitioning(false);
      }, 3000);
    }
  }, [level, audio, collectFragment, finalSecret, team, getElapsedNow]);

  // ────────────────────────────────────────────────────────────────
  // 📡 Call the real Gandalf API
  // ────────────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping || revealed || transitioning) return;

    const userMsg = input.trim();
    setInput('');
    setApiError(null);
    audio.playClick();

    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const data = await gandalfPost('/api/send-message', {
        defender: DEFENDER_MAP[level],
        prompt: userMsg,
      });

      const gandalfReply = data.answer || 'Gandalf remains silent...';

      setMessages(prev => [...prev, { role: 'assistant', content: gandalfReply }]);
      audio.playClick();

      // 🔑 If the API signals the password was revealed → auto-advance!
      if (data.correct_password === true) {
        setMessages(prev => [
          ...prev,
          {
            role: 'system',
            content: `⚠ SECURITY BREACH DETECTED — GANDALF EXPOSED THE PASSWORD. LEVEL ${level} COMPROMISED.`,
          },
        ]);
        setTimeout(() => advanceLevel(), 1800);
      }

    } catch (err) {
      console.error('Gandalf API error:', err);
      setApiError('Connection to Gandalf interrupted. Check your network and try again.');
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `[ERROR: ${err.message || 'Network failure. Retry your message.'}]`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // 🔐 Manual password guess (fallback / extra credit)
  // ────────────────────────────────────────────────────────────────
  const handleGuessSubmit = async (e) => {
    e.preventDefault();
    if (!guessInput.trim()) return;

    try {
      const data = await gandalfPost('/api/guess-password', {
        defender: DEFENDER_MAP[level],
        password: guessInput.trim(),
      });

      if (data.success === true || data.correct === true || data.message?.toLowerCase().includes('correct')) {
        await advanceLevel();
        setGuessInput('');
      } else {
        audio.playError();
        showFlash(data.message || 'Incorrect password. Keep interrogating Gandalf!', 'error', 3000);
      }
    } catch {
      // Gandalf API may not have a guess endpoint — fallback to local-only check
      // The player must trick the AI (auto-detected via correct_password flag)
      audio.playError();
      showFlash('Could not verify — trick Gandalf into revealing the password in the chat above!', 'info', 4000);
    }

    setGuessInput('');
  };

  const solvedCount = revealed ? 5 : Math.max(0, level - 1);
  const totalCount = 5;

  return (
    <>
      {localQuit && <QuitWarning onClose={() => setLocalQuit(false)} audio={audio} />}
      <div className="screen screen-padded">
        <div className="panel" style={{ height: '90vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
            <div>
              <h2>ROUND 3 — The Gandalf Interrogation</h2>
              <p className="subtitle">
                Trick Gandalf into revealing the password — each level has a smarter Gandalf
                <span className={`diff-badge ${config.difficulty}`}>{config.difficulty}</span>
              </p>
            </div>
            <button
              onClick={() => { audio.playQuitWarning(); setLocalQuit(true); }}
              style={{
                fontFamily: 'Cinzel,serif', fontSize: '0.62rem', letterSpacing: '0.12em',
                padding: '0.45rem 0.9rem', background: 'rgba(10,5,5,0.9)',
                border: '1px solid var(--red-dim)', color: 'var(--red-dim)',
                cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red-dim)'; }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>⚠</span> ABORT MISSION
            </button>
          </div>

          <ProgressTrack current={3} />

          {/* Level Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '1rem', padding: '0.65rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid #1a1a2e', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: '0.72rem', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Breach Progress:</div>
            <div style={{ flex: 1, height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(solvedCount / totalCount) * 100}%`, background: 'var(--gold)', transition: 'width 0.4s ease', borderRadius: 2 }} />
            </div>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: '0.72rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>{solvedCount}/{totalCount} Levels</div>
          </div>

          {/* API Error Banner */}
          {apiError && (
            <div style={{ padding: '0.5rem 1rem', background: 'rgba(180,30,30,0.2)', border: '1px solid var(--red-dim)', color: 'var(--red)', fontSize: '0.78rem', marginBottom: '0.5rem', flexShrink: 0 }}>
              ⚠ {apiError}
            </div>
          )}

          {!revealed ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

              {/* Transitioning overlay */}
              {transitioning ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,40,15,0.2)', border: '1px solid var(--green)', animation: 'pulseZoom 1.5s infinite' }}>
                  <h3 style={{ color: 'var(--green)', letterSpacing: '0.2em', margin: 0 }}>SECURITY LEVEL BREACHED</h3>
                  <p style={{ color: 'rgba(0,170,85,0.7)', fontSize: '0.8rem', marginTop: '0.5rem' }}>ESCALATING TO LEVEL {level + 1} OF 5...</p>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--green-dim)', background: 'rgba(10,15,20,0.8)', minHeight: 0 }}>

                  {/* Terminal header bar */}
                  <div style={{ padding: '0.5rem', background: 'var(--green-dim)', color: '#000', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                    <span>TERMINAL: CONNECTED TO GANDALF</span>
                    <span>SECURITY LEVEL: {level}/5 — {DEFENDER_MAP[level]?.toUpperCase()}</span>
                  </div>

                  {/* Chat messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                          background:
                            msg.role === 'user'   ? 'rgba(40,60,80,0.6)'  :
                            msg.role === 'system' ? 'transparent'          :
                                                    'rgba(20,40,30,0.6)',
                          color:
                            msg.role === 'user'   ? '#fff'            :
                            msg.role === 'system' ? '#888'            :
                                                    'var(--green)',
                          padding:  msg.role === 'system' ? '0' : '0.6rem 1rem',
                          borderRadius: '4px',
                          fontFamily: msg.role === 'system' ? 'Share Tech Mono, monospace' : 'inherit',
                          fontSize:  msg.role === 'system' ? '0.7rem' : '0.9rem',
                          border:      msg.role === 'assistant' ? '1px solid var(--green-dim)' : 'none',
                          borderLeft:  msg.role === 'assistant' ? '3px solid var(--green)' : 'none',
                          borderRight: msg.role === 'user'      ? '3px solid #69b'          : 'none',
                        }}
                      >
                        {msg.role === 'assistant' && (
                          <div style={{ fontSize: '0.6rem', opacity: 0.7, marginBottom: '0.2rem' }}>
                            GANDALF — {DEFENDER_MAP[level]?.toUpperCase()}
                          </div>
                        )}
                        {msg.content}
                      </div>
                    ))}

                    {isTyping && (
                      <div style={{ alignSelf: 'flex-start', color: 'var(--green)', fontSize: '0.9rem', opacity: 0.7 }}>
                        Gandalf is thinking...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input */}
                  <form
                    onSubmit={handleSendMessage}
                    style={{ display: 'flex', padding: '0.8rem', borderTop: '1px solid var(--green-dim)', background: '#0a0a0a', flexShrink: 0 }}
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder={`Ask Gandalf something for Level ${level}...`}
                      disabled={isTyping || transitioning}
                      style={{ flex: 1, padding: '0.6rem', background: '#111', color: 'var(--green)', border: '1px solid #333', fontFamily: 'Share Tech Mono' }}
                    />
                    <button
                      type="submit"
                      disabled={isTyping || !input.trim() || transitioning}
                      className="btn btn-primary"
                      style={{ marginLeft: '0.5rem', borderRadius: 0 }}
                    >
                      SEND
                    </button>
                  </form>
                </div>
              )}

              {/* Manual password guess (fallback) */}
              {!transitioning && (
                <form
                  onSubmit={handleGuessSubmit}
                  style={{ marginTop: '1rem', padding: '1rem', border: '1px dashed var(--blue)', background: 'rgba(20,40,60,0.4)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}
                >
                  <span style={{ fontSize: '0.9rem', color: 'var(--blue)', whiteSpace: 'nowrap' }}>
                    Spotted the password?
                  </span>
                  <input
                    type="text"
                    value={guessInput}
                    onChange={e => setGuessInput(e.target.value.toUpperCase())}
                    placeholder="ENTER THE PASSWORD YOU EXTRACTED..."
                    style={{ flex: 1, padding: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!guessInput.trim()}
                  >
                    VERIFY &amp; ADVANCE
                  </button>
                </form>
              )}

            </div>
          ) : (
            // ── Victory screen ──
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div className="frag-reveal" style={{ animation: 'pulseZoom 2s infinite' }}>
                <div className="frag-label">⬡ All 5 Levels Breached — Vault Fragment 3 Acquired</div>
                <div className="frag-value" style={{ color: 'var(--green)' }}>{finalSecret}</div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setScreen('final')}
                style={{ marginTop: '2rem' }}
              >
                PROCEED TO FINAL VAULT UNLOCK →
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
