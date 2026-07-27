#!/usr/bin/env node
/**
 * Hotfix Wordle Mini UGC with a layout-safe body + canonical wrapGameHtml.
 *
 * Usage: node --experimental-strip-types scripts/fix-wordle-mini.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { wrapGameHtml } from '../src/lib/gameWrap.ts'
import { smokeGameBody } from '../src/lib/gameSmoke.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')
const SLUG = 'wordle-mini-c353b44b'

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

async function managementFetch(path, token, init = {}) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* ignore */
  }
  return { res, text, json }
}

export const FIXED_BODY = `const WORD_LIST = ["APPLE","BRAVE","CRANE","TIGER","MOUSE","GHOST","PLANT","MARCH","BREAD","CANDY","LEMON","GLASS","PLATE","SHARE","SHEET","CLOUD","TRUCK","BRICK","SHINE","DRIVE","EARTH","QUIET","SNAKE","CLOCK","SHARP"];
let answer = "", phase = "idle", grid = Array(6).fill(0).map(() => Array(5).fill("")), row = 0, col = 0, result = null, hintMsg = "", kbState = {}, layoutRects = {};
const kbRows = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["ENTER", ..."ZXCVBNM".split(""), "DEL"]
];
function emptyGrid(){ return Array(6).fill(0).map(() => Array(5).fill("")) }
function pickWord() {
  answer = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  return answer;
}
function layout() {
  const padX = W * 0.06;
  const top = H * 0.1;
  const bottom = H * 0.96;
  layoutRects.title = { x: padX, y: top, w: W - padX * 2, h: H * 0.055 };
  layoutRects.hint = { x: padX, y: H * 0.58, w: W - padX * 2, h: H * 0.045 };
  layoutRects.kb = { x: padX * 0.7, y: H * 0.64, w: W - padX * 1.4, h: H * 0.3 };
  const gridTop = layoutRects.title.y + layoutRects.title.h + H * 0.02;
  const gridBot = layoutRects.hint.y - H * 0.02;
  const gridH = Math.max(80, gridBot - gridTop);
  const gridW = W - padX * 2;
  const gap = Math.max(5, Math.min(W, H) * 0.012);
  const cell = Math.min((gridW - gap * 4) / 5, (gridH - gap * 5) / 6);
  const usedW = cell * 5 + gap * 4;
  const usedH = cell * 6 + gap * 5;
  const ox = (W - usedW) / 2;
  const oy = gridTop + Math.max(0, (gridH - usedH) / 2);
  layoutRects.grid = { x: ox, y: oy, w: usedW, h: usedH };
  layoutRects.cells = [];
  for (let r = 0; r < 6; ++r) {
    for (let c = 0; c < 5; ++c) {
      layoutRects.cells.push({
        x: ox + c * (cell + gap),
        y: oy + r * (cell + gap),
        w: cell,
        h: cell,
        row: r,
        col: c,
      });
    }
  }
  layoutRects.kbKeys = [];
  let kbY = layoutRects.kb.y;
  const rowGap = Math.max(6, H * 0.008);
  const keyH = (layoutRects.kb.h - 2 * rowGap) / 3;
  for (let i = 0; i < 3; ++i) {
    const keys = kbRows[i];
    const n = keys.length;
    const keyGap = Math.max(4, W * 0.01);
    const keyW = (layoutRects.kb.w - keyGap * (n - 1)) / n;
    let rowX = layoutRects.kb.x;
    if (i === 1) rowX += (keyW + keyGap) * 0.5;
    for (let j = 0; j < n; ++j) {
      layoutRects.kbKeys.push({
        x: rowX + j * (keyW + keyGap),
        y: kbY,
        w: keyW,
        h: keyH,
        label: keys[j],
      });
    }
    kbY += keyH + rowGap;
  }
}
function reset(){
  layout();
  answer = pickWord();
  grid = emptyGrid();
  row = 0; col = 0;
  result = null;
  phase = "play";
  hintMsg = "";
  kbState = {};
  setScore(0);
}
function onHostStart(){ reset(); }
function onResize(){ layout(); }
function die(){ phase = "fail"; result = answer; setScore(0); }
function bumpWin(){ phase = "win"; result = answer; setScore(0); bump(Math.max(1, 7 - row)); }
function letterColor(r, c){
  if (!grid[r]) return "#e0e0e0";
  if (phase === "play" && r > row) return "#e0e0e0";
  if (phase === "play" && r === row) return grid[r][c] ? "#f5f5f5" : "#e0e0e0";
  const ch = grid[r][c];
  if (!ch) return "#e0e0e0";
  if (answer[c] === ch) return "#3ec46d";
  if (answer.includes(ch)) return "#ffd23f";
  return "#bdbdbd";
}
function updateKbState(){
  for (let r = 0; r < row; ++r) {
    for (let c = 0; c < 5; ++c) {
      const ch = grid[r][c];
      if (!ch) continue;
      let state = "grey";
      if (answer[c] === ch) state = "green";
      else if (answer.includes(ch)) state = "yellow";
      if (kbState[ch] === "green") continue;
      if (state === "green" || (state === "yellow" && kbState[ch] !== "green")) kbState[ch] = state;
      else if (!kbState[ch]) kbState[ch] = state;
    }
  }
}
function pointerXY(e){
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}
function hitRect(obj, x, y){
  return x >= obj.x && x <= obj.x + obj.w && y >= obj.y && y <= obj.y + obj.h;
}
canvas.addEventListener("pointerdown", function (e) {
  if (GS.paused) return;
  if (!layoutRects.kbKeys) layout();
  const { x, y } = pointerXY(e);
  if (phase === "play") {
    for (const key of layoutRects.kbKeys) {
      if (!hitRect(key, x, y)) continue;
      const label = key.label;
      if (label === "DEL") {
        if (col > 0) { --col; grid[row][col] = ""; }
      } else if (label === "ENTER") {
        if (col < 5) { hintMsg = "Fill all 5 letters"; break; }
        const guess = grid[row].join("");
        if (guess === answer) {
          ++row;
          updateKbState();
          --row;
          bumpWin();
          break;
        }
        ++row;
        updateKbState();
        col = 0;
        hintMsg = "";
        if (row >= 6) die();
      } else if (col < 5 && /^[A-Z]$/.test(label)) {
        grid[row][col] = label;
        ++col;
      }
      break;
    }
  } else if (phase === "win" || phase === "fail") {
    if (hitRect(layoutRects.grid, x, y)) reset();
  }
});
function tick(dt){ if (GS.paused) return; }
function draw(){
  if (!layoutRects.cells || !layoutRects.kbKeys) layout();
  if (!grid.length) grid = emptyGrid();
  if (typeof PF !== 'undefined' && PF && PF.sky) {
    PF.sky(ctx, W, H, '#fff3e6', '#ffe5ec', '#e0e5ff');
    PF.blobs(ctx, W, H, '#fae29c', 3);
  } else {
    ctx.fillStyle = '#fff3e6';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.font = '700 ' + Math.floor(layoutRects.title.h * 0.82) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#242c3b';
  ctx.fillText('Wordle Mini', W / 2, layoutRects.title.y + layoutRects.title.h * 0.75);
  ctx.restore();
  ctx.save();
  for (let r = 0; r < 6; ++r) {
    for (let c = 0; c < 5; ++c) {
      const cell = layoutRects.cells[r * 5 + c];
      ctx.beginPath();
      if (typeof PF !== 'undefined' && PF && PF.rr) PF.rr(ctx, cell.x, cell.y, cell.w, cell.h, Math.min(cell.w, cell.h) * 0.15);
      else ctx.rect(cell.x, cell.y, cell.w, cell.h);
      ctx.fillStyle = letterColor(r, c);
      ctx.fill();
      const ch = grid[r] && grid[r][c];
      if (ch) {
        ctx.font = '700 ' + Math.floor(cell.h * 0.55) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#242c3b';
        ctx.fillText(ch, cell.x + cell.w / 2, cell.y + cell.h * 0.68);
      }
    }
  }
  ctx.restore();
  ctx.save();
  ctx.font = '400 ' + Math.floor(layoutRects.hint.h * 0.7) + 'px sans-serif';
  ctx.fillStyle = '#e71d36';
  ctx.textAlign = 'center';
  const hint = phase === "win" ? 'You got it! Tap grid to play again'
    : phase === "fail" ? ('Answer: ' + result + ' — tap grid to replay')
    : hintMsg;
  ctx.fillText(hint, W / 2, layoutRects.hint.y + layoutRects.hint.h * 0.75);
  ctx.restore();
  ctx.save();
  for (const key of layoutRects.kbKeys) {
    ctx.beginPath();
    if (typeof PF !== 'undefined' && PF && PF.rr) PF.rr(ctx, key.x, key.y, key.w, key.h, Math.min(key.w, key.h) * 0.22);
    else ctx.rect(key.x, key.y, key.w, key.h);
    let bg = '#e0e0e0', fg = '#242c3b';
    if (key.label === "ENTER" || key.label === "DEL") { bg = "#29c7fa"; fg = "#fff"; }
    if (/^[A-Z]$/.test(key.label) && kbState[key.label]) {
      if (kbState[key.label] === "green") bg = "#3ec46d";
      else if (kbState[key.label] === "yellow") bg = "#ffd23f";
      else bg = "#bdbdbd";
      fg = "#fff";
    }
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.font = '700 ' + Math.floor(key.h * 0.42) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = fg;
    ctx.fillText(key.label, key.x + key.w / 2, key.y + key.h * 0.66);
  }
  ctx.restore();
}
`

if (!existsSync(envPath)) {
  console.error('Missing .env.local')
  process.exit(1)
}

const smoke = smokeGameBody(FIXED_BODY)
if (!smoke.ok) {
  console.error('Fixed body failed smoke:', smoke.errors)
  process.exit(1)
}
console.log('[fix-wordle] smoke OK')

const env = parseEnv(readFileSync(envPath, 'utf8'))
const projectRef = env.SUPABASE_PROJECT_REF
const accessToken = env.SUPABASE_ACCESS_TOKEN
if (!projectRef || !accessToken) {
  console.error('Need SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

const { res: keysRes, json: keysJson, text: keysText } = await managementFetch(
  `/projects/${projectRef}/api-keys`,
  accessToken,
)
if (!keysRes.ok) throw new Error(`api-keys failed: ${keysText.slice(0, 400)}`)
const list = Array.isArray(keysJson) ? keysJson : keysJson?.api_keys || []
const serviceKey =
  list.find((k) => k.name === 'service_role')?.api_key ||
  list.find((k) => String(k.name).toLowerCase().includes('service'))?.api_key
if (!serviceKey) throw new Error('No service_role key')

const supabaseUrl = env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`
const admin = createClient(supabaseUrl, serviceKey)

const { data: row, error } = await admin
  .from('ugc_games')
  .select('id, slug, title, tip, accent, html_path, brief, status')
  .eq('slug', SLUG)
  .maybeSingle()
if (error || !row) throw new Error(error?.message || 'Wordle row not found')

const brief = {
  ...(row.brief || {}),
  bodyJs: FIXED_BODY,
  bg: (row.brief && row.brief.bg) || '#264653',
}
const html = wrapGameHtml({
  title: row.title,
  bg: brief.bg,
  body: FIXED_BODY,
  accent: row.accent || '#e9c46a',
  libBase: 'https://play.thehappylab.com',
})

const { error: upErr } = await admin.storage
  .from('ugc-games')
  .upload(row.html_path, new Blob([html], { type: 'text/html;charset=utf-8' }), {
    upsert: true,
    contentType: 'text/html;charset=utf-8',
  })
if (upErr) throw new Error(`upload failed: ${upErr.message}`)

const { error: updErr } = await admin
  .from('ugc_games')
  .update({
    brief,
    html_url: `${supabaseUrl}/functions/v1/ugc-play?slug=${encodeURIComponent(SLUG)}`,
    updated_at: new Date().toISOString(),
  })
  .eq('id', row.id)
if (updErr) throw new Error(`update failed: ${updErr.message}`)

console.log(`[fix-wordle] Updated ${SLUG} — hard-refresh the feed`)
