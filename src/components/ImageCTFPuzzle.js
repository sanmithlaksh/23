import { useEffect, useState, useRef } from 'react';
import { getCTFConfig, onCTFConfigLoad } from './CTFClue';

import img1 from '../assets/ctf-image-1.jpg';
import img2 from '../assets/ctf-image-2.jpg';
import img3 from '../assets/ctf-image-3.jpg';

const CTF_IMAGES = [img1, img2, img3];

export default function ImageCTFPuzzle({ teamId, solved, onCheck }) {
  const [downloadUrl,   setDownloadUrl]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [answer,        setAnswer]        = useState('');
  const [ctfConfig,     setCTFConfig]     = useState(getCTFConfig());
  const [imgIndex,      setImgIndex]      = useState(0);
  const [shake,         setShake]         = useState(false);
  const [imgSrc,        setImgSrc]        = useState(null);

  // Tap states
  const [tapCount,           setTapCount]           = useState(0);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [downloading,        setDownloading]        = useState(false);
  const [metaVisible,        setMetaVisible]        = useState(false); // 10-tap silent reveal
  const [metaData,           setMetaData]           = useState(null);
  const tapRef     = useRef(null);
  const tapCountRef = useRef(0);

  useEffect(() => {
    const unsub = onCTFConfigLoad(cfg => setCTFConfig(cfg));
    return unsub;
  }, []);

  useEffect(() => {
    if (!teamId) return;
    let hash = 0;
    for (let i = 0; i < teamId.length; i++) hash = (hash * 31 + teamId.charCodeAt(i)) & 0xffff;
    setImgIndex(hash % CTF_IMAGES.length);
  }, [teamId]);

  useEffect(() => {
    if (!ctfConfig || !teamId) return;
    setLoading(true);
    const flag  = (ctfConfig.image_flag || 'NEXUS').toUpperCase();
    const src   = CTF_IMAGES[imgIndex];
    setImgSrc(src);

    const xhr = new XMLHttpRequest();
    xhr.open('GET', src, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          const modified = injectJPEGComment(xhr.response, `VAULT_IMAGE_FLAG: ${flag}`);
          const blob     = new Blob([modified], { type: 'image/jpeg' });
          setDownloadUrl(URL.createObjectURL(blob));
          setMetaData(parseJPEGMeta(modified, flag));
        } catch(e) {
          console.error('JPEG injection error:', e);
          const blob = new Blob([xhr.response], { type: 'image/jpeg' });
          setDownloadUrl(URL.createObjectURL(blob));
          setMetaData({ comment: `VAULT_IMAGE_FLAG: ${flag}` });
        }
      }
      setLoading(false);
    };
    xhr.onerror = () => { setDownloadUrl(src); setLoading(false); };
    xhr.send();
  }, [ctfConfig, imgIndex, teamId]);

  // ── Tap handler ───────────────────────────────────────────
  function handleImageTap() {
    if (solved) return;

    const next = tapCountRef.current + 1;
    tapCountRef.current = next;
    setTapCount(next);
    clearTimeout(tapRef.current);

    // 10 taps — silently reveal metadata, absolutely no prior hint
    if (next === 10) {
      tapCountRef.current = 0;
      setTapCount(0);
      setShowDownloadPrompt(false);
      setMetaVisible(true);
      return;
    }

    // 3 taps — show download prompt
    if (next === 3) {
      setShowDownloadPrompt(true);
      // Auto-dismiss after 4s
      tapRef.current = setTimeout(() => {
        setShowDownloadPrompt(false);
        tapCountRef.current = 0;
        setTapCount(0);
      }, 4000);
      return;
    }

    // Taps 1-2: show counter hint (only toward download, not metadata)
    tapRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      setTapCount(0);
    }, 1800);
  }

  function triggerDownload() {
    if (!downloadUrl) return;
    setDownloading(true);
    setShowDownloadPrompt(false);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `vault-evidence-${imgIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    tapCountRef.current = 0;
    setTapCount(0);
    setTimeout(() => setDownloading(false), 1500);
  }

  function handleCheck() {
    const val = answer.trim().toUpperCase();
    if (!ctfConfig) return;
    if (val === (ctfConfig.image_flag || 'NEXUS').toUpperCase()) {
      onCheck(true);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }

  return (
    <div>
      {/* Image — tap to interact */}
      <div style={{ margin: '0.75rem 0', position: 'relative', cursor: 'pointer', userSelect: 'none' }}
        onClick={handleImageTap}>
        {imgSrc ? (
          <img src={imgSrc} alt="Vault evidence"
            style={{
              width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block',
              border: `1px solid ${tapCount > 0 ? 'var(--gold)' : 'var(--gold-dim)'}`,
              filter: 'brightness(0.85) contrast(1.1)', transition: 'border-color 0.2s',
            }}
          />
        ) : (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid #1a1a2e', color: '#555', fontFamily: 'Cinzel,serif', fontSize: '0.8rem', letterSpacing: '0.12em' }}>
            {loading ? 'ENCODING METADATA...' : 'LOADING...'}
          </div>
        )}

        {/* Tap counter hint — only for taps 1-2 (toward download) */}
        {tapCount > 0 && tapCount < 3 && !showDownloadPrompt && !solved && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.88)', border: '1px solid var(--gold-dim)',
            padding: '0.3rem 0.65rem', fontFamily: 'Cinzel,serif',
            fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--gold)',
            pointerEvents: 'none',
          }}>
            {tapCount}/3 — tap {3 - tapCount} more to download
          </div>
        )}

        {/* Download success indicator */}
        {downloading && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,40,0,0.9)', border: '1px solid var(--green-dim)',
            padding: '0.3rem 0.65rem', fontFamily: 'Cinzel,serif',
            fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--green)',
            pointerEvents: 'none',
          }}>
            ✓ Downloading evidence...
          </div>
        )}
      </div>

      {/* Download prompt — shown at 3 taps */}
      {showDownloadPrompt && !solved && (
        <div style={{
          background: 'rgba(0,10,5,0.97)',
          border: '1px solid var(--gold)',
          borderLeft: '3px solid var(--gold)',
          padding: '1rem 1.25rem',
          marginBottom: '0.75rem',
          fontFamily: 'Cinzel, serif',
          animation: 'fadeUp 0.3s ease',
        }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            ⬡ Vault Evidence — Secure Download
          </div>
          <div style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: '0.9rem', letterSpacing: '0.06em', lineHeight: 1.6, fontFamily: 'Share Tech Mono, monospace' }}>
            This evidence file contains embedded forensic metadata. Download it to your device for deeper analysis.
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              className="btn btn-sm"
              onClick={e => { e.stopPropagation(); triggerDownload(); }}
              style={{ flex: 1, background: 'rgba(201,168,76,0.12)', borderColor: 'var(--gold)', color: 'var(--gold)' }}
            >
              ↓ DOWNLOAD IMAGE
            </button>
            <button
              className="btn btn-sm"
              onClick={e => { e.stopPropagation(); setShowDownloadPrompt(false); tapCountRef.current = 0; setTapCount(0); clearTimeout(tapRef.current); }}
              style={{ flex: 1, background: 'transparent', borderColor: '#444', color: '#555' }}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Metadata panel — silently revealed after 10 taps, zero prior hint */}
      {metaVisible && metaData && (
        <div style={{
          background: 'rgba(0,5,0,0.9)', border: '1px solid #0a3a1a',
          borderLeft: '3px solid var(--green)', padding: '1rem 1.25rem',
          marginBottom: '0.75rem', fontFamily: 'Share Tech Mono, monospace',
          fontSize: '0.78rem', lineHeight: 2, animation: 'fadeUp 0.4s ease',
        }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', color: '#00aa55', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            ⬡ Image Metadata — JPEG File Analysis
          </div>
          {Object.entries(metaData).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: '#557' }}>{k}: </span>
              <span style={{ color: k === 'Comment' ? 'var(--green)' : '#aaffcc' }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {!solved && (
        <div className={`input-row ${shake ? 'shake' : ''}`}>
          <input type="text" placeholder="Enter the flag you found…"
            value={answer} onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
            style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}
          />
          <button className="btn btn-sm" onClick={handleCheck}>CHECK</button>
        </div>
      )}
    </div>
  );
}

// ── JPEG COM marker injection ─────────────────────────────
function injectJPEGComment(arrayBuffer, commentText) {
  const src = new Uint8Array(arrayBuffer);
  if (src[0] !== 0xFF || src[1] !== 0xD8) throw new Error('Not a valid JPEG');
  const textBytes  = new TextEncoder().encode(commentText);
  const dataLength = 2 + textBytes.length;
  const com = new Uint8Array(4 + textBytes.length);
  com[0] = 0xFF; com[1] = 0xFE;
  com[2] = (dataLength >> 8) & 0xFF;
  com[3] =  dataLength       & 0xFF;
  com.set(textBytes, 4);
  const out = new Uint8Array(src.length + com.length);
  out[0] = 0xFF; out[1] = 0xD8;
  out.set(com, 2);
  out.set(src.slice(2), 2 + com.length);
  return out.buffer;
}

// ── Parse JPEG metadata for in-page display ───────────────
function parseJPEGMeta(arrayBuffer, flag) {
  const src = new Uint8Array(arrayBuffer instanceof ArrayBuffer ? arrayBuffer : arrayBuffer);
  const meta = {
    'File Type':    'JPEG / JFIF',
    'Format':       'image/jpeg',
    'Encoding':     'DCT (Discrete Cosine Transform)',
    'Comment':      `VAULT_IMAGE_FLAG: ${flag}`,
    'Marker':       'FF FE (COM — JPEG Comment Segment)',
    'Classification': 'CLASSIFIED — VAULT AUTHORITY',
  };
  let i = 2;
  while (i < src.length - 1) {
    if (src[i] === 0xFF) {
      const marker = src[i+1];
      if (marker >= 0xC0 && marker <= 0xC3) {
        const h = (src[i+5] << 8) | src[i+6];
        const w = (src[i+7] << 8) | src[i+8];
        meta['Dimensions'] = `${w} x ${h} px`;
        break;
      }
      if (marker === 0xD9 || marker === 0xDA) break;
      if (i + 3 < src.length) {
        const len = (src[i+2] << 8) | src[i+3];
        i += 2 + len;
      } else break;
    } else i++;
  }
  return meta;
}
