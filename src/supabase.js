import { createClient } from '@supabase/supabase-js';

// ─── PASTE YOUR SUPABASE CREDENTIALS HERE ───────────────────────────────────
const SUPABASE_URL  = 'https://xwyyquoetdtrifodtoqj.supabase.co';
const SUPABASE_ANON = 'sb_publishable_XR6q16NFXEhKV8TZMTUjFw_tu9s8wlS';
// ─────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// 1 = Easy, 2 = Medium, 3 = Hard
const DIFFICULTY_MAP         = { 1: 'easy', 2: 'medium', 3: 'hard' };
const DIFFICULTY_REVERSE_MAP = { easy: 1, medium: 2, hard: 3 };

// Fallback fragments if none set in DB
const DEFAULT_FRAGMENTS = ['ORION', 'X17', 'OMEGA'];

export async function loginTeam(teamId, password) {
  const { data: rows, error } = await supabase.from('teams').select('*');
  if (error) return { ok: false, msg: 'DB error: ' + error.message };
  if (!rows || rows.length === 0) return { ok: false, msg: 'No teams found. Disable RLS in Supabase.' };

  const match = rows.find(r => (r.team_id || '').toUpperCase() === teamId.toUpperCase());
  if (!match)                      return { ok: false, msg: 'Team ID not found.' };
  if (match.password !== password) return { ok: false, msg: 'Incorrect password.' };
  if (match.disqualified)          return { ok: false, msg: 'This team has been disqualified.' };

  if (!match.start_time && teamId.toUpperCase() !== 'A') {
    await supabase.from('teams')
      .update({ start_time: new Date().toISOString(), current_round: 1 })
      .eq('team_id', match.team_id);
  }

  // Read difficulty (1/2/3) — default to medium
  const difficulty = DIFFICULTY_MAP[match.difficulty || 2] || 'medium';

  // Read vault fragments from DB — fall back to defaults if not set
  const fragments = [
    (match.vault_fragment1 || DEFAULT_FRAGMENTS[0]).toUpperCase(),
    (match.vault_fragment2 || DEFAULT_FRAGMENTS[1]).toUpperCase(),
    (match.vault_fragment3 || DEFAULT_FRAGMENTS[2]).toUpperCase(),
  ];

  // Read final answer from DB — fallback to joined fragments if not set
  const finalAnswer = (match.final_answer || '').toUpperCase() || fragments.join('-');

  return {
    ok: true,
    team: {
      id:          match.team_id,
      name:        match.team_name || match.team_id,
      difficulty,
      fragments,   // unique per team, loaded from DB
      finalAnswer, // correct answer for the vault unlock challenge
      currentRound: match.current_round || 1,
    },
  };
}

export async function saveProgress(teamId, update) {
  if (!teamId) { console.warn('[saveProgress] no teamId'); return; }

  const mapped = {};
  // currentRound must always be an integer for the DB column
  if (update.currentRound    !== undefined) mapped.current_round   = parseInt(update.currentRound, 10);
  if (update.mazeSteps       !== undefined) mapped.maze_steps      = parseInt(update.mazeSteps, 10);
  if (update.elapsedSeconds  !== undefined) mapped.elapsed_seconds = parseInt(update.elapsedSeconds, 10);
  mapped.last_updated = new Date().toISOString();
  const { error } = await supabase.from('teams').update(mapped).eq('team_id', teamId);
  if (error) console.error('[saveProgress] error:', error.message, '| teamId:', teamId, '| update:', mapped);
}

export async function markWinner(teamId, elapsedSeconds) {
  // Force to integer — Supabase int4 column rejects floats and non-numbers
  const secs = parseInt(elapsedSeconds, 10);
  const finishTime = new Date().toISOString();

  console.log('[markWinner] teamId:', teamId, '| elapsedSeconds raw:', elapsedSeconds, '| parsed int:', secs, '| finishTime:', finishTime);

  if (!teamId) { console.error('[markWinner] teamId is null/undefined!'); return; }
  

  if (isNaN(secs)) { console.error('[markWinner] elapsed is NaN — original value:', elapsedSeconds); }

  const { data, error } = await supabase
    .from('teams')
    .update({
      finish_time:     finishTime,
      elapsed_seconds: isNaN(secs) ? 0 : secs,
      current_round:   99,  // 99 = vault unlocked/complete (column is integer type)
    })
    .eq('team_id', teamId)
    .select(); // .select() forces Supabase to return what was actually written

  if (error) {
    console.error('[markWinner] Supabase error:', error.message, error.details, error.hint);
  } else {
    console.log('[markWinner] SUCCESS — DB wrote:', data);
  }
}

export async function fetchLeaderboard() {
  const { data } = await supabase
    .from('teams')
    .select('team_id, team_name, elapsed_seconds, finish_time, current_round')
    .order('elapsed_seconds', { ascending: true });
  return (data || []).filter(t => t.finish_time); // filter by finish_time, not current_round string
}

export async function updateTeamDifficulty(teamId, difficultyStr) {
  const level = DIFFICULTY_REVERSE_MAP[difficultyStr] || 2;
  const { error } = await supabase.from('teams').update({ difficulty: level }).eq('team_id', teamId);
  return error ? { ok: false, msg: error.message } : { ok: true };
}

export async function updateAllTeamsDifficulty(difficultyStr) {
  const level = DIFFICULTY_REVERSE_MAP[difficultyStr] || 2;
  const { error } = await supabase.from('teams').update({ difficulty: level });
  return error ? { ok: false, msg: error.message } : { ok: true };
}

export async function updateTeamFragments(teamId, f1, f2, f3) {
  const { error } = await supabase.from('teams').update({
    vault_fragment1: f1.toUpperCase(),
    vault_fragment2: f2.toUpperCase(),
    vault_fragment3: f3.toUpperCase(),
  }).eq('team_id', teamId);
  return error ? { ok: false, msg: error.message } : { ok: true };
}

export async function fetchAllTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('team_id, team_name, difficulty, current_round, disqualified, finish_time, elapsed_seconds, vault_fragment1, vault_fragment2, vault_fragment3, final_answer')
    .order('team_id', { ascending: true });
  return { data: data || [], error };
}

// ── CTF Config — store/retrieve CTF answers from a separate table ──────────
// Requires a 'ctf_config' table in Supabase:
// CREATE TABLE ctf_config (key text PRIMARY KEY, value text);
// INSERT INTO ctf_config (key, value) VALUES ('html_flag', 'SHADOW'), ('image_flag', 'NEXUS');

export async function fetchCTFConfig() {
  const { data, error } = await supabase.from('ctf_config').select('*');
  if (error || !data) return { html_flag: 'SHADOW', image_flag: 'NEXUS' };
  const config = {};
  data.forEach(row => { config[row.key] = row.value; });
  return {
    html_flag:   (config.html_flag  || 'SHADOW').toUpperCase(),
    image_flag:  (config.image_flag || 'NEXUS').toUpperCase(),
  };
}

export async function updateCTFConfig(key, value) {
  const { error } = await supabase
    .from('ctf_config')
    .upsert({ key, value: value.toUpperCase() }, { onConflict: 'key' });
  return error ? { ok: false, msg: error.message } : { ok: true };
}

export async function updateTeamFinalAnswer(teamId, finalAnswer) {
  const { error } = await supabase
    .from('teams')
    .update({ final_answer: finalAnswer.toUpperCase() })
    .eq('team_id', teamId);
  return error ? { ok: false, msg: error.message } : { ok: true };
}
