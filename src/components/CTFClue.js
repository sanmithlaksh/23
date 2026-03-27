import { useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { fetchCTFConfig } from '../supabase';

// ── Shared CTF state (so Round1Screen can read it) ────────────────────────
let _ctfConfig = null;
let _ctfListeners = [];
export function getCTFConfig() { return _ctfConfig; }
export function onCTFConfigLoad(fn) { _ctfListeners.push(fn); return () => { _ctfListeners = _ctfListeners.filter(f=>f!==fn); }; }

/**
 * CTFClue — loads CTF answers from Supabase and:
 * 1. Injects a hidden HTML comment into <head> with the html_flag
 * 2. Makes image_flag available for the image CTF puzzle component
 */
export default function CTFClue() {
  const { team } = useGame();

  useEffect(() => {
    if (!team) return;
    let injected = [];

    async function setup() {
      const cfg = await fetchCTFConfig();
      _ctfConfig = cfg;
      _ctfListeners.forEach(fn => fn(cfg));

      // Inject HTML comment into <head>
      const comment = document.createComment(
        ` VAULT SYSTEM DIAGNOSTIC — FRAGMENT TRACE DETECTED: ${cfg.html_flag} `
      );
      document.head.appendChild(comment);
      injected.push({ node: comment, parent: document.head });

      // Also inject hidden data-attribute span on body
      const span = document.createElement('span');
      span.setAttribute('data-vault-trace', cfg.html_flag);
      span.setAttribute('aria-hidden', 'true');
      span.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
      document.body.appendChild(span);
      injected.push({ node: span, parent: document.body });
    }

    setup();

    return () => {
      injected.forEach(({ node, parent }) => { try { parent.removeChild(node); } catch(e) {} });
      _ctfConfig = null;
    };
  }, [team]);

  return null;
}
