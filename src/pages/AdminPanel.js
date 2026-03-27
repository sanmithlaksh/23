import { useState, useEffect } from 'react';
import { useGame, DIFFICULTY_SETTINGS } from '../context/GameContext';
import { showFlash } from '../components/Flash';
import { updateTeamDifficulty, updateAllTeamsDifficulty, fetchAllTeams, updateTeamFragments, updateTeamFinalAnswer, fetchCTFConfig, updateCTFConfig } from '../supabase';

export default function AdminPanel({ onClose }) {
  const { config, setConfig } = useGame();
  const [tab,   setTab]   = useState('difficulty');
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(config)));
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingFragments,   setEditingFragments]   = useState({});
  const [editingFinalAnswer, setEditingFinalAnswer] = useState({});
  const [ctfFlags,    setCTFFlags]    = useState({ html_flag: '', image_flag: '' });
  const [ctfLoading,  setCTFLoading]  = useState(false);
  const [ctfSaving,   setCTFSaving]   = useState({});

  useEffect(() => { if (tab === 'teams') loadTeams(); }, [tab]);
  useEffect(() => { if (tab === 'ctf') loadCTFFlags(); }, [tab]);

  async function loadCTFFlags() {
    setCTFLoading(true);
    const cfg = await fetchCTFConfig();
    setCTFFlags({ html_flag: cfg.html_flag || '', image_flag: cfg.image_flag || '' });
    setCTFLoading(false);
  }

  async function saveCTFFlag(key, value) {
    if (!value.trim()) { showFlash('Flag cannot be empty', 'error'); return; }
    setCTFSaving(prev => ({ ...prev, [key]: true }));
    const result = await updateCTFConfig(key, value.trim().toUpperCase());
    setCTFSaving(prev => ({ ...prev, [key]: false }));
    if (result.ok) showFlash(`${key === 'html_flag' ? 'HTML' : 'Image'} flag updated in database`, 'success');
    else showFlash('Failed: ' + result.msg, 'error');
  }

  async function loadTeams() {
    setTeamsLoading(true);
    const { data } = await fetchAllTeams();
    setTeams(data);
    setTeamsLoading(false);
  }

  async function handleTeamDifficulty(teamId, diffStr) {
    setTeams(prev => prev.map(t => t.team_id === teamId
      ? { ...t, difficulty: { easy:1, medium:2, hard:3 }[diffStr] } : t));
    const result = await updateTeamDifficulty(teamId, diffStr);
    if (result.ok) showFlash(`${teamId} set to ${diffStr}`, 'success');
    else showFlash('Failed: ' + result.msg, 'error');
  }

  async function saveTeamFinalAnswer(teamId) {
    const val = editingFinalAnswer[teamId] || '';
    if (!val.trim()) { showFlash('Final answer cannot be empty', 'error'); return; }
    const result = await updateTeamFinalAnswer(teamId, val.trim());
    if (result.ok) {
      showFlash(`Final answer saved for ${teamId}`, 'success');
      setEditingFinalAnswer(prev => { const n = {...prev}; delete n[teamId]; return n; });
      setTeams(prev => prev.map(t => t.team_id === teamId ? { ...t, final_answer: val.trim().toUpperCase() } : t));
    } else showFlash('Failed: ' + result.msg, 'error');
  }

  async function handleApplyToAll() {
    setSaving(true);
    const result = await updateAllTeamsDifficulty(local.difficulty);
    setSaving(false);
    if (result.ok) { showFlash(`All teams set to ${local.difficulty}`, 'success'); if (tab==='teams') loadTeams(); }
    else showFlash('Failed: ' + result.msg, 'error');
  }

  function startEditFragments(t) {
    setEditingFragments(prev => ({
      ...prev,
      [t.team_id]: [t.vault_fragment1||'', t.vault_fragment2||'', t.vault_fragment3||'']
    }));
  }
  function updateFragmentInput(teamId, idx, val) {
    setEditingFragments(prev => {
      const arr = [...(prev[teamId]||['','',''])];
      arr[idx] = val.toUpperCase();
      return { ...prev, [teamId]: arr };
    });
  }
  async function saveTeamFragments(teamId) {
    const frags = editingFragments[teamId]||['','',''];
    if (frags.some(f=>!f.trim())) { showFlash('All 3 fragments must be filled.','error'); return; }
    const result = await updateTeamFragments(teamId, frags[0], frags[1], frags[2]);
    if (result.ok) {
      showFlash(`Fragments saved for ${teamId}`, 'success');
      setEditingFragments(prev => { const n={...prev}; delete n[teamId]; return n; });
      setTeams(prev => prev.map(t => t.team_id===teamId
        ? { ...t, vault_fragment1:frags[0], vault_fragment2:frags[1], vault_fragment3:frags[2] } : t));
    } else showFlash('Failed: '+result.msg, 'error');
  }

  function save() {
    setConfig(local);
    showFlash('Config saved!', 'success');
    onClose();
  }

  // Generic updaters
  function update(path, value) {
    setLocal(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i=0; i<keys.length-1; i++) obj = obj[keys[i]];
      obj[keys[keys.length-1]] = value;
      return next;
    });
  }

  // Round 1 puzzles
  function updatePuzzle(i, field, val) {
    const p = JSON.parse(JSON.stringify(local.r1Puzzles));
    p[i][field] = val;
    setLocal(prev => ({...prev, r1Puzzles: p}));
  }
  function addPuzzle() {
    setLocal(prev => ({...prev, r1Puzzles: [...prev.r1Puzzles, {id:Date.now(),label:'New Puzzle',encrypted:'',hint:'',answer:''}]}));
  }
  function removePuzzle(i) {
    setLocal(prev => ({...prev, r1Puzzles: prev.r1Puzzles.filter((_,idx)=>idx!==i)}));
  }

  // Round 3 commands
  function updateScrambled(i,val){ const a=[...local.r3Scrambled]; a[i]=val.toUpperCase(); setLocal(p=>({...p,r3Scrambled:a})); }
  function updateCorrect(i,val)  { const a=[...local.r3Correct];   a[i]=val.toUpperCase(); setLocal(p=>({...p,r3Correct:a})); }
  function updateSequence(i,val) { const a=[...local.r3Sequence];  a[i]=val.toUpperCase(); setLocal(p=>({...p,r3Sequence:a})); }
  function addCommand()    { setLocal(p=>({...p,r3Scrambled:[...p.r3Scrambled,''],r3Correct:[...p.r3Correct,'']})); }
  function removeCommand(i){ setLocal(p=>({...p,r3Scrambled:p.r3Scrambled.filter((_,x)=>x!==i),r3Correct:p.r3Correct.filter((_,x)=>x!==i)})); }
  function addSeqStep()    { setLocal(p=>({...p,r3Sequence:[...p.r3Sequence,'']})); }
  function removeSeqStep(i){ setLocal(p=>({...p,r3Sequence:p.r3Sequence.filter((_,x)=>x!==i)})); }
  function updateDecoy(i,val){ const a=[...local.r3Decoys]; a[i]=val.toUpperCase(); setLocal(p=>({...p,r3Decoys:a})); }
  function addDecoy()    { setLocal(p=>({...p,r3Decoys:[...p.r3Decoys,'']})); }
  function removeDecoy(i){ setLocal(p=>({...p,r3Decoys:p.r3Decoys.filter((_,x)=>x!==i)})); }

  const DIFF_NUM = { 1:'easy', 2:'medium', 3:'hard' };

  const TABS = [
    { id:'difficulty', label:'Difficulty' },
    { id:'teams',      label:'Teams'      },
    { id:'fragments',  label:'Fragments'  },
    { id:'r1',         label:'Round 1'    },
    { id:'ctf',        label:'CTF Flags'  },
    { id:'r2',         label:'Round 2'    },
    { id:'r3',         label:'Round 3'    },
    { id:'final',      label:'Final Vault'},
  ];

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div className="panel panel-lg" style={{maxHeight:'90vh',overflowY:'auto',maxWidth:740}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <h2 style={{margin:0,fontSize:'1.3rem'}}>ADMIN PANEL</h2>
          <button className="btn btn-sm btn-danger" onClick={onClose}>CLOSE</button>
        </div>

        <div className="admin-tabs">
          {TABS.map(t=>(
            <button key={t.id} className={`admin-tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DIFFICULTY ── */}
        {tab==='difficulty' && (
          <div className="admin-section">
            <h3>Global Difficulty Default</h3>
            <p style={{fontSize:'0.82rem',color:'#777',marginBottom:'1rem'}}>Sets the default difficulty. Use the Teams tab to override per team.</p>
            <div className="diff-btns">
              {Object.entries(DIFFICULTY_SETTINGS).map(([key,val])=>(
                <div key={key} className={`diff-btn ${local.difficulty===key?`active ${key}`:''}`}
                  onClick={()=>setLocal(p=>({...p,difficulty:key}))}>
                  {val.label}
                </div>
              ))}
            </div>
            <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid #1e1e2e',padding:'1rem',fontSize:'0.85rem',color:'#888',lineHeight:2,marginBottom:'1rem'}}>
              {Object.entries(DIFFICULTY_SETTINGS).map(([key,val])=>(
                <div key={key} style={{color:local.difficulty===key?'var(--gold)':'#555'}}>
                  <strong style={{color:'inherit'}}>{val.label}:</strong>&nbsp;
                  {val.r1Count} cipher puzzles (incl. 2 CTF) · maze {val.mazeSize[0]}x{val.mazeSize[1]} · {val.visibility} cell visibility · {val.r3SeqLen} cmd steps
                </div>
              ))}
            </div>
            <button className="btn btn-green btn-sm" onClick={handleApplyToAll} disabled={saving}>
              {saving?'APPLYING...':`APPLY "${local.difficulty.toUpperCase()}" TO ALL TEAMS IN DB`}
            </button>
          </div>
        )}

        {/* ── TEAMS ── */}
        {tab==='teams' && (
          <div className="admin-section">
            <h3>Per-Team Settings</h3>
            <p style={{fontSize:'0.82rem',color:'#777',marginBottom:'1rem'}}>
              Set difficulty and vault fragments per team. Changes save to Supabase instantly.
              <br/>Difficulty values: 1 = Easy, 2 = Medium, 3 = Hard
            </p>
            {teamsLoading ? (
              <div style={{textAlign:'center',padding:'2rem',color:'#666'}}>Loading teams...</div>
            ) : teams.length===0 ? (
              <div style={{textAlign:'center',padding:'2rem',color:'#666'}}>No teams found in database.</div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
                  <thead>
                    <tr>
                      {['Team ID','Team Name','Difficulty','Vault Fragments','Round','Status'].map(h=>(
                        <th key={h} style={{fontFamily:'Cinzel,serif',fontSize:'0.68rem',letterSpacing:'0.1em',color:'var(--gold-dim)',textAlign:'left',padding:'0.45rem 0.7rem',borderBottom:'1px solid #222',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map(t=>{
                      const currentDiff=DIFF_NUM[t.difficulty]||'medium';
                      const isEditingF=!!editingFragments[t.team_id];
                      const fragInputs=editingFragments[t.team_id]||[t.vault_fragment1||'',t.vault_fragment2||'',t.vault_fragment3||''];
                      return (
                        <tr key={t.team_id}>
                          <td style={{padding:'0.55rem 0.7rem',borderBottom:'1px solid #111',fontFamily:'Cinzel,serif',fontSize:'0.75rem',color:'var(--gold)',whiteSpace:'nowrap'}}>{t.team_id}</td>
                          <td style={{padding:'0.55rem 0.7rem',borderBottom:'1px solid #111',color:'#aaa'}}>{t.team_name||'-'}</td>
                          <td style={{padding:'0.55rem 0.7rem',borderBottom:'1px solid #111'}}>
                            <div style={{display:'flex',gap:'0.25rem'}}>
                              {['easy','medium','hard'].map(d=>(
                                <button key={d} onClick={()=>handleTeamDifficulty(t.team_id,d)}
                                  style={{padding:'0.18rem 0.45rem',fontSize:'0.62rem',letterSpacing:'0.06em',fontFamily:'Cinzel,serif',textTransform:'uppercase',cursor:'pointer',border:'1px solid',borderRadius:'1px',transition:'all 0.2s',
                                    background:currentDiff===d?(d==='easy'?'rgba(0,80,40,0.3)':d==='hard'?'rgba(120,20,20,0.3)':'rgba(201,168,76,0.15)'):'rgba(0,0,0,0.3)',
                                    borderColor:currentDiff===d?(d==='easy'?'var(--green-dim)':d==='hard'?'var(--red-dim)':'var(--gold-dim)'):'#333',
                                    color:currentDiff===d?(d==='easy'?'var(--green)':d==='hard'?'var(--red)':'var(--gold)'):'#555'}}>
                                  {d==='easy'?'1':d==='medium'?'2':'3'}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td style={{padding:'0.55rem 0.7rem',borderBottom:'1px solid #111',minWidth:260}}>
                            {!isEditingF?(
                              <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                                <span style={{fontFamily:'Cinzel,serif',fontSize:'0.7rem',color:'var(--gold-dim)',letterSpacing:'0.08em'}}>
                                  {[t.vault_fragment1,t.vault_fragment2,t.vault_fragment3].map(f=>f||'—').join(' · ')}
                                </span>
                                <button onClick={()=>startEditFragments(t)}
                                  style={{padding:'0.12rem 0.4rem',fontSize:'0.58rem',fontFamily:'Cinzel,serif',letterSpacing:'0.08em',cursor:'pointer',border:'1px solid #333',background:'rgba(0,0,0,0.3)',color:'#666',borderRadius:'1px'}}>
                                  EDIT
                                </button>
                              </div>
                            ):(
                              <div style={{display:'flex',gap:'0.25rem',alignItems:'center',flexWrap:'wrap'}}>
                                {[0,1,2].map(i=>(
                                  <input key={i} type="text" value={fragInputs[i]}
                                    onChange={e=>updateFragmentInput(t.team_id,i,e.target.value)}
                                    placeholder={`F${i+1}`}
                                    style={{width:65,padding:'0.18rem 0.35rem',fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:'0.08em',background:'rgba(0,0,0,0.5)',border:'1px solid var(--gold-dim)',color:'var(--gold)',borderRadius:'1px',fontFamily:'Cinzel,serif'}}/>
                                ))}
                                <button onClick={()=>saveTeamFragments(t.team_id)}
                                  style={{padding:'0.18rem 0.45rem',fontSize:'0.58rem',fontFamily:'Cinzel,serif',cursor:'pointer',border:'1px solid var(--green-dim)',background:'rgba(0,40,20,0.4)',color:'var(--green)',borderRadius:'1px'}}>
                                  SAVE
                                </button>
                                <button onClick={()=>setEditingFragments(prev=>{const n={...prev};delete n[t.team_id];return n;})}
                                  style={{padding:'0.18rem 0.35rem',fontSize:'0.58rem',cursor:'pointer',border:'1px solid #333',background:'rgba(0,0,0,0.3)',color:'#555',borderRadius:'1px'}}>
                                  X
                                </button>
                              </div>
                            )}
                          </td>
                          {/* Final Answer */}
                          <td style={{padding:'0.55rem 0.7rem',borderBottom:'1px solid #111',minWidth:200}}>
                            {!editingFinalAnswer[t.team_id] ? (
                              <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                                <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:'0.72rem',color:t.final_answer?'var(--gold-dim)':'#333',letterSpacing:'0.08em'}}>
                                  {t.final_answer || '—'}
                                </span>
                                <button onClick={()=>setEditingFinalAnswer(prev=>({...prev,[t.team_id]:t.final_answer||''}))}
                                  style={{padding:'0.12rem 0.4rem',fontSize:'0.58rem',fontFamily:'Cinzel,serif',letterSpacing:'0.08em',cursor:'pointer',border:'1px solid #333',background:'rgba(0,0,0,0.3)',color:'#666',borderRadius:'1px'}}>
                                  EDIT
                                </button>
                              </div>
                            ) : (
                              <div style={{display:'flex',gap:'0.25rem',alignItems:'center'}}>
                                <input type="text"
                                  value={editingFinalAnswer[t.team_id]}
                                  onChange={e=>setEditingFinalAnswer(prev=>({...prev,[t.team_id]:e.target.value.toUpperCase()}))}
                                  placeholder="e.g. PSJPO-71X-OMEGA"
                                  style={{width:130,padding:'0.18rem 0.35rem',fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.06em',background:'rgba(0,0,0,0.5)',border:'1px solid var(--gold-dim)',color:'var(--gold)',borderRadius:'1px',fontFamily:'Share Tech Mono,monospace'}}/>
                                <button onClick={()=>saveTeamFinalAnswer(t.team_id)}
                                  style={{padding:'0.18rem 0.45rem',fontSize:'0.58rem',fontFamily:'Cinzel,serif',cursor:'pointer',border:'1px solid var(--green-dim)',background:'rgba(0,40,20,0.4)',color:'var(--green)',borderRadius:'1px'}}>
                                  SAVE
                                </button>
                                <button onClick={()=>setEditingFinalAnswer(prev=>{const n={...prev};delete n[t.team_id];return n;})}
                                  style={{padding:'0.18rem 0.35rem',fontSize:'0.58rem',cursor:'pointer',border:'1px solid #333',background:'rgba(0,0,0,0.3)',color:'#555',borderRadius:'1px'}}>
                                  X
                                </button>
                              </div>
                            )}
                          </td>

                          <td style={{padding:'0.55rem 0.7rem',borderBottom:'1px solid #111',color:'#888',fontSize:'0.78rem',whiteSpace:'nowrap'}}>
                            {(t.current_round===99||t.current_round==='COMPLETE')?<span style={{color:'var(--green)'}}>Complete</span>:`Round ${t.current_round||1}`}
                          </td>
                          <td style={{padding:'0.55rem 0.7rem',borderBottom:'1px solid #111',fontSize:'0.75rem',whiteSpace:'nowrap'}}>
                            {t.disqualified?<span style={{color:'var(--red)'}}>Disqualified</span>:t.finish_time?<span style={{color:'var(--green)'}}>Finished</span>:<span style={{color:'#666'}}>Playing</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{marginTop:'1rem'}}>
              <button className="btn btn-sm" onClick={loadTeams}>REFRESH</button>
            </div>
          </div>
        )}

        {/* ── FRAGMENTS ── */}
        {tab==='fragments' && (
          <div className="admin-section">
            <h3>Default Vault Fragments</h3>
            <p style={{fontSize:'0.82rem',color:'#777',marginBottom:'1rem'}}>Used as fallback if a team has no fragments set in the database.</p>
            {local.fragments.map((f,i)=>(
              <div key={i} className="field-group">
                <div className="field-label">Fragment {i+1}</div>
                <input type="text" value={f} onChange={e=>update(`fragments.${i}`,e.target.value.toUpperCase())} style={{textTransform:'uppercase',letterSpacing:'0.15em'}}/>
              </div>
            ))}
            <div style={{marginTop:'0.5rem',padding:'0.75rem 1rem',background:'rgba(0,0,0,0.3)',border:'1px solid #1e1e2e',fontSize:'0.82rem',color:'#888'}}>
              Default password (before transformation): <span style={{color:'var(--gold)',fontFamily:'Cinzel,serif',letterSpacing:'0.15em'}}>{local.fragments.join('-')}</span>
            </div>
          </div>
        )}

        {/* ── ROUND 1 ── */}
        {tab==='r1' && (
          <div className="admin-section">
            <h3>Round 1 — Cipher Gate Puzzles</h3>
            <p style={{fontSize:'0.82rem',color:'#777',marginBottom:'0.5rem'}}>
              Each puzzle has 4 editable fields: <strong style={{color:'var(--gold-dim)'}}>Label</strong>, <strong style={{color:'var(--gold-dim)'}}>Question</strong> (shown to team), <strong style={{color:'var(--gold-dim)'}}>Hint</strong>, and <strong style={{color:'var(--gold-dim)'}}>Answer</strong>. Difficulty controls how many puzzles are shown: Easy=4, Medium=6, Hard=8.
            </p>
            <div style={{background:'rgba(20,30,60,0.4)',border:'1px solid #1a3366',borderLeft:'3px solid var(--blue)',padding:'0.85rem 1.1rem',marginBottom:'1rem',fontSize:'0.82rem',color:'#99aacc',lineHeight:1.8}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:'0.7rem',letterSpacing:'0.12em',color:'var(--blue)',marginBottom:'0.4rem',textTransform:'uppercase'}}>CTF Puzzle Format</div>
              <div>To create a hidden source-code puzzle, set the Question field to:</div>
              <div style={{fontFamily:'Share Tech Mono,monospace',background:'rgba(0,0,0,0.4)',border:'1px solid #1a3366',padding:'0.35rem 0.75rem',margin:'0.4rem 0',color:'var(--gold-dim)',letterSpacing:'0.08em'}}>{'<!-- FLAG: YOURWORD -->'}</div>
              <div>The game will automatically:</div>
              <div style={{paddingLeft:'0.75rem',lineHeight:2,fontSize:'0.8rem',color:'#778'}}>
                <div>1. Hide the flag from the screen entirely</div>
                <div>2. Inject a real HTML comment into the page source that teams can find via F12</div>
                <div>3. Show teams instructions on how to inspect the page</div>
                <div>4. Check their answer against the flag word</div>
              </div>
              <div style={{fontSize:'0.78rem',color:'#557',marginTop:'0.4rem'}}>
                Example: <span style={{fontFamily:'Share Tech Mono,monospace',color:'var(--gold-dim)'}}>{'<!-- FLAG: SHADOW -->'}</span> — teams must find "SHADOW" by inspecting the page source.
              </div>
            </div>
            {local.r1Puzzles.map((p,i)=>(
              <div key={p.id} className="puzzle-editor">
                <div className="puzzle-editor-header">
                  <h4 style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                    Puzzle {i+1}
                    {i>=6&&<span style={{color:'var(--red)',fontSize:'0.6rem',border:'1px solid var(--red-dim)',padding:'0.08rem 0.35rem',letterSpacing:'0.08em'}}>HARD ONLY</span>}
                    {i>=4&&i<6&&<span style={{color:'var(--gold)',fontSize:'0.6rem',border:'1px solid var(--gold-dim)',padding:'0.08rem 0.35rem',letterSpacing:'0.08em'}}>MED + HARD</span>}
                  </h4>
                  <button className="btn btn-sm btn-danger" onClick={()=>removePuzzle(i)}>Remove</button>
                </div>

                <div className="field-group">
                  <div className="field-label">Label (puzzle heading shown to team)</div>
                  <input type="text" value={p.label} onChange={e=>updatePuzzle(i,'label',e.target.value)} placeholder="e.g. Cipher 1, Logic Riddle, Pattern"/>
                </div>

                <div className="field-group">
                  <div className="field-label">Question / Encrypted Text — displayed in the large mono box</div>
                  <textarea value={p.encrypted} onChange={e=>updatePuzzle(i,'encrypted',e.target.value)} placeholder="e.g. YDXOW  or  1-4-9-16-?  or full riddle text" style={{minHeight:70}}/>
                </div>

                <div className="field-group">
                  <div className="field-label">Hint — shown below the question in small uppercase text</div>
                  <input type="text" value={p.hint} onChange={e=>updatePuzzle(i,'hint',e.target.value)} placeholder="e.g. Caesar Cipher (shift 3)"/>
                </div>

                <div className="field-group">
                  <div className="field-label">Answer — team must type this exactly (case-insensitive)</div>
                  <input type="text" value={p.answer} onChange={e=>updatePuzzle(i,'answer',e.target.value.toUpperCase())} style={{textTransform:'uppercase',letterSpacing:'0.15em'}} placeholder="e.g. VAULT"/>
                </div>

                <div style={{background:'rgba(0,0,0,0.45)',border:'1px dashed #2a2a3a',padding:'0.75rem 1rem',marginTop:'0.5rem'}}>
                  <div style={{fontSize:'0.6rem',letterSpacing:'0.15em',color:'#444',textTransform:'uppercase',marginBottom:'0.5rem'}}>Live Preview — what team sees:</div>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'1rem',letterSpacing:'0.2em',color:'#aaa',borderLeft:'3px solid var(--gold-dim)',padding:'0.4rem 0.75rem',background:'rgba(0,0,0,0.3)',marginBottom:'0.35rem',wordBreak:'break-all',minHeight:'2rem'}}>
                    {p.encrypted || <span style={{color:'#333',fontStyle:'normal',letterSpacing:'0',fontSize:'0.8rem'}}>question text not set</span>}
                  </div>
                  <div style={{fontSize:'0.7rem',color:'#556',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>
                    Hint: {p.hint || <span style={{color:'#333'}}>—</span>}
                  </div>
                  <div style={{fontSize:'0.7rem',color:'var(--green-dim)',letterSpacing:'0.08em'}}>
                    Correct answer: <span style={{color:p.answer?'var(--green)':'#333',fontFamily:"'Share Tech Mono',monospace",letterSpacing:'0.15em'}}>{p.answer||'not set'}</span>
                  </div>
                </div>
              </div>
            ))}
            {local.r1Puzzles.length < 8 && (
              <button className="btn btn-sm btn-green add-item-btn" onClick={addPuzzle}>+ Add Puzzle</button>
            )}
          </div>
        )}

        {/* ── CTF FLAGS ── */}
        {tab==='ctf' && (
          <div className="admin-section">
            <h3>CTF Puzzle Flags</h3>
            <p style={{fontSize:'0.82rem',color:'#777',marginBottom:'1.2rem'}}>
              Both flags are stored in the Supabase <code style={{color:'var(--gold-dim)'}}>ctf_config</code> table and loaded live when teams play.
              Changing a flag here updates the database immediately — no rebuild needed.
            </p>

            {ctfLoading ? (
              <div style={{textAlign:'center',padding:'2rem',color:'#666',fontFamily:'Cinzel,serif',fontSize:'0.78rem',letterSpacing:'0.1em'}}>LOADING FROM DATABASE...</div>
            ) : (
              <>
                {/* HTML Flag */}
                <div style={{background:'rgba(20,30,60,0.4)',border:'1px solid #1a3366',padding:'1.2rem',marginBottom:'1.2rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.75rem'}}>
                    <span style={{fontFamily:'Cinzel,serif',fontSize:'0.78rem',color:'var(--blue)',letterSpacing:'0.1em'}}>CTF 1 — HTML SOURCE CODE FLAG</span>
                  </div>
                  <p style={{fontSize:'0.8rem',color:'#778',marginBottom:'0.75rem',lineHeight:1.7}}>
                    Teams must press F12 and find this word hidden as a comment in the page source.
                    The comment injected into the page will look like:<br/>
                    <code style={{fontFamily:'Share Tech Mono,monospace',color:'var(--gold-dim)',fontSize:'0.78rem'}}>
                      {'<!-- VAULT SYSTEM DIAGNOSTIC — FRAGMENT TRACE DETECTED: '}
                      <span style={{color:'var(--gold)'}}>{ctfFlags.html_flag||'YOUR_FLAG'}</span>
                      {' -->'}
                    </code>
                  </p>
                  <div className="field-group" style={{marginBottom:'0.5rem'}}>
                    <div className="field-label">Flag Word (stored in Supabase)</div>
                    <input type="text" value={ctfFlags.html_flag}
                      onChange={e=>setCTFFlags(prev=>({...prev,html_flag:e.target.value.toUpperCase()}))}
                      style={{textTransform:'uppercase',letterSpacing:'0.18em',fontFamily:'Share Tech Mono,monospace'}}
                      placeholder="e.g. SHADOW"/>
                  </div>
                  <button className="btn btn-sm" style={{borderColor:'var(--blue)',color:'var(--blue)'}}
                    disabled={ctfSaving.html_flag}
                    onClick={()=>saveCTFFlag('html_flag',ctfFlags.html_flag)}>
                    {ctfSaving.html_flag ? 'SAVING...' : 'SAVE TO DATABASE'}
                  </button>
                </div>

                {/* Image Flag */}
                <div style={{background:'rgba(40,20,60,0.4)',border:'1px solid #2a1a4a',padding:'1.2rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.75rem'}}>
                    <span style={{fontFamily:'Cinzel,serif',fontSize:'0.78rem',color:'var(--purple)',letterSpacing:'0.1em'}}>CTF 2 — IMAGE METADATA FLAG</span>
                  </div>
                  <p style={{fontSize:'0.8rem',color:'#778',marginBottom:'0.75rem',lineHeight:1.7}}>
                    This flag is embedded into a randomly selected image as a JPEG COM (comment) marker.
                    Teams must download the image and use a metadata tool to find it.
                    The encoded metadata field will read:<br/>
                    <code style={{fontFamily:'Share Tech Mono,monospace',color:'var(--gold-dim)',fontSize:'0.78rem'}}>
                      VAULT_IMAGE_FLAG: <span style={{color:'var(--gold)'}}>{ctfFlags.image_flag||'YOUR_FLAG'}</span>
                    </code>
                  </p>
                  <div style={{display:'flex',gap:'0.75rem',marginBottom:'0.75rem',flexWrap:'wrap'}}>
                    {['/ctf-image-1.jpg','/ctf-image-2.jpg','/ctf-image-3.jpg'].map((src,i)=>(
                      <img key={i} src={src} alt={`CTF Image ${i+1}`}
                        style={{width:80,height:56,objectFit:'cover',border:'1px solid #2a1a4a',opacity:0.8}}/>
                    ))}
                  </div>
                  <p style={{fontSize:'0.75rem',color:'#557',marginBottom:'0.75rem'}}>
                    Each team receives a random image from the 3 above. All 3 carry the same flag.
                  </p>
                  <div className="field-group" style={{marginBottom:'0.5rem'}}>
                    <div className="field-label">Flag Word (stored in Supabase)</div>
                    <input type="text" value={ctfFlags.image_flag}
                      onChange={e=>setCTFFlags(prev=>({...prev,image_flag:e.target.value.toUpperCase()}))}
                      style={{textTransform:'uppercase',letterSpacing:'0.18em',fontFamily:'Share Tech Mono,monospace'}}
                      placeholder="e.g. NEXUS"/>
                  </div>
                  <button className="btn btn-sm" style={{borderColor:'var(--purple)',color:'var(--purple)'}}
                    disabled={ctfSaving.image_flag}
                    onClick={()=>saveCTFFlag('image_flag',ctfFlags.image_flag)}>
                    {ctfSaving.image_flag ? 'SAVING...' : 'SAVE TO DATABASE'}
                  </button>
                </div>

                <div style={{marginTop:'1rem',background:'rgba(0,0,0,0.3)',border:'1px solid #1a1a2e',padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#666',lineHeight:1.8}}>
                  <div style={{color:'var(--gold-dim)',fontFamily:'Cinzel,serif',fontSize:'0.7rem',letterSpacing:'0.1em',marginBottom:'0.3rem'}}>SUPABASE SETUP REQUIRED</div>
                  <div>Run this SQL in Supabase SQL Editor to create the config table:</div>
                  <div style={{fontFamily:'Share Tech Mono,monospace',background:'rgba(0,0,0,0.4)',border:'1px solid #222',padding:'0.5rem 0.75rem',margin:'0.4rem 0',color:'var(--gold-dim)',fontSize:'0.75rem'}}>
                    CREATE TABLE ctf_config (key text PRIMARY KEY, value text);<br/>
                    INSERT INTO ctf_config (key, value) VALUES ('html_flag', 'SHADOW'), ('image_flag', 'NEXUS');
                  </div>
                  <div>Also disable RLS on this table the same way as the teams table.</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ROUND 2 ── */}
        {tab==='r2' && (
          <div className="admin-section">
            <h3>Round 2 — Dual-Agent Maze</h3>
            <p style={{fontSize:'0.82rem',color:'#777',marginBottom:'1.2rem'}}>
              Two players navigate a full-screen maze. Two security drones hunt them. Both must reach the CENTER EXIT simultaneously.
            </p>

            <h4 style={{marginBottom:'0.5rem',color:'var(--gold-dim)'}}>⬡ Drone Chase Speed</h4>
            <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.75rem'}}>
              Controls how fast the security drones chase players. Scale of 1 (slow) to 10 (very fast).
            </p>

            <div style={{background:'rgba(10,0,0,0.5)',border:'1px solid rgba(255,60,60,0.2)',borderLeft:'3px solid rgba(255,60,60,0.5)',padding:'1.25rem 1.5rem',marginBottom:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'1.5rem',marginBottom:'1rem'}}>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:'2rem',color:'var(--red)',minWidth:40,textAlign:'center'}}>
                  {local.r2BotSpeed ?? 5}
                </div>
                <div style={{flex:1}}>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={local.r2BotSpeed ?? 5}
                    onChange={e => setLocal(prev => ({...prev, r2BotSpeed: Number(e.target.value)}))}
                    style={{width:'100%',accentColor:'var(--red)',cursor:'pointer'}}
                  />
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.62rem',color:'#444',marginTop:'0.25rem',fontFamily:'Share Tech Mono,monospace'}}>
                    <span>1 — SLOW</span>
                    <span>5 — MEDIUM</span>
                    <span>10 — FAST</span>
                  </div>
                </div>
              </div>
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:'0.75rem',color:'#555',letterSpacing:'0.1em',marginBottom:'0.5rem'}}>
                DRONE SPEED:&nbsp;
                {[...Array(10)].map((_,i)=>(
                  <span key={i} style={{color: i < (local.r2BotSpeed??5) ? '#ff4444' : '#222', marginLeft:2}}>{'\u2588'}</span>
                ))}
              </div>
              <div style={{fontSize:'0.75rem',color:'#888',lineHeight:1.7}}>
                {(local.r2BotSpeed??5) <= 3 && '\u26a1 Easy — Drones move slowly. Beginners can navigate with some care.'}
                {(local.r2BotSpeed??5) >= 4 && (local.r2BotSpeed??5) <= 6 && '\u26a1 Medium — Drones move at a steady pace. Coordination required.'}
                {(local.r2BotSpeed??5) >= 7 && (local.r2BotSpeed??5) <= 8 && '\u26a1 Hard — Drones are aggressive. Quick thinking needed.'}
                {(local.r2BotSpeed??5) >= 9 && '\u26a1 Extreme — Drones are relentless. Only for elite teams.'}
              </div>
            </div>

            <button
              className="btn btn-sm"
              style={{marginBottom:'1rem'}}
              onClick={() => {
                setConfig(prev => ({...prev, r2BotSpeed: local.r2BotSpeed ?? 5}));
                showFlash('Drone speed set to ' + (local.r2BotSpeed ?? 5) + '/10', 'success');
              }}
            >
              APPLY DRONE SPEED
            </button>

            <div className="divider"/>

            <h4 style={{marginBottom:'0.5rem',color:'var(--gold-dim)'}}>⬡ Agent Movement Speed</h4>
            <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.75rem'}}>
              Controls how fast agents can move through the maze. Scale of 1 (slow) to 10 (instant response).
            </p>

            <div style={{background:'rgba(0,5,15,0.6)',border:'1px solid rgba(96,224,255,0.2)',borderLeft:'3px solid rgba(96,224,255,0.5)',padding:'1.25rem 1.5rem',marginBottom:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'1.5rem',marginBottom:'1rem'}}>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:'2rem',color:'#60e0ff',minWidth:40,textAlign:'center'}}>
                  {local.r2PlayerSpeed ?? 5}
                </div>
                <div style={{flex:1}}>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={local.r2PlayerSpeed ?? 5}
                    onChange={e => setLocal(prev => ({...prev, r2PlayerSpeed: Number(e.target.value)}))}
                    style={{width:'100%',accentColor:'#60e0ff',cursor:'pointer'}}
                  />
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.62rem',color:'#444',marginTop:'0.25rem',fontFamily:'Share Tech Mono,monospace'}}>
                    <span>1 — SLOW</span>
                    <span>5 — NORMAL</span>
                    <span>10 — FAST</span>
                  </div>
                </div>
              </div>
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:'0.75rem',color:'#555',letterSpacing:'0.1em',marginBottom:'0.5rem'}}>
                AGENT SPEED:&nbsp;
                {[...Array(10)].map((_,i)=>(
                  <span key={i} style={{color: i < (local.r2PlayerSpeed??5) ? '#60e0ff' : '#222', marginLeft:2}}>{'\u2588'}</span>
                ))}
              </div>
              <div style={{fontSize:'0.75rem',color:'#888',lineHeight:1.7}}>
                {(local.r2PlayerSpeed??5) <= 3 && '\u26a1 Sluggish — Agents move slowly. Coordination is harder.'}
                {(local.r2PlayerSpeed??5) >= 4 && (local.r2PlayerSpeed??5) <= 6 && '\u26a1 Normal — Balanced movement. Recommended for most teams.'}
                {(local.r2PlayerSpeed??5) >= 7 && (local.r2PlayerSpeed??5) <= 8 && '\u26a1 Agile — Agents react quickly. More fluid navigation.'}
                {(local.r2PlayerSpeed??5) >= 9 && '\u26a1 Instant — No movement delay. Maximum responsiveness.'}
              </div>
            </div>

            <button
              className="btn btn-sm"
              style={{marginBottom:'1rem'}}
              onClick={() => {
                setConfig(prev => ({...prev, r2PlayerSpeed: local.r2PlayerSpeed ?? 5}));
                showFlash('Agent speed set to ' + (local.r2PlayerSpeed ?? 5) + '/10', 'success');
              }}
            >
              APPLY AGENT SPEED
            </button>

            <div className="divider"/>

            <h4 style={{marginBottom:'0.5rem'}}>Maze Layout</h4>
            <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid #1e1e2e',padding:'0.75rem 1rem',fontSize:'0.82rem',color:'#888',lineHeight:1.8}}>
              <div>Fixed size: 31x21 cells — full-screen responsive canvas</div>
              <div>Exit located at center cell — both players must converge</div>
              <div>Player 1 spawns top-left · Player 2 spawns bottom-right</div>
              <div>Bot 1 spawns top-right · Bot 2 spawns bottom-left</div>
              <div style={{color:'var(--red)'}}>Any bot touching any player = both players reset to spawn</div>
              <div>Controls: WASD (normal) for P1 · Arrow keys (normal) for P2</div>
            </div>
          </div>
        )}

        {/* ── ROUND 3 ── */}
        {tab==='r3' && (
          <div className="admin-section">
            <h3>Round 3 — System Reconstruction</h3>

            <h4 style={{marginBottom:'0.5rem',marginTop:'1rem'}}>Step 1 — Scrambled Commands</h4>
            <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.5rem'}}>Teams type the correct version of each scrambled command.</p>
            <div className="drag-items">
              {local.r3Scrambled.map((sc,i)=>(
                <div key={i} className="drag-item">
                  <input type="text" value={sc} placeholder="Scrambled" onChange={e=>updateScrambled(i,e.target.value)} style={{textTransform:'uppercase',letterSpacing:'0.12em'}}/>
                  <span style={{color:'#555',padding:'0 0.3rem',fontSize:'0.8rem'}}>→</span>
                  <input type="text" value={local.r3Correct[i]||''} placeholder="Correct" onChange={e=>updateCorrect(i,e.target.value)} style={{textTransform:'uppercase',letterSpacing:'0.12em'}}/>
                  <button className="del" onClick={()=>removeCommand(i)}>x</button>
                </div>
              ))}
            </div>
            <button className="btn btn-sm btn-green add-item-btn" onClick={addCommand}>+ Add Command</button>

            <div className="divider"/>
            <h4 style={{marginBottom:'0.5rem'}}>Step 2 — Decoy Commands (teams must remove these)</h4>
            <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.5rem'}}>These invalid commands are mixed into the pool. Teams must identify and remove them.</p>
            <div className="drag-items">
              {local.r3Decoys.map((d,i)=>(
                <div key={i} className="drag-item">
                  <input type="text" value={d} placeholder="Decoy command" onChange={e=>updateDecoy(i,e.target.value)} style={{textTransform:'uppercase',letterSpacing:'0.12em'}}/>
                  <button className="del" onClick={()=>removeDecoy(i)}>x</button>
                </div>
              ))}
            </div>
            <button className="btn btn-sm btn-green add-item-btn" onClick={addDecoy}>+ Add Decoy</button>
            <div className="field-group" style={{marginTop:'0.75rem'}}>
              <div className="field-label">Decoy Clue (shown to teams)</div>
              <textarea value={local.r3DecoyCue} onChange={e=>setLocal(p=>({...p,r3DecoyCue:e.target.value}))} style={{minHeight:60}}/>
            </div>

            <div className="divider"/>
            <h4 style={{marginBottom:'0.5rem'}}>Step 3 — Correct Execution Sequence</h4>
            <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.5rem'}}>The order teams must arrange commands. Length depends on difficulty (Easy=3, Medium=4, Hard=4).</p>
            <div className="drag-items">
              {local.r3Sequence.map((s,i)=>(
                <div key={i} className="drag-item">
                  <span style={{color:'#555',fontSize:'0.75rem',minWidth:20}}>{i+1}.</span>
                  <input type="text" value={s} placeholder="Command" onChange={e=>updateSequence(i,e.target.value)} style={{textTransform:'uppercase',letterSpacing:'0.12em'}}/>
                  <button className="del" onClick={()=>removeSeqStep(i)}>x</button>
                </div>
              ))}
            </div>
            <button className="btn btn-sm btn-green add-item-btn" onClick={addSeqStep}>+ Add Step</button>

            <div className="divider"/>
            <h4 style={{marginBottom:'0.5rem'}}>Sequence Clue (shown to teams)</h4>
            <textarea value={local.r3Clue} onChange={e=>setLocal(p=>({...p,r3Clue:e.target.value}))} style={{minHeight:70}}/>
          </div>
        )}

        {/* ── FINAL VAULT ── */}
        {tab==='final' && (
          <div className="admin-section">
            <h3>Final Vault — Transformation Challenge</h3>
            <p style={{fontSize:'0.82rem',color:'#777',marginBottom:'1rem'}}>
              Teams apply a transformation rule to their collected fragments and submit the result to unlock the vault.
            </p>

            <div className="field-group">
              <div className="field-label">Transformation Instruction (shown to teams)</div>
              <textarea
                value={local.finalInstruction}
                onChange={e=>setLocal(p=>({...p,finalInstruction:e.target.value}))}
                style={{minHeight:80}}
                placeholder='e.g. "Shift the first fragment by +1 letter, reverse the numeric code, and keep the last fragment unchanged."'
              />
            </div>

            <div className="field-group">
              <div className="field-label">Correct Final Answer</div>
              <input
                type="text" value={local.finalAnswer||''}
                onChange={e=>setLocal(p=>({...p,finalAnswer:e.target.value.toUpperCase()}))}
                style={{textTransform:'uppercase',letterSpacing:'0.18em'}}
                placeholder="e.g. PSJPO-71X-OMEGA"
              />
            </div>

            <div style={{background:'rgba(0,0,0,0.4)',border:'1px solid #1e1e2e',padding:'0.75rem 1rem',fontSize:'0.82rem',color:'#888',lineHeight:1.8}}>
              <div style={{marginBottom:'0.3rem',color:'var(--gold-dim)',fontFamily:'Cinzel,serif',fontSize:'0.7rem',letterSpacing:'0.1em'}}>HOW IT WORKS</div>
              <div>1. Teams collect 3 fragments during gameplay (set per team in the Teams tab)</div>
              <div>2. The transformation instruction is shown on the Final Vault screen</div>
              <div>3. Teams apply the rule manually and type in the transformed result</div>
              <div>4. The answer is checked against the Correct Final Answer above</div>
              <div style={{marginTop:'0.5rem',color:'#666',fontSize:'0.78rem'}}>
                Tip: Make sure the Correct Final Answer matches what teams would get when they apply the instruction to their specific fragments. If different teams have different fragments, you may need to give each team their own instruction (or use fragments where the transformation yields the same result).
              </div>
            </div>
          </div>
        )}

        <div className="divider"/>
        <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
          <button className="btn btn-sm" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary btn-sm" onClick={save}>SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
}
