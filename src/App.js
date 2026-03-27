import { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { useAudio } from './hooks/useAudio';
import { loadSession, clearSession } from './hooks/useSession';
import Starfield from './components/Starfield';
import StatusBar from './components/StatusBar';
import Flash from './components/Flash';
import QuitWarning from './components/QuitWarning';
import ResumePrompt from './components/ResumePrompt';
import CTFClue from './components/CTFClue';
import IntroScreen from './pages/IntroScreen';
import LoginScreen from './pages/LoginScreen';
import Round1Screen from './pages/Round1Screen';
import Round2Screen from './pages/Round2Screen';
import Round3Screen from './pages/Round3Screen';
import FinalScreen from './pages/FinalScreen';
import AdminPanel from './pages/AdminPanel';

function GameRouter({ audio }) {
  const { screen, team, setScreen, setTeam, setConfig, startTimer } = useGame();
  const [adminOpen,   setAdminOpen]   = useState(false);
  const [quitOpen,    setQuitOpen]    = useState(false);
  const [resumeSession, setResumeSession] = useState(null);

  // Check for saved session on mount
  useEffect(() => {
    const saved = loadSession();
    if (saved?.team && saved?.screen && saved.screen !== 'intro' && saved.screen !== 'login') {
      setResumeSession(saved);
    }
  }, []);

  // Browser close/refresh warning
  useEffect(() => {
    function beforeUnload(e) {
      if (team && screen !== 'intro' && screen !== 'final') {
        e.preventDefault();
        e.returnValue = 'You have an active mission. Your progress is saved — you can resume when you return.';
        return e.returnValue;
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [team, screen]);

  function handleResume(saved) {
    // Restore team and config from session
    setTeam(saved.team);
    if (saved.config) setConfig(prev => ({ ...prev, ...saved.config }));
    setScreen(saved.screen);
    startTimer();
    audio.startBg();
    setResumeSession(null);
  }

  function handleFresh() {
    clearSession();
    setResumeSession(null);
  }

  const showQuitBtn = team && !['intro','login','final'].includes(screen);

  return (
    <>
      <Starfield />
      <StatusBar />
      <Flash />
      <CTFClue />

      {/* Resume prompt */}
      {resumeSession && (
        <ResumePrompt
          session={resumeSession}
          onResume={() => handleResume(resumeSession)}
          onFresh={handleFresh}
          audio={audio}
        />
      )}

      {/* Quit warning */}
      {quitOpen && <QuitWarning onClose={() => setQuitOpen(false)} audio={audio} />}

      {/* Screens */}
      {screen === 'intro' && <IntroScreen />}
      {screen === 'login' && <LoginScreen audio={audio} onAdminLogin={() => setAdminOpen(true)} />}
      {screen === 'r1'    && <Round1Screen audio={audio} />}
      {screen === 'r2'    && <Round2Screen audio={audio} />}
      {screen === 'r3'    && <Round3Screen audio={audio} />}
      {screen === 'final' && <FinalScreen  audio={audio} />}

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}

      {/* Audio toggle */}
      <button className="audio-btn" title="Toggle sound" onClick={audio.toggle}>
        {audio.on ? '♪' : '✕'}
      </button>

      {/* Quit button — only during active gameplay */}
      {showQuitBtn && (
        <button
          onClick={() => { audio.playQuitWarning(); setQuitOpen(true); }}
          style={{
            position:'fixed', bottom:'1rem', left:'1rem', zIndex:150,
            fontFamily:'Cinzel,serif', fontSize:'0.62rem', letterSpacing:'0.12em',
            padding:'0.45rem 0.9rem', background:'rgba(10,5,5,0.9)',
            border:'1px solid var(--red-dim)', color:'var(--red-dim)',
            cursor:'pointer', transition:'all 0.2s', textTransform:'uppercase',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--red)';e.currentTarget.style.color='var(--red)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--red-dim)';e.currentTarget.style.color='var(--red-dim)';}}
        >
          ABORT MISSION
        </button>
      )}
    </>
  );
}

export default function App() {
  const audio = useAudio();
  return (
    <GameProvider>
      <GameRouter audio={audio} />
    </GameProvider>
  );
}
