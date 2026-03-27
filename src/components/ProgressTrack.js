const STEPS = [
  { label: 'Cipher Gate' },
  { label: 'Maze System' },
  { label: 'Reconstruction' },
  { label: 'Vault Unlock' },
];

export default function ProgressTrack({ current }) {
  return (
    <div className="prog-track">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const isDone   = n < current;
        const isActive = n === current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="prog-step">
              <div className={`prog-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                {isDone ? '✓' : n}
              </div>
              <div className="prog-label">{s.label}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`prog-line ${isDone ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}
