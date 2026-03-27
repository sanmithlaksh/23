import { useGame } from '../context/GameContext';

const ROUND_LABELS = {
  r1:    'ROUND 1 · CIPHER GATE',
  r2:    'ROUND 2 · MAZE SYSTEM',
  r3:    'ROUND 3 · SYSTEM RECONSTRUCTION',
  final: 'FINAL · VAULT UNLOCK',
};

function fmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

export default function StatusBar() {
  const { team, screen, fragments, elapsed } = useGame();
  if (!team) return null;
  return (
    <div className="status-bar">
      <div>
        <div className="status-team">{team.name || team.id}</div>
        <div className="status-round">{ROUND_LABELS[screen] || ''}</div>
      </div>
      <div className="status-right">
        <div className="fragments">
          {fragments.map((f,i)=>(
            <div key={i} className={`frag-chip ${f?'collected':''}`}>
              {f || `FRAGMENT ${i+1}`}
            </div>
          ))}
        </div>
        <div className="status-timer">{fmt(elapsed)}</div>
      </div>
    </div>
  );
}
