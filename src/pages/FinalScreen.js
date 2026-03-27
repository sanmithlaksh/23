import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { markWinner } from '../supabase';
import { showFlash } from '../components/Flash';
import ProgressTrack from '../components/ProgressTrack';
import CreditScene from './CreditScene';

function fmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

export default function FinalScreen({ audio }) {
  const { config, team, fragments, elapsed, stopTimer, getElapsedNow, resetGame } = useGame();
  const [input,       setInput]       = useState('');
  const [unlocked,    setUnlocked]    = useState(false);
  const [shake,       setShake]       = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  if (showCredits) {
    return (
      <CreditScene
        team={team}
        elapsed={elapsed}
        fragments={fragments}
        onRestart={() => { setShowCredits(false); resetGame(); }}
      />
    );
  }

  // The answer is either the admin-configured finalAnswer OR fallback fragments joined
  const correctAnswer = config.finalAnswer || fragments.join('-');

  async function tryUnlock() {
    audio.playClick();
    if (input.trim().toUpperCase() === correctAnswer.toUpperCase()) {
      audio.playVaultOpen();
      // Capture exact elapsed seconds BEFORE stopping the timer
      const finalElapsed = getElapsedNow();
      console.log('[FinalScreen] Saving elapsed:', finalElapsed, 'seconds to DB for team:', team?.id);
      stopTimer();
      setUnlocked(true);
      showFlash('ACCESS GRANTED — MYSTIC VAULT UNLOCKED!', 'success', 4000);
      if (team) await markWinner(team.id, finalElapsed);
      else console.warn('[FinalScreen] team is null — markWinner not called!');
      
      // Auto-launch the massive 3D outro animation
      setTimeout(() => setShowCredits(true), 2500);
    } else {
      audio.playError(); audio.playAlarm();
      setShake(true); setTimeout(()=>setShake(false),400);
      showFlash('Incorrect answer. Access denied.', 'error');
    }
  }

  return (
    <div className="screen screen-padded">
      <div className="panel">
        <h2>FINAL CHALLENGE — VAULT UNLOCK</h2>
        <p className="subtitle">Unlock the Mystic Vault using collected fragments</p>
        <ProgressTrack current={4} />

        <div className="voice-box">
          <div className="voice-speaker">⬡ Vault AI</div>
          The Mystic Vault stands before you. Three fragments in hand. But CIPHER encoded the vault with a transformation cipher as a final trap. Raw fragments will not work. Apply the cipher. Unlock the vault. Save the world.
        </div>

        {/* Fragments collected */}
        <div style={{marginBottom:'1.2rem'}}>
          <div style={{fontSize:'0.72rem',letterSpacing:'0.15em',color:'#666',textTransform:'uppercase',marginBottom:'0.5rem'}}>Your Fragments:</div>
          <div className="fragments" style={{justifyContent:'center',marginBottom:'0.8rem'}}>
            {fragments.map((f,i)=>(
              <div key={i} className="frag-chip collected">{f || `FRAGMENT ${i+1}`}</div>
            ))}
          </div>
        </div>

        {/* Transformation instruction */}
        <div style={{background:'rgba(0,0,0,0.5)',border:'1px solid var(--blue-dim,#1a3366)',borderLeft:'3px solid var(--blue)',padding:'1rem 1.25rem',marginBottom:'1.2rem'}}>
          <div style={{fontSize:'0.7rem',letterSpacing:'0.15em',color:'#4488ff',textTransform:'uppercase',marginBottom:'0.4rem'}}>⬡ System Instruction</div>
          <div style={{fontSize:'0.95rem',color:'#aac',lineHeight:1.7,fontStyle:'italic'}}>
            "{config.finalInstruction}"
          </div>
        </div>

        {/* Vault door */}
        <div className="vault-door">
          <div className={`vault-circle ${unlocked?'unlocked':''}`}>
            <div className="vault-dial"/>
            <div className="vault-icon">{unlocked?'🏛️':'🔒'}</div>
          </div>
        </div>

        {!unlocked && (
          <div style={{maxWidth:420,margin:'0 auto'}}>
            <div className="field-label">Transformed Answer</div>
            <div className={`input-row ${shake?'shake':''}`}>
              <input type="text" placeholder="e.g. PSJPO-71X-OMEGA"
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&tryUnlock()}
                style={{textTransform:'uppercase',letterSpacing:'0.18em'}}/>
              <button className="btn btn-primary" onClick={tryUnlock}>UNLOCK</button>
            </div>
          </div>
        )}

        {unlocked && (
          <div style={{textAlign:'center',marginTop:'1.5rem',animation:'fadeUp 0.7s ease'}}>
            <div className="frag-reveal" style={{borderColor:'var(--gold)'}}>
              <div className="frag-label">⬡ ACCESS GRANTED</div>
              <div className="frag-value">MYSTIC VAULT UNLOCKED</div>
            </div>
            <div style={{background:'rgba(0,40,20,0.5)',border:'1px solid var(--green-dim)',padding:'1rem',margin:'1rem 0',fontSize:'0.9rem',color:'var(--green)',lineHeight:1.8}}>
              <div>SYSTEM RESTORED</div>
              <div>VAULT FRAGMENT 1: {fragments[0]}</div>
              <div>VAULT FRAGMENT 2: {fragments[1]}</div>
              <div>VAULT FRAGMENT 3: {fragments[2]}</div>
            </div>
            <p style={{fontSize:'1rem',color:'#aaa',margin:'1rem 0'}}>
              Congratulations, Agent. The first team to breach the Mystic Vault wins.
            </p>
            <div style={{fontFamily:'Cinzel,serif',fontSize:'1.4rem',color:'var(--green)',textShadow:'var(--glow-green)',margin:'0.4rem 0'}}>
              Completion Time: {fmt(elapsed)}
            </div>
            <p style={{fontSize:'0.78rem',color:'#666',marginTop:'0.5rem'}}>
              In case of close finishes, system timestamps will determine the final ranking.
            </p>
            <div style={{display:'flex',gap:'1rem',justifyContent:'center',marginTop:'1.2rem',flexWrap:'wrap'}}>
              <button
                className="btn btn-primary"
                onClick={() => setShowCredits(true)}
                style={{fontFamily:"'Cinzel',serif",letterSpacing:'0.15em'}}
              >
                ⬡ WATCH THE ENDING
              </button>
              <button className="btn" onClick={resetGame}>RESET VAULT SYSTEM</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
