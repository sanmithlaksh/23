import { useGame } from '../context/GameContext';
import { clearSession } from '../hooks/useSession';

export default function ResumePrompt({ session, onResume, onFresh, audio }) {
  function fmt(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:400,
      background:'rgba(0,0,0,0.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',
    }}>
      <div style={{
        background:'linear-gradient(160deg,rgba(10,15,25,0.98),rgba(5,8,15,0.99))',
        border:'1px solid var(--gold-dim)',
        maxWidth:460,width:'100%',padding:'2.5rem',
        position:'relative',
        boxShadow:'0 0 40px rgba(201,168,76,0.12)',
        animation:'fadeUp 0.4s ease',
      }}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,var(--gold),transparent)',opacity:0.5}}/>

        <div style={{fontFamily:'Cinzel,serif',fontSize:'0.7rem',letterSpacing:'0.2em',color:'var(--gold-dim)',textTransform:'uppercase',marginBottom:'0.75rem'}}>
          ⬡ Session Detected
        </div>

        <h2 style={{fontFamily:'Cinzel,serif',fontSize:'1.3rem',color:'var(--gold)',marginBottom:'1rem',letterSpacing:'0.1em'}}>
          RESUME MISSION?
        </h2>

        <div style={{background:'rgba(0,0,0,0.4)',border:'1px solid #1a1a2e',padding:'1rem',marginBottom:'1.5rem',fontSize:'0.85rem',color:'#aaa',lineHeight:2}}>
          <div>Team: <span style={{color:'var(--gold)',fontFamily:'Cinzel,serif'}}>{session.team?.id}</span></div>
          <div>Last checkpoint: <span style={{color:'var(--gold-bright)'}}>
            {session.screen==='r1'?'Round 1 — Cipher Gate':
             session.screen==='r2'?'Round 2 — Maze System':
             session.screen==='r3'?'Round 3 — System Reconstruction':
             session.screen==='final'?'Final Vault':'Intro'}
          </span></div>
          <div>Fragments collected: <span style={{color:'var(--green)'}}>{session.fragments?.filter(Boolean).length || 0} / 3</span></div>
          <div>Time elapsed: <span style={{color:'var(--green)',fontFamily:'Cinzel,serif'}}>{fmt(session.elapsed||0)}</span></div>
        </div>

        <div style={{display:'flex',gap:'0.75rem'}}>
          <button onClick={onResume}
            style={{flex:1,padding:'0.85rem',fontFamily:'Cinzel,serif',fontSize:'0.78rem',letterSpacing:'0.15em',textTransform:'uppercase',cursor:'pointer',
              background:'linear-gradient(135deg,rgba(201,168,76,0.22),rgba(201,168,76,0.08))',
              border:'1px solid var(--gold)',color:'var(--gold-bright)',transition:'all 0.2s'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 0 20px rgba(201,168,76,0.35)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
            RESUME MISSION
          </button>
          <button onClick={onFresh}
            style={{flex:1,padding:'0.85rem',fontFamily:'Cinzel,serif',fontSize:'0.78rem',letterSpacing:'0.15em',textTransform:'uppercase',cursor:'pointer',
              background:'rgba(0,0,0,0.3)',border:'1px solid #333',color:'#555',transition:'all 0.2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--red-dim)';e.currentTarget.style.color='var(--red)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#333';e.currentTarget.style.color='#555';}}>
            START FRESH
          </button>
        </div>
      </div>
    </div>
  );
}
