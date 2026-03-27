import { useGame } from '../context/GameContext';
import { clearSession } from '../hooks/useSession';

export default function QuitWarning({ onClose, audio }) {
  const { resetGame } = useGame();

  function confirmQuit() {
    audio?.playClick();
    clearSession();
    resetGame();
    onClose();
  }

  function cancel() {
    audio?.playClick();
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, rgba(30,10,10,0.98), rgba(15,5,5,0.99))',
        border: '1px solid var(--red-dim)',
        maxWidth: 440, width: '100%',
        padding: '2.5rem',
        position: 'relative',
        boxShadow: '0 0 40px rgba(255,50,50,0.15)',
      }}>
        {/* Top red line */}
        <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,var(--red-dim),transparent)' }}/>

        <div style={{ fontFamily:'Cinzel,serif', fontSize:'0.7rem', letterSpacing:'0.2em', color:'var(--red-dim)', textTransform:'uppercase', marginBottom:'0.75rem' }}>
          ⬡ Warning — Mission Abort
        </div>

        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'1.4rem', color:'var(--red)', textShadow:'0 0 12px rgba(255,68,68,0.5)', marginBottom:'1rem', letterSpacing:'0.1em' }}>
          ABORT OPERATION?
        </h2>

        <p style={{ fontSize:'0.92rem', color:'#bbb', lineHeight:1.8, marginBottom:'0.75rem' }}>
          Quitting now will end your current mission. Your progress will be lost and your team will be removed from the leaderboard.
        </p>
        <p style={{ fontSize:'0.82rem', color:'#666', lineHeight:1.7, marginBottom:'2rem' }}>
          Are you sure you want to abandon Operation Vault Zero?
        </p>

        <div style={{ display:'flex', gap:'0.75rem' }}>
          <button
            onClick={cancel}
            style={{
              flex:1, padding:'0.85rem', fontFamily:'Cinzel,serif', fontSize:'0.78rem',
              letterSpacing:'0.15em', textTransform:'uppercase', cursor:'pointer',
              background:'linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05))',
              border:'1px solid var(--gold-dim)', color:'var(--gold-bright)',
              transition:'all 0.2s',
            }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 0 16px rgba(201,168,76,0.3)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
          >
            CONTINUE MISSION
          </button>
          <button
            onClick={confirmQuit}
            style={{
              flex:1, padding:'0.85rem', fontFamily:'Cinzel,serif', fontSize:'0.78rem',
              letterSpacing:'0.15em', textTransform:'uppercase', cursor:'pointer',
              background:'linear-gradient(135deg,rgba(180,20,20,0.25),rgba(120,10,10,0.1))',
              border:'1px solid var(--red-dim)', color:'var(--red)',
              transition:'all 0.2s',
            }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 0 16px rgba(255,68,68,0.3)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
          >
            ABORT MISSION
          </button>
        </div>
      </div>
    </div>
  );
}
