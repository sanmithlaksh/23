import { useState, useEffect, useCallback } from 'react';

let _trigger = null;
export function showFlash(msg, type = 'info', dur = 2600) {
  if (_trigger) _trigger(msg, type, dur);
}

export default function Flash() {
  const [state, setState] = useState({ msg: '', type: 'info', show: false });
  const timerRef = { current: null };

  const trigger = useCallback((msg, type, dur) => {
    setState({ msg, type, show: true });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState(s => ({ ...s, show: false })), dur);
  }, []);

  useEffect(() => { _trigger = trigger; return () => { _trigger = null; }; }, [trigger]);

  return (
    <div className={`flash ${state.type} ${state.show ? 'show' : ''}`}>
      {state.msg}
    </div>
  );
}
