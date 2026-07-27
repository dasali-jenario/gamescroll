/**
 * Compact, complete bodyJs examples for the creator system prompt.
 * Mirror official catalog style from scripts/generate-games.mjs:
 * PF drawing, scorePos/diePos, layout from W/H, host contract.
 */

export const OFFICIAL_STRUCTURE = `
OFFICIAL GAME BODY STRUCTURE (same contract as catalog games in generate-games.mjs):
Every bodyJs is plain HTML5 canvas JavaScript injected into the shared shell (canvas #c, ctx, W, H, GS, Juice, PF, setScore, bump, die wrapper). Match this shape:

1. State vars at top (let/const). Prefer relative sizes from W/H — never hard-code desktop resolutions.
2. Optional scorePos() / diePos() → [x,y] so Juice floaters land on the player/hit (almost always define both).
3. layout() — compute all rects/radii from W/H (safe bands). Call from reset, onHostStart, onResize.
4. reset() — clear entities, setScore(0), layout(). Idle state must be drawable before start.
5. onHostStart() { reset() } — host posts gamescroll:start; do not invent a separate HTML Start screen.
6. onResize() { layout() } (or reset when live play needs a full rebuild).
7. die() { reset() } — host may auto-replay or show game-over; never post bridge messages yourself.
8. tick(dt) — early-return if GS.paused; advance gameplay with dt (seconds). Core logic in tick, not only setTimeout.
9. draw() — ALWAYS paint (even while paused) using PF helpers for a feed-native look:
   PF.sky(ctx,W,H,c0,c1,c2) then PF.blobs / PF.dots, then PF.buddy / PF.block / PF.soft / PF.spike / PF.rr.
   Flat fillRect-only walls of colour are not catalog quality.
10. Pointer: canvas or window addEventListener('pointerdown'|…). Map coords with getBoundingClientRect when using clientX/Y.
11. End of body: call layout() (or reset()) so browse-preview draw works before onHostStart.
12. Light juice: squash/stretch or PF.bob on characters; optional Juice.shake(0.3–1) on rare big beats only.
13. No second score HUD — host #score shows score. Scoring via bump()/setScore() only.
14. No DOM controls, fetch, storage, Workers, eval, import().
`

export const JUICE_RULES = `
FEEL / EFFECTS (Juice + PF are already loaded by the host — same as official games):
- The host owns the effects lifecycle: never call Juice.init, Juice.resize, or Juice.update.
- bump() already fires Juice.onScore, and die() already fires Juice.onDie. Never call Juice.onScore/onDie yourself — it double-triggers shake and floating score.
- Always define scorePos() and diePos() returning [x, y] in canvas coords (player or hit target).
- Juice.shake(intensity) is the only effect to call directly, and only for rare beats (0.3–0.6 small, ~1.0 big). Do not shake every frame or every tap.
- Do not hand-roll particle systems or DOM effect elements. Use PF drawing helpers instead:
  PF.sky(ctx,W,H,c0,c1,c2) background gradient · PF.dots(ctx,W,H,color,n,speed) drifting specks
  PF.blobs(ctx,W,H,color,n) soft shapes · PF.soft(ctx,x,y,r,c0,c1) glossy ball
  PF.buddy(ctx,x,y,r,c0,c1,{lookX,lookY,squash,stretch,blush}) cute character
  PF.block(ctx,x,y,w,h,c0,c1,radius) rounded block · PF.rr(ctx,x,y,w,h,r) rounded-rect path
  PF.spike(ctx,x,y,dir,color) · PF.bob(amp,speed,phase) for idle motion
- PF.t is a shared animation clock advanced by the host loop — read it, never assign it.
- Aim for catalog quality: gradient sky + PF layers + a character/block — not flat fillRect walls.
`

export const ANTI_PATTERNS = `
ANTI-PATTERNS — these have shipped broken or low-quality games before. Never do them:
- A "START" screen that waits for an HTML button or a DOM click listener that the host never sends. Use onHostStart() + canvas hit-testing.
- Hard-coded pixel layout (x=40, y=80, 1920x1080) instead of fractions of W/H inside layout().
- Everything crammed near the top (y < 0.12*H) where the host score HUD sits, or a CTA drawn under the thumb bar (y > 0.9*H).
- Drawing your own big score number — the host HUD already shows score.
- Using e.clientX/e.clientY straight as canvas coords without getBoundingClientRect mapping.
- Core gameplay driven only by setTimeout/setInterval instead of state advanced in tick(dt).
- tick(dt) that keeps simulating while GS.paused, or draw() that paints nothing until the game starts / throws before layout.
- Labels drawn on top of other labels/buttons because layout() reserved no space for them.
- Tiny tap targets (< 48px) or controls requiring two fingers / precise corner taps.
- Calling Juice.onScore/onDie/update manually, or reassigning PF.t.
- Flat fillRect backgrounds with no PF.sky / PF.blobs / PF.dots — looks unfinished vs official games.
- Rewriting the whole game when the user asked for one small tweak.
`

const EXAMPLE_REACTION = `--- CANON EXAMPLE: reaction button (official PF style; CTA lower third) ---
let phase='idle', waitLeft=0, reactAt=0, lastMs=0, flash=0
const btn={x:0,y:0,w:0,h:0}, titleY=0, focusY=0, focusR=0
function scorePos(){ return [W*0.5, focusY] }
function diePos(){ return [W*0.5, focusY] }
function layout(){
  btn.w=Math.min(300,Math.max(200,W*0.72)); btn.h=Math.max(56,Math.min(72,H*0.08))
  btn.x=(W-btn.w)/2; btn.y=H*0.74
  titleY=H*0.18; focusY=H*0.42; focusR=Math.min(W,H)*0.12
}
function reset(){ phase='idle'; waitLeft=0; flash=0; setScore(0); layout() }
function die(){ phase='foul'; waitLeft=0.9; if(window.Juice) Juice.shake(0.45) }
function hitBtn(x,y){ return x>=btn.x&&x<=btn.x+btn.w&&y>=btn.y&&y<=btn.y+btn.h }
function pointerXY(e){
  const r=canvas.getBoundingClientRect()
  return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) }
}
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown',(e)=>{
  if(GS.paused) return
  const {x,y}=pointerXY(e)
  if(phase==='idle'&&hitBtn(x,y)){ phase='waiting'; waitLeft=1+Math.random()*2; return }
  if(phase==='waiting'){ die(); return }
  if(phase==='go'){ lastMs=Math.max(1,Math.round(performance.now()-reactAt)); setScore(lastMs); phase='result'; waitLeft=1.4; flash=0.2; return }
  if((phase==='result'||phase==='foul')&&hitBtn(x,y)) reset()
})
function tick(dt){
  if(GS.paused) return
  flash=Math.max(0,flash-dt)
  if(phase==='waiting'){ waitLeft-=dt; if(waitLeft<=0){ phase='go'; reactAt=performance.now() } }
  else if(phase==='result'||phase==='foul'){ waitLeft-=dt; if(waitLeft<=0) reset() }
}
function draw(){
  PF.sky(ctx,W,H,'#1b1f3b','#2d3561','#4a5180')
  PF.blobs(ctx,W,H,'#3d4570',5)
  PF.dots(ctx,W,H,'#c8d0ff',14,0.7)
  ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(W*0.06)+'px sans-serif'; ctx.textAlign='center'
  ctx.fillText('REACT',W/2,titleY)
  const pulse=phase==='go'?1+Math.sin(PF.t*18)*0.08:1
  const c0=phase==='go'?'#2ec4b6':phase==='waiting'?'#ff9f1c':'#e71d36'
  const c1=phase==='go'?'#20a4a0':phase==='waiting'?'#f4a261':'#c1121f'
  PF.soft(ctx,W/2,focusY,focusR*pulse*(flash>0?1.12:1),c0,c1)
  PF.block(ctx,btn.x,btn.y,btn.w,btn.h,'#264653','#1d3557',14)
  ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(btn.h*0.45)+'px sans-serif'
  const label=phase==='idle'?'START':phase==='waiting'?'WAIT':phase==='go'?'TAP!':phase==='foul'?'TOO EARLY':'AGAIN'
  ctx.fillText(label,W/2,btn.y+btn.h*0.68)
}
layout()
`

const EXAMPLE_TIMING = `--- CANON EXAMPLE: timing tap-anywhere (focal ring; official PF style) ---
let rings=[], spawn=0, flash=0, squash=1
const play={cx:0,cy:0,target:36}
function scorePos(){ return [play.cx, play.cy] }
function diePos(){ return [play.cx, play.cy] }
function layout(){ play.cx=W*0.5; play.cy=H*0.42; play.target=Math.min(W,H)*0.045 }
function reset(){ rings=[]; spawn=0.25; flash=0; squash=1; setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown',()=>{
  if(GS.paused||!rings.length) return
  const r=rings[0]
  if(Math.abs(r.r-play.target)<play.target*0.5){ rings.shift(); bump(); flash=0.15; squash=1.25 }
  else die()
})
function tick(dt){
  if(GS.paused) return
  flash=Math.max(0,flash-dt); spawn-=dt
  squash+=(1-squash)*Math.min(1,dt*10)
  if(spawn<=0){ rings.push({r:Math.max(W,H)*0.5}); spawn=1.2 }
  for(const r of rings) r.r-=110*dt
  rings=rings.filter(r=>{ if(r.r<play.target*0.6){ die(); return false } return true })
}
function draw(){
  PF.sky(ctx,W,H,'#231942','#3c096c','#5a189a')
  PF.blobs(ctx,W,H,'#7b2cbf',4)
  PF.dots(ctx,W,H,'#e0aaff',16,0.8)
  ctx.strokeStyle='#c8b6ff'; ctx.lineWidth=3
  for(const r of rings){ ctx.beginPath(); ctx.arc(play.cx,play.cy,r.r,0,Math.PI*2); ctx.stroke() }
  PF.soft(ctx,play.cx,play.cy,play.target*squash*(flash>0?1.15:1), flash>0?'#ffd6ff':'#9f86c0', '#5a189a')
}
layout()
`

const EXAMPLE_DRAG = `--- CANON EXAMPLE: drag catcher (mapped pointer; PF buddy; lower band) ---
let bx=0, items=[], spawn=0, squash=1, stretch=1
const player={y:0,r:0}, tipY=0
function scorePos(){ return [bx, player.y] }
function diePos(){ return [bx, player.y] }
function layout(){
  player.y=H*0.82; player.r=Math.max(22,Math.min(34,W*0.07))
  tipY=H*0.16; bx=W*0.5
}
function reset(){ items=[]; spawn=0.2; squash=1; stretch=1; setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
function pointerXY(e){
  const r=canvas.getBoundingClientRect()
  return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) }
}
function moveTo(e){ if(GS.paused) return; bx=Math.max(player.r,Math.min(W-player.r,pointerXY(e).x)) }
canvas.addEventListener('pointerdown',moveTo)
canvas.addEventListener('pointermove',(e)=>{ if(e.buttons) moveTo(e) })
function tick(dt){
  if(GS.paused) return
  squash+=(1-squash)*Math.min(1,dt*10)
  stretch+=(1-stretch)*Math.min(1,dt*10)
  spawn-=dt
  if(spawn<=0){
    items.push({x:40+Math.random()*(W-80),y:H*0.22,good:Math.random()<0.65,v:160+Math.random()*90})
    spawn=0.45
  }
  for(const it of items) it.y+=it.v*dt
  items=items.filter(it=>{
    if(it.y>player.y-player.r&&Math.abs(it.x-bx)<player.r+12){
      if(it.good){ bump(); squash=1.3; stretch=0.75 } else die()
      return false
    }
    return it.y<H+40
  })
}
function draw(){
  PF.sky(ctx,W,H,'#240046','#3c096c','#5a189a')
  PF.blobs(ctx,W,H,'#7b2cbf',5)
  PF.dots(ctx,W,H,'#e0aaff',16,0.7)
  ctx.fillStyle='#e0aaff'; ctx.font='600 '+Math.floor(W*0.045)+'px sans-serif'; ctx.textAlign='center'
  ctx.fillText('Catch green',W/2,tipY)
  for(const it of items){
    PF.soft(ctx,it.x,it.y,13, it.good?'#38b000':'#ef476f', it.good?'#208b3a':'#c1121f')
  }
  const bob=typeof PF.bob==='function'?PF.bob(3,5,0):0
  PF.buddy(ctx,bx,player.y+bob,player.r,'#9d4edd','#7b2cbf',{ lookY:-0.3, squash, stretch, blush:true })
}
layout()
`

const EXAMPLE_DODGE = `--- CANON EXAMPLE: dodge lanes (tap sides; PF buddy + blocks) ---
const LANES=[0.25,0.5,0.75]
let lane=1, hazards=[], spawn=0, squash=1, stretch=1
function laneX(){ return W*LANES[lane] }
function scorePos(){ return [laneX(), H*0.78] }
function diePos(){ return [laneX(), H*0.78] }
function layout(){ /* sizes from W/H in draw/tick */ }
function reset(){ lane=1; hazards=[]; spawn=0.5; squash=1; stretch=1; setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
function pointerXY(e){
  const r=canvas.getBoundingClientRect()
  return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) }
}
canvas.addEventListener('pointerdown',(e)=>{
  if(GS.paused) return
  const {x}=pointerXY(e)
  if(x<W*0.5) lane=Math.max(0,lane-1)
  else lane=Math.min(2,lane+1)
})
function tick(dt){
  if(GS.paused) return
  squash+=(1-squash)*Math.min(1,dt*10)
  stretch+=(1-stretch)*Math.min(1,dt*10)
  spawn-=dt
  if(spawn<=0){
    hazards.push({ lane:Math.floor(Math.random()*3), y:-60, h:56 })
    spawn=0.7+Math.random()*0.35
  }
  const py=H*0.78
  for(const b of hazards) b.y+=220*dt
  hazards=hazards.filter(b=>{
    if(b.y>H+80){ bump(); return false }
    if(b.lane===lane && b.y+b.h>py-18 && b.y<py+18){ die(); return false }
    return true
  })
}
function draw(){
  PF.sky(ctx,W,H,'#0d1b2a','#1d3557','#457b9d')
  PF.blobs(ctx,W,H,'#457b9d',5)
  PF.dots(ctx,W,H,'#a8dadc',16,0.8)
  for(const b of hazards){
    PF.block(ctx,W*LANES[b.lane]-28,b.y,56,b.h,'#ff8fa3','#e63946',12)
  }
  const bob=typeof PF.bob==='function'?PF.bob(4,5,0):0
  PF.buddy(ctx,laneX(),H*0.78+bob,20,'#a8dadc','#48cae4',{ lookY:-0.3, squash, stretch, blush:true })
}
layout()
`

const EXAMPLE_STACK = `--- CANON EXAMPLE: stack place (tap to drop; PF blocks) ---
let stack=[], cur=null, dir=1, speed=140
function scorePos(){ return cur?[cur.x,cur.y]:[W*0.5,H*0.5] }
function diePos(){ return scorePos() }
function layout(){
  if(!stack.length){
    stack=[{ x:W*0.5, y:H*0.78, w:Math.min(160,W*0.42) }]
  }
  if(!cur){
    const top=stack[stack.length-1]
    cur={ x:W*0.15, y:top.y-36, w:top.w }
    dir=1
  }
}
function reset(){ stack=[]; cur=null; speed=140; setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown',()=>{
  if(GS.paused||!cur) return
  const top=stack[stack.length-1]
  const overlap=Math.max(0, Math.min(cur.x+cur.w*0.5, top.x+top.w*0.5) - Math.max(cur.x-cur.w*0.5, top.x-top.w*0.5))
  if(overlap<18){ die(); return }
  cur.w=overlap
  cur.x=(Math.max(cur.x-cur.w*0.5, top.x-top.w*0.5)+Math.min(cur.x+cur.w*0.5, top.x+top.w*0.5))*0.5
  cur.y=top.y-32
  stack.push(cur)
  bump()
  speed=Math.min(260, speed+8)
  cur={ x:dir>0?W*0.12:W*0.88, y:cur.y-36, w:cur.w }
})
function tick(dt){
  if(GS.paused||!cur) return
  cur.x+=dir*speed*dt
  if(cur.x<cur.w*0.5){ cur.x=cur.w*0.5; dir=1 }
  if(cur.x>W-cur.w*0.5){ cur.x=W-cur.w*0.5; dir=-1 }
}
function draw(){
  PF.sky(ctx,W,H,'#3d1f14','#7b2d26','#e09f3e')
  PF.blobs(ctx,W,H,'#e09f3e',4)
  PF.dots(ctx,W,H,'#ffe8a3',14,0.6)
  for(const p of stack){
    PF.block(ctx,p.x-p.w*0.5,p.y,p.w,28,'#ffe066','#f4d35e',8)
  }
  if(cur) PF.block(ctx,cur.x-cur.w*0.5,cur.y,cur.w,28,'#ffffff','#e9ecef',8)
}
layout()
`

/** One matching example per generate — keeps the system prompt small and avoids 504s. */
export function canonExampleFor(family: string): string {
  switch (family) {
    case 'timing':
      return EXAMPLE_TIMING
    case 'drag':
      return EXAMPLE_DRAG
    case 'dodge':
      return EXAMPLE_DODGE
    case 'stack':
      return EXAMPLE_STACK
    case 'reaction':
    default:
      return EXAMPLE_REACTION
  }
}
