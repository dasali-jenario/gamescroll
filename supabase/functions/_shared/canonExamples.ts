/**
 * Compact, complete bodyJs examples for the creator system prompt.
 * Patterns: reaction button, timing tap-anywhere, drag catcher.
 */

export const JUICE_RULES = `
FEEL / EFFECTS (Juice + PF are already loaded by the host):
- The host owns the effects lifecycle: never call Juice.init, Juice.resize, or Juice.update.
- bump() already fires Juice.onScore, and die() already fires Juice.onDie. Never call Juice.onScore/onDie yourself — it double-triggers shake and floating score.
- To place those effects, optionally define scorePos() and diePos() returning [x, y] in canvas coords (e.g. the player or the hit target).
- Juice.shake(intensity) is the only effect to call directly, and only for rare beats (0.3–0.6 small, ~1.0 big). Do not shake every frame or every tap.
- Do not hand-roll particle systems or DOM effect elements. Use PF drawing helpers instead:
  PF.sky(ctx,W,H,c0,c1,c2) background gradient · PF.dots(ctx,W,H,color,n,speed) drifting specks
  PF.blobs(ctx,W,H,color,n) soft shapes · PF.soft(ctx,x,y,r,c0,c1) glossy ball
  PF.buddy(ctx,x,y,r,c0,c1,{lookX,lookY,squash,stretch,blush}) cute character
  PF.block(ctx,x,y,w,h,c0,c1,radius) rounded block · PF.rr(ctx,x,y,w,h,r) rounded-rect path
- PF.t is a shared animation clock advanced by the host loop — read it, never assign it.
- Aim for a feed-native look: gradient sky + a couple of PF layers beats flat fillRect walls of colour.
`

export const ANTI_PATTERNS = `
ANTI-PATTERNS — these have shipped broken games before. Never do them:
- A "START" screen that waits for an HTML button or a DOM click listener that the host never sends. Use onHostStart() + canvas hit-testing.
- Hard-coded pixel layout (x=40, y=80, 1920x1080) instead of fractions of W/H inside layout().
- Everything crammed near the top (y < 0.12*H) where the host score HUD sits, or a CTA drawn under the thumb bar (y > 0.9*H).
- Drawing your own big score number — the host HUD already shows score.
- Using e.clientX/e.clientY straight as canvas coords without getBoundingClientRect mapping.
- Core gameplay driven only by setTimeout/setInterval instead of state advanced in tick(dt).
- tick(dt) that keeps simulating while GS.paused, or draw() that paints nothing until the game starts.
- Labels drawn on top of other labels/buttons because layout() reserved no space for them.
- Tiny tap targets (< 48px) or controls requiring two fingers / precise corner taps.
- Calling Juice.onScore/onDie/update manually, or reassigning PF.t.
- Rewriting the whole game when the user asked for one small tweak.
`

const EXAMPLE_REACTION = `--- CANON EXAMPLE: reaction button (tap CTA in lower third) ---
let phase='idle', waitLeft=0, reactAt=0, lastMs=0
const btn={x:0,y:0,w:0,h:0}, titleY=0, focusY=0
function layout(){
  btn.w=Math.min(300,Math.max(200,W*0.72)); btn.h=Math.max(56,Math.min(72,H*0.08))
  btn.x=(W-btn.w)/2; btn.y=H*0.74
  titleY=H*0.18; focusY=H*0.42
}
function reset(){ phase='idle'; waitLeft=0; setScore(0); layout() }
function die(){ phase='foul'; waitLeft=0.9 }
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
  if(phase==='go'){ lastMs=Math.max(1,Math.round(performance.now()-reactAt)); setScore(lastMs); phase='result'; waitLeft=1.4; return }
  if((phase==='result'||phase==='foul')&&hitBtn(x,y)) reset()
})
function tick(dt){
  if(GS.paused) return
  if(phase==='waiting'){ waitLeft-=dt; if(waitLeft<=0){ phase='go'; reactAt=performance.now() } }
  else if(phase==='result'||phase==='foul'){ waitLeft-=dt; if(waitLeft<=0) reset() }
}
function draw(){
  ctx.fillStyle='#1b1f3b'; ctx.fillRect(0,0,W,H)
  ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(W*0.06)+'px sans-serif'; ctx.textAlign='center'
  ctx.fillText('REACT',W/2,titleY)
  ctx.beginPath(); ctx.arc(W/2,focusY,Math.min(W,H)*0.12,0,Math.PI*2)
  ctx.fillStyle=phase==='go'?'#2ec4b6':phase==='waiting'?'#ff9f1c':'#e71d36'; ctx.fill()
  ctx.fillStyle='#264653'; ctx.fillRect(btn.x,btn.y,btn.w,btn.h)
  ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(btn.h*0.45)+'px sans-serif'
  const label=phase==='idle'?'START':phase==='waiting'?'WAIT':phase==='go'?'TAP!':phase==='foul'?'TOO EARLY':'AGAIN'
  ctx.fillText(label,W/2,btn.y+btn.h*0.68)
}`

const EXAMPLE_TIMING = `--- CANON EXAMPLE: timing tap-anywhere (focal ring in center band) ---
let rings=[], spawn=0, flash=0
const play={cx:0,cy:0,target:36}
function layout(){ play.cx=W*0.5; play.cy=H*0.42; play.target=Math.min(W,H)*0.045 }
function reset(){ rings=[]; spawn=0.25; flash=0; setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown',()=>{
  if(GS.paused||!rings.length) return
  const r=rings[0]
  if(Math.abs(r.r-play.target)<play.target*0.5){ rings.shift(); bump(); flash=0.15 }
  else die()
})
function tick(dt){
  if(GS.paused) return
  flash=Math.max(0,flash-dt); spawn-=dt
  if(spawn<=0){ rings.push({r:Math.max(W,H)*0.5}); spawn=1.2 }
  for(const r of rings) r.r-=110*dt
  rings=rings.filter(r=>{ if(r.r<play.target*0.6){ die(); return false } return true })
}
function draw(){
  ctx.fillStyle='#231942'; ctx.fillRect(0,0,W,H)
  ctx.strokeStyle='#c8b6ff'; ctx.lineWidth=3
  for(const r of rings){ ctx.beginPath(); ctx.arc(play.cx,play.cy,r.r,0,Math.PI*2); ctx.stroke() }
  ctx.beginPath(); ctx.arc(play.cx,play.cy,play.target,0,Math.PI*2)
  ctx.fillStyle=flash>0?'#ffd6ff':'#9f86c0'; ctx.fill()
}`

const EXAMPLE_DRAG = `--- CANON EXAMPLE: drag catcher (mapped pointer; player in lower band) ---
let bx=0, items=[], spawn=0
const player={y:0,r:0}, tipY=0
function layout(){
  player.y=H*0.82; player.r=Math.max(22,Math.min(34,W*0.07))
  tipY=H*0.16; bx=W*0.5
}
function reset(){ items=[]; spawn=0.2; setScore(0); layout() }
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
  spawn-=dt
  if(spawn<=0){
    items.push({x:40+Math.random()*(W-80),y:H*0.22,good:Math.random()<0.65,v:160+Math.random()*90})
    spawn=0.45
  }
  for(const it of items) it.y+=it.v*dt
  items=items.filter(it=>{
    if(it.y>player.y-player.r&&Math.abs(it.x-bx)<player.r+12){
      if(it.good) bump(); else die(); return false
    }
    return it.y<H+40
  })
}
function draw(){
  ctx.fillStyle='#240046'; ctx.fillRect(0,0,W,H)
  ctx.fillStyle='#e0aaff'; ctx.font='600 '+Math.floor(W*0.045)+'px sans-serif'; ctx.textAlign='center'
  ctx.fillText('Catch green',W/2,tipY)
  for(const it of items){
    ctx.beginPath(); ctx.arc(it.x,it.y,13,0,Math.PI*2)
    ctx.fillStyle=it.good?'#38b000':'#ef476f'; ctx.fill()
  }
  ctx.beginPath(); ctx.arc(bx,player.y,player.r,0,Math.PI*2)
  ctx.fillStyle='#9d4edd'; ctx.fill()
}`

/** One matching example per generate — keeps the system prompt small and avoids 504s. */
export function canonExampleFor(family: string): string {
  switch (family) {
    case 'timing':
      return EXAMPLE_TIMING
    case 'drag':
    case 'dodge':
      return EXAMPLE_DRAG
    case 'stack':
    case 'reaction':
    default:
      return EXAMPLE_REACTION
  }
}
