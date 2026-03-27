import { useRef, useState, useEffect } from 'react';

export function useAudio() {
  const acRef   = useRef(null);
  const bgRef   = useRef(null);
  const [on, setOn] = useState(true);

  function ac() {
    if (!acRef.current) acRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (acRef.current.state === 'suspended') acRef.current.resume();
    return acRef.current;
  }

  function tone(freq, type='sine', dur=0.15, vol=0.1, delay=0, endFreq=null) {
    if (!on) return;
    const ctx=ac(), osc=ctx.createOscillator(), g=ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type=type; osc.frequency.value=freq;
    if (endFreq) osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime+delay+dur);
    const t=ctx.currentTime+delay;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    osc.start(t); osc.stop(t+dur+0.02);
  }

  function noise(dur=0.1, vol=0.05, delay=0) {
    if (!on) return;
    const ctx=ac(), buf=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource(), g=ctx.createGain();
    src.buffer=buf; src.connect(g); g.connect(ctx.destination);
    const t=ctx.currentTime+delay;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.start(t); src.stop(t+dur+0.01);
  }

  function playClick() { tone(600,'sine',0.05,0.06); noise(0.03,0.02); }

  function playSuccess() {
    const notes=[523,659,784,1047,1319];
    notes.forEach((f,i)=>tone(f,'sine',0.25,0.12,i*0.1));
    setTimeout(()=>[1568,2093].forEach((f,i)=>tone(f,'sine',0.3,0.06,i*0.08)),550);
  }

  // ── LEVEL COMPLETE — futuristic synth reward ──────────────────
  function playLevelComplete() {
    if (!on) return;
    // Rising arpeggio
    [392,494,587,740,880,1109].forEach((f,i)=>tone(f,'triangle',0.22,0.13,i*0.09));
    // Synth chord hit
    setTimeout(()=>{
      [523,659,784].forEach((f,i)=>tone(f,'sine',0.5,0.1,i*0.01));
      tone(1047,'sine',0.5,0.08);
    },580);
    // Sparkle shimmer
    setTimeout(()=>{
      [2093,2637,3136].forEach((f,i)=>tone(f,'sine',0.25,0.05,i*0.06));
    },900);
    noise(0.05,0.06,0.58);
  }

  // ── ROUND COMPLETE — full cinematic fanfare ───────────────────
  function playRoundWin() {
    if (!on) return;
    const ctx = ac();
    // Sweep riser
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(60,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600,ctx.currentTime+0.8);
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12,ctx.currentTime+0.1);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.8);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.85);
    // Fanfare
    const seq=[{f:523,t:0.2},{f:659,t:0.32},{f:784,t:0.44},{f:1047,t:0.56},{f:1319,t:0.68},{f:1568,t:0.78}];
    seq.forEach(s=>tone(s.f,'triangle',0.35,0.14,s.t));
    // Final chord
    setTimeout(()=>[523,659,784,1047].forEach((f,i)=>tone(f,'sine',0.9,0.1,i*0.015)),1100);
    // Bass pulse
    [130,165].forEach((f,i)=>tone(f,'sawtooth',0.25,0.1,0.2+i*0.12));
    // High sparkles
    setTimeout(()=>[2093,2637,3136].forEach((f,i)=>tone(f,'sine',0.4,0.07,i*0.08)),1200);
  }

  function playError() {
    tone(300,'sawtooth',0.12,0.18);
    tone(220,'sawtooth',0.18,0.15,0.1);
    tone(150,'sawtooth',0.2,0.12,0.22);
    noise(0.15,0.08,0.05);
  }

  function playAlarm() {
    if (!on) return;
    for(let i=0;i<4;i++){
      tone(880,'square',0.08,0.1,i*0.22);
      tone(660,'square',0.08,0.08,i*0.22+0.11);
    }
  }

  function playBotHit() {
    if (!on) return;
    noise(0.3,0.2);
    tone(80,'sawtooth',0.4,0.25);
    tone(60,'sawtooth',0.5,0.2,0.1);
    for(let i=0;i<3;i++){
      tone(1200,'square',0.06,0.12,0.1+i*0.15);
      tone(800,'square',0.06,0.1,0.17+i*0.15);
    }
  }

  function playWallHit() {
    if (!on) return;
    noise(0.08,0.12);
    tone(120,'sine',0.12,0.1);
  }

  function playVaultOpen() {
    if (!on) return;
    const ctx=ac();
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(80,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800,ctx.currentTime+1.2);
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.2,ctx.currentTime+0.1);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1.2);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+1.3);
    const fanfare=[261,329,392,523,659,784,1047,1319,1568];
    fanfare.forEach((f,i)=>tone(f,'triangle',0.35,0.14,0.3+i*0.1));
    setTimeout(()=>[523,659,784,1047].forEach((f,i)=>tone(f,'sine',0.8,0.1+i*0.01,i*0.02)),1300);
  }

  function playCTFFound() {
    if (!on) return;
    const seq=[440,554,659,880,1108];
    seq.forEach((f,i)=>tone(f,'square',0.08,0.09,i*0.07));
    setTimeout(()=>tone(1760,'sine',0.3,0.1),400);
  }

  function playQuitWarning() {
    if (!on) return;
    tone(440,'sine',0.1,0.08);
    tone(370,'sine',0.15,0.1,0.12);
    tone(330,'sine',0.2,0.1,0.28);
  }

  // ── INTENSE GAMEPLAY MUSIC ────────────────────────────────────
  // Tension loop: driving pulse + bass + occasional stab
  function startBg() {
    if (!on || bgRef.current) return;
    const ctx = ac();
    const master = ctx.createGain(); master.gain.value = 0.04; master.connect(ctx.destination);
    bgRef.current = { master, nodes: [], ctx };

    // Sub-bass drone
    const sub=ctx.createOscillator(), subG=ctx.createGain();
    sub.type='sine'; sub.frequency.value=30;
    sub.connect(subG); subG.connect(master); subG.gain.value=0.4;
    sub.start(); bgRef.current.nodes.push(sub);

    // Tension pulse — 8th note feel at ~120bpm
    const bpm=118, beat=60/bpm;
    const pulseFreqs=[55,55,82,55,65,55,82,73];
    let pIdx=0;
    function pulse() {
      if (!bgRef.current) return;
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type='triangle'; o.frequency.value=pulseFreqs[pIdx%pulseFreqs.length]; pIdx++;
      o.connect(g); g.connect(master);
      const t=ctx.currentTime;
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(0.12,t+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,t+beat*0.8);
      o.start(t); o.stop(t+beat);
      bgRef.current._pulseTimer = setTimeout(pulse, beat*1000);
    }
    pulse();

    // Mid stab every 2 beats
    let sIdx=0;
    const stabFreqs=[196,220,196,165,196,220,246,220];
    function stab() {
      if (!bgRef.current) return;
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type='square'; o.frequency.value=stabFreqs[sIdx%stabFreqs.length]; sIdx++;
      o.connect(g); g.connect(master);
      const t=ctx.currentTime;
      g.gain.setValueAtTime(0.06,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+beat*1.8);
      o.start(t); o.stop(t+beat*2);
      bgRef.current._stabTimer = setTimeout(stab, beat*2000);
    }
    setTimeout(stab, beat*2000);

    // High tension arpeggio every 4 beats
    const arpFreqs=[523,659,784,659,523,440,494,523];
    let aIdx=0;
    function arp() {
      if (!bgRef.current) return;
      arpFreqs.slice(aIdx%arpFreqs.length, (aIdx%arpFreqs.length)+4).forEach((f,i)=>{
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.type='sine'; o.frequency.value=f;
        o.connect(g); g.connect(master);
        const t=ctx.currentTime+i*beat*0.5;
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.04,t+0.01);
        g.gain.exponentialRampToValueAtTime(0.001,t+beat*0.4);
        o.start(t); o.stop(t+beat*0.5);
      });
      aIdx++;
      bgRef.current._arpTimer = setTimeout(arp, beat*4000);
    }
    setTimeout(arp, beat*4000);
  }

  function stopBg() {
    if (bgRef.current) {
      clearTimeout(bgRef.current._pulseTimer);
      clearTimeout(bgRef.current._stabTimer);
      clearTimeout(bgRef.current._arpTimer);
      bgRef.current.nodes.forEach(n => { try { n.stop(); } catch(e){} });
      bgRef.current = null;
    }
  }

  function toggle() {
    setOn(prev => {
      if (prev) stopBg();
      return !prev;
    });
  }

  return {
    on, toggle,
    playClick, playSuccess,
    playLevelComplete, playRoundWin,
    playError, playAlarm,
    playBotHit, playWallHit,
    playVaultOpen, playCTFFound,
    playQuitWarning,
    startBg, stopBg,
  };
}
