import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { loginTeam } from '../supabase';
import { showFlash } from '../components/Flash';

const ADMIN_ID   = 'ADMIN';
const ADMIN_PASS = 'Admin';

export default function LoginScreen({ audio, onAdminLogin }) {
  const { setTeam, setScreen, startTimer, setConfig } = useGame();
  const [teamId,   setTeamId]   = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    audio.playClick();
    if (!teamId || !password) {
      showFlash('Enter your Team ID and password', 'error');
      audio.playError();
      return;
    }

    // ── Admin shortcut ──────────────────────────────────────
    if (teamId.toUpperCase() === ADMIN_ID && password === ADMIN_PASS) {
      audio.playSuccess();
      showFlash('Admin access granted.', 'success');
      setTimeout(() => onAdminLogin(), 400);
      return;
    }

    // ── Normal team login ───────────────────────────────────
    setLoading(true);
    const result = await loginTeam(teamId.toUpperCase(), password);
    setLoading(false);

    if (!result.ok) {
      showFlash(result.msg, 'error');
      audio.playError();
      return;
    }

    // Apply this team's difficulty, unique fragments, and final answer from DB
    setConfig(prev => ({
      ...prev,
      difficulty:   result.team.difficulty,
      fragments:    result.team.fragments,
      finalAnswer:  result.team.finalAnswer,
    }));

    setTeam(result.team);
    startTimer();
    audio.startBg();

    // Wipe any existing minigame session states when a new team logs in
    sessionStorage.removeItem('v3_level');
    for (let i = 1; i <= 5; i++) {
      sessionStorage.removeItem(`v3_password_L${i}`);
    }

    showFlash(`Access granted. Welcome, ${result.team.id}`, 'success');
    setTimeout(() => {
      const cr = result.team.currentRound || 1;
      let nextScreen = 'r1';
      if (cr === 2) nextScreen = 'r2';
      else if (cr === 3) nextScreen = 'r3';
      else if (cr >= 4) nextScreen = 'final';
      setScreen(nextScreen);
    }, 800);
  }

  return (
    <div className="screen">
      <div className="panel panel-sm">
        <h2>VAULT ACCESS</h2>
        <p className="subtitle">Enter your team credentials</p>

        <div className="field-group">
          <div className="field-label">Team ID</div>
          <input
            type="text"
            placeholder="e.g. TEAM-01"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}
          />
        </div>

        <div className="field-group">
          <div className="field-label">Password</div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleLogin} disabled={loading}>
          {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
        </button>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button className="btn btn-sm" onClick={() => setScreen('intro')}>← Back</button>
        </div>
      </div>
    </div>
  );
}
