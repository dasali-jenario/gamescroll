/**
 * Golden playable scaffolds per mechanic family.
 * Arcade first builds clone these; custom freeform uses genericChrome instead.
 * Deno copy: supabase/functions/_shared/mechanicScaffolds.ts
 */
import type { LayoutRect } from './layoutPlan'
import type { MechanicFamily } from './mechanics'
import {
  DEFAULT_PORTRAIT_CHROME,
  freeformChromeSeedSection,
} from './genericChrome'

export type ScaffoldSlots = Record<string, string | number>

export type MechanicScaffold = {
  family: ArcadeFamily
  layoutPlan: LayoutRect[]
  defaultSlots: ScaffoldSlots
  bodyJs: string
  slotGuide: string
}

/** Families with a locked golden body. Everything else is freeform custom. */
export type ArcadeFamily = Exclude<MechanicFamily, 'custom'>

export const ARCADE_FAMILIES: readonly ArcadeFamily[] = [
  'reaction',
  'timing',
  'dodge',
  'drag',
  'stack',
  'merge',
  'sort',
  'grid',
  'word',
] as const

export function hasArcadeScaffold(
  family: MechanicFamily | string | undefined,
): family is ArcadeFamily {
  return ARCADE_FAMILIES.includes(family as ArcadeFamily)
}

function planJson(plan: LayoutRect[]): string {
  return JSON.stringify(plan)
}

function slotsJson(slots: ScaffoldSlots): string {
  return JSON.stringify(slots)
}

const REACTION_PLAN: LayoutRect[] = [
  { id: 'title', x: 0.1, y: 0.14, w: 0.8, h: 0.06, band: 'title' },
  { id: 'focus', x: 0.25, y: 0.32, w: 0.5, h: 0.22, band: 'focal' },
  { id: 'start', x: 0.15, y: 0.72, w: 0.7, h: 0.08, band: 'cta' },
]

const TIMING_PLAN: LayoutRect[] = [
  { id: 'title', x: 0.1, y: 0.14, w: 0.8, h: 0.06, band: 'title' },
  { id: 'focus', x: 0.2, y: 0.3, w: 0.6, h: 0.28, band: 'focal' },
  { id: 'hint', x: 0.1, y: 0.64, w: 0.8, h: 0.05, band: 'hint' },
]

const DODGE_PLAN: LayoutRect[] = [
  { id: 'title', x: 0.1, y: 0.14, w: 0.8, h: 0.05, band: 'title' },
  { id: 'focus', x: 0.1, y: 0.28, w: 0.8, h: 0.4, band: 'focal' },
  { id: 'player', x: 0.35, y: 0.74, w: 0.3, h: 0.08, band: 'cta' },
]

const DRAG_PLAN: LayoutRect[] = [
  { id: 'title', x: 0.1, y: 0.14, w: 0.8, h: 0.05, band: 'title' },
  { id: 'focus', x: 0.1, y: 0.26, w: 0.8, h: 0.4, band: 'focal' },
  { id: 'catcher', x: 0.3, y: 0.76, w: 0.4, h: 0.08, band: 'cta' },
]

const STACK_PLAN: LayoutRect[] = [
  { id: 'title', x: 0.1, y: 0.14, w: 0.8, h: 0.05, band: 'title' },
  { id: 'focus', x: 0.15, y: 0.28, w: 0.7, h: 0.42, band: 'focal' },
  { id: 'base', x: 0.2, y: 0.74, w: 0.6, h: 0.08, band: 'cta' },
]

const MERGE_PLAN: LayoutRect[] = [
  { id: 'drop', x: 0.06, y: 0.095, w: 0.56, h: 0.05, band: 'other' },
  { id: 'next', x: 0.72, y: 0.095, w: 0.22, h: 0.05, band: 'hud' },
  { id: 'jar', x: 0.07, y: 0.17, w: 0.86, h: 0.73, band: 'focal' },
]

const SORT_PLAN: LayoutRect[] = [
  { id: 'board', x: 0.04, y: 0.14, w: 0.92, h: 0.6, band: 'focal' },
  { id: 'give', x: 0.29, y: 0.8, w: 0.42, h: 0.06, band: 'cta' },
]

const GRID_PLAN: LayoutRect[] = [
  { id: 'board', x: 0.06, y: 0.16, w: 0.88, h: 0.52, band: 'focal' },
  { id: 'status', x: 0.1, y: 0.72, w: 0.8, h: 0.05, band: 'hint' },
]

const WORD_PLAN: LayoutRect[] = [
  { id: 'title', x: 0.05, y: 0.09, w: 0.9, h: 0.04, band: 'title' },
  { id: 'grid', x: 0.09, y: 0.145, w: 0.82, h: 0.4, band: 'focal' },
  { id: 'hint', x: 0.05, y: 0.56, w: 0.9, h: 0.04, band: 'hint' },
  { id: 'kb', x: 0.05, y: 0.615, w: 0.9, h: 0.325, band: 'cta' },
]

const REACTION_SLOTS: ScaffoldSlots = {
  titleText: 'REACT',
  ctaIdle: 'START',
  ctaWait: 'WAIT',
  ctaGo: 'TAP!',
  ctaFoul: 'TOO EARLY',
  ctaAgain: 'AGAIN',
  sky0: '#0a0c10',
  sky1: '#12161e',
  sky2: '#1a2030',
  blob: '#1e2430',
  dot: '#c8d0ff',
  btn0: '#2a3140',
  btn1: '#3d4658',
  lampRed: '#e10600',
  lampGo: '#00c853',
  waitMin: 0.4,
  waitSpan: 2.6,
}

/** Race-lights style reaction: 5-lamp sequence → random hold → GO tap (ms score). */
function reactionBody(): string {
  return `
const LAYOUT_PLAN = ${planJson(REACTION_PLAN)}
const SLOTS = ${slotsJson(REACTION_SLOTS)}
let L={}, phase='idle', seqLit=0, seqTimer=0, waitLeft=0, reactAt=0, lastMs=0, bestMs=0, flash=0
function layoutRects(){ return L }
function scorePos(){ const f=L.focus||{x:0,y:0,w:W,h:H}; return [f.x+f.w/2, f.y+f.h/2] }
function diePos(){ return scorePos() }
function layout(){ L = GS.layoutFromPlan(LAYOUT_PLAN, W, H) }
function reset(){ phase='idle'; seqLit=0; seqTimer=0; waitLeft=0; lastMs=0; flash=0; setScore(0); layout() }
function onHostStart(){ bestMs=0; reset() }
function onResize(){ layout() }
function die(){ phase='foul'; waitLeft=1.3 }
function hit(id,x,y){ const r=L[id]; return r && x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h }
function pointerXY(e){ const r=canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) } }
canvas.addEventListener('pointerdown',(e)=>{
  if(GS.paused) return
  const {x,y}=pointerXY(e)
  if(phase==='idle'&&hit('start',x,y)){ phase='sequence'; seqLit=1; seqTimer=0.8; return }
  if(phase==='sequence'||phase==='waiting'){ die(); return }
  if(phase==='go'){
    lastMs=Math.max(1,Math.round(performance.now()-reactAt))
    if(!bestMs||lastMs<bestMs) bestMs=lastMs
    setScore(lastMs)
    flash=0.25
    if(typeof Juice!=='undefined'&&Juice.burst) Juice.burst(x,y)
    phase='result'
    return
  }
  if((phase==='result'||phase==='foul')&&hit('start',x,y)) reset()
})
function tick(dt){
  if(GS.paused) return
  flash=Math.max(0,flash-dt)
  if(phase==='sequence'){
    seqTimer-=dt
    if(seqTimer<=0){
      if(seqLit<5){ seqLit+=1; seqTimer=0.8 }
      if(seqLit>=5){ phase='waiting'; waitLeft=Number(SLOTS.waitMin)+Math.random()*Number(SLOTS.waitSpan) }
    }
  } else if(phase==='waiting'){
    waitLeft-=dt
    if(waitLeft<=0){ phase='go'; reactAt=performance.now() }
  } else if(phase==='foul'){
    waitLeft-=dt
    if(waitLeft<=0) reset()
  }
}
function drawLamp(cx,cy,r,on,color,off){
  ctx.beginPath(); ctx.arc(cx,cy,r*1.16,0,Math.PI*2); ctx.fillStyle='#0a0b0e'; ctx.fill()
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=on?color:off; ctx.fill()
  if(on){
    ctx.beginPath(); ctx.arc(cx-r*0.2,cy-r*0.22,r*0.4,0,Math.PI*2)
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fill()
  } else {
    ctx.beginPath(); ctx.arc(cx+r*0.1,cy+r*0.12,r*0.68,0,Math.PI*2)
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fill()
  }
}
function draw(){
  if(!L.start) layout()
  PF.sky(ctx,W,H,String(SLOTS.sky0),String(SLOTS.sky1),String(SLOTS.sky2))
  PF.blobs(ctx,W,H,String(SLOTS.blob),4)
  PF.dots(ctx,W,H,String(SLOTS.dot),14,0.5)
  const t=L.title, f=L.focus, b=L.start
  ctx.textAlign='center'
  ctx.fillStyle='#fff'
  ctx.font='700 '+Math.floor(t.h*0.85)+'px sans-serif'
  ctx.fillText(String(SLOTS.titleText), t.x+t.w/2, t.y+t.h*0.8)
  const lr=Math.min(f.w/13, f.h/5.4)
  PF.block(ctx, f.x, f.y+f.h*0.06, f.w, f.h*0.88, '#1a1e26', '#11141a', lr)
  const redOn=(phase==='sequence'||phase==='waiting'||phase==='foul')?seqLit:0
  const greenOn=phase==='go'||phase==='result'
  const pulse=phase==='go'?1+Math.sin(PF.t*14)*0.05:1
  const cy0=f.y+f.h*0.34, cy1=f.y+f.h*0.68
  for(let i=0;i<5;i++){
    const cx=f.x+f.w*((i+0.5)/5)
    drawLamp(cx,cy0,lr,i<redOn,String(SLOTS.lampRed),'#3a1212')
    drawLamp(cx,cy1,lr*pulse,greenOn,String(SLOTS.lampGo),'#0f2a16')
  }
  const msgY=(f.y+f.h+b.y)*0.5
  ctx.font='700 '+Math.floor(Math.min(W,H)*0.045)+'px sans-serif'
  ctx.fillStyle=flash>0?'#fff':'rgba(255,255,255,0.92)'
  let msg=''
  if(phase==='idle') msg='Wait for green, then tap'
  else if(phase==='sequence') msg='Lights…'
  else if(phase==='waiting') msg='Ready…'
  else if(phase==='go') msg='GO!'
  else if(phase==='foul') msg=String(SLOTS.ctaFoul)
  else msg=lastMs+' ms'
  ctx.fillText(msg, W/2, msgY)
  if(bestMs>0){
    ctx.font='600 '+Math.floor(Math.min(W,H)*0.03)+'px sans-serif'
    ctx.fillStyle='rgba(255,255,255,0.7)'
    ctx.fillText('Best '+bestMs+' ms', W/2, msgY+Math.min(W,H)*0.05)
  }
  PF.block(ctx,b.x,b.y,b.w,b.h,String(SLOTS.btn0),String(SLOTS.btn1),14)
  ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(b.h*0.45)+'px sans-serif'
  const label=phase==='idle'?SLOTS.ctaIdle:(phase==='sequence'||phase==='waiting')?SLOTS.ctaWait:phase==='go'?SLOTS.ctaGo:phase==='foul'?SLOTS.ctaFoul:SLOTS.ctaAgain
  ctx.fillText(String(label), b.x+b.w/2, b.y+b.h*0.68)
  ctx.textAlign='left'
}
layout()
`.trim()
}

function timingBody(): string {
  const slots: ScaffoldSlots = {
    titleText: 'TIMING',
    hintText: 'Tap when rings meet',
    sky0: '#231942',
    sky1: '#3c096c',
    sky2: '#5a189a',
    blob: '#7b2cbf',
    dot: '#e0aaff',
    spawnEvery: 1.2,
  }
  return `
const LAYOUT_PLAN = ${planJson(TIMING_PLAN)}
const SLOTS = ${slotsJson(slots)}
let L={}, rings=[], spawn=0, flash=0, squash=1
function layoutRects(){ return L }
function scorePos(){ const f=L.focus||{x:0,y:0,w:W,h:H}; return [f.x+f.w/2,f.y+f.h/2] }
function diePos(){ return scorePos() }
function layout(){ L = GS.layoutFromPlan(LAYOUT_PLAN, W, H) }
function reset(){ rings=[]; spawn=0.25; flash=0; squash=1; setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown',()=>{
  if(GS.paused||!rings.length||!L.focus) return
  const target=Math.min(L.focus.w,L.focus.h)*0.12
  const r=rings[0]
  if(Math.abs(r.r-target)<target*0.55){ rings.shift(); bump(); flash=0.15; squash=1.25 }
  else die()
})
function tick(dt){
  if(GS.paused||!L.focus) return
  flash=Math.max(0,flash-dt); spawn-=dt
  squash+=(1-squash)*Math.min(1,dt*10)
  const target=Math.min(L.focus.w,L.focus.h)*0.12
  if(spawn<=0){ rings.push({r:Math.max(W,H)*0.45}); spawn=Number(SLOTS.spawnEvery) }
  for(const r of rings) r.r-=110*dt
  rings=rings.filter(r=>{ if(r.r<target*0.55){ die(); return false } return true })
}
function draw(){
  if(!L.focus) layout()
  PF.sky(ctx,W,H,String(SLOTS.sky0),String(SLOTS.sky1),String(SLOTS.sky2))
  PF.blobs(ctx,W,H,String(SLOTS.blob),4)
  PF.dots(ctx,W,H,String(SLOTS.dot),16,0.8)
  const t=L.title, f=L.focus, h=L.hint
  const cx=f.x+f.w/2, cy=f.y+f.h/2, target=Math.min(f.w,f.h)*0.12
  ctx.fillStyle='#fff'; ctx.textAlign='center'
  ctx.font='700 '+Math.floor(t.h*0.85)+'px sans-serif'
  ctx.fillText(String(SLOTS.titleText), t.x+t.w/2, t.y+t.h*0.8)
  ctx.strokeStyle='#c8b6ff'; ctx.lineWidth=3
  for(const r of rings){ ctx.beginPath(); ctx.arc(cx,cy,r.r,0,Math.PI*2); ctx.stroke() }
  PF.soft(ctx,cx,cy,target*squash*(flash>0?1.15:1), flash>0?'#ffd6ff':'#9f86c0', '#5a189a')
  ctx.fillStyle='#e0aaff'; ctx.font='600 '+Math.floor(h.h*0.7)+'px sans-serif'
  ctx.fillText(String(SLOTS.hintText), h.x+h.w/2, h.y+h.h*0.75)
}
layout()
`.trim()
}

function dodgeBody(): string {
  const slots: ScaffoldSlots = {
    titleText: 'DODGE',
    sky0: '#0d1b2a',
    sky1: '#1d3557',
    sky2: '#457b9d',
    blob: '#457b9d',
    dot: '#a8dadc',
    buddy0: '#a8dadc',
    buddy1: '#48cae4',
    hazard0: '#ff8fa3',
    hazard1: '#e63946',
    speed: 220,
  }
  return `
const LAYOUT_PLAN = ${planJson(DODGE_PLAN)}
const SLOTS = ${slotsJson(slots)}
const LANES=[0.25,0.5,0.75]
let L={}, lane=1, hazards=[], spawn=0, squash=1, stretch=1
function layoutRects(){ return L }
function laneX(){ return W*LANES[lane] }
function scorePos(){ const p=L.player||{x:0,y:0,w:W,h:0}; return [laneX(), p.y+p.h/2] }
function diePos(){ return scorePos() }
function layout(){ L = GS.layoutFromPlan(LAYOUT_PLAN, W, H) }
function reset(){ lane=1; hazards=[]; spawn=0.5; squash=1; stretch=1; setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
function pointerXY(e){ const r=canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) } }
canvas.addEventListener('pointerdown',(e)=>{
  if(GS.paused) return
  if(pointerXY(e).x<W*0.5) lane=Math.max(0,lane-1)
  else lane=Math.min(2,lane+1)
})
function tick(dt){
  if(GS.paused||!L.player) return
  squash+=(1-squash)*Math.min(1,dt*10)
  stretch+=(1-stretch)*Math.min(1,dt*10)
  spawn-=dt
  if(spawn<=0){ hazards.push({ lane:Math.floor(Math.random()*3), y:-60, h:56 }); spawn=0.7+Math.random()*0.35 }
  const py=L.player.y+L.player.h/2
  for(const b of hazards) b.y+=Number(SLOTS.speed)*dt
  hazards=hazards.filter(b=>{
    if(b.y>H+80){ bump(); return false }
    if(b.lane===lane && b.y+b.h>py-18 && b.y<py+18){ die(); return false }
    return true
  })
}
function draw(){
  if(!L.player) layout()
  PF.sky(ctx,W,H,String(SLOTS.sky0),String(SLOTS.sky1),String(SLOTS.sky2))
  PF.blobs(ctx,W,H,String(SLOTS.blob),5)
  PF.dots(ctx,W,H,String(SLOTS.dot),16,0.8)
  const t=L.title
  ctx.fillStyle='#fff'; ctx.textAlign='center'
  ctx.font='700 '+Math.floor(t.h*0.85)+'px sans-serif'
  ctx.fillText(String(SLOTS.titleText), t.x+t.w/2, t.y+t.h*0.8)
  for(const b of hazards){
    PF.block(ctx,W*LANES[b.lane]-28,b.y,56,b.h,String(SLOTS.hazard0),String(SLOTS.hazard1),12)
  }
  const bob=typeof PF.bob==='function'?PF.bob(4,5,0):0
  const p=L.player
  PF.buddy(ctx,laneX(),p.y+p.h/2+bob,Math.min(p.w,p.h)*0.45,String(SLOTS.buddy0),String(SLOTS.buddy1),{ lookY:-0.3, squash, stretch, blush:true })
}
layout()
`.trim()
}

function dragBody(): string {
  const slots: ScaffoldSlots = {
    titleText: 'Catch green',
    sky0: '#240046',
    sky1: '#3c096c',
    sky2: '#5a189a',
    blob: '#7b2cbf',
    dot: '#e0aaff',
    buddy0: '#9d4edd',
    buddy1: '#7b2cbf',
    goodRate: 0.65,
  }
  return `
const LAYOUT_PLAN = ${planJson(DRAG_PLAN)}
const SLOTS = ${slotsJson(slots)}
let L={}, bx=0, items=[], spawn=0, squash=1, stretch=1
function layoutRects(){ return L }
function scorePos(){ const c=L.catcher||{x:0,y:0,w:0,h:0}; return [bx, c.y+c.h/2] }
function diePos(){ return scorePos() }
function layout(){ L = GS.layoutFromPlan(LAYOUT_PLAN, W, H); if(!bx) bx=W*0.5 }
function reset(){ items=[]; spawn=0.2; squash=1; stretch=1; setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
function pointerXY(e){ const r=canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) } }
function moveTo(e){
  if(GS.paused||!L.catcher) return
  const r=Math.min(L.catcher.w,L.catcher.h)*0.45
  bx=Math.max(r,Math.min(W-r,pointerXY(e).x))
}
canvas.addEventListener('pointerdown',moveTo)
canvas.addEventListener('pointermove',(e)=>{ if(e.buttons) moveTo(e) })
function tick(dt){
  if(GS.paused||!L.catcher) return
  squash+=(1-squash)*Math.min(1,dt*10)
  stretch+=(1-stretch)*Math.min(1,dt*10)
  spawn-=dt
  if(spawn<=0){
    items.push({x:40+Math.random()*(W-80),y:L.focus.y,good:Math.random()<Number(SLOTS.goodRate),v:160+Math.random()*90})
    spawn=0.45
  }
  const py=L.catcher.y+L.catcher.h/2
  const pr=Math.min(L.catcher.w,L.catcher.h)*0.45
  for(const it of items) it.y+=it.v*dt
  items=items.filter(it=>{
    if(it.y>py-pr&&Math.abs(it.x-bx)<pr+12){
      if(it.good){ bump(); squash=1.3; stretch=0.75 } else die()
      return false
    }
    return it.y<H+40
  })
}
function draw(){
  if(!L.catcher) layout()
  PF.sky(ctx,W,H,String(SLOTS.sky0),String(SLOTS.sky1),String(SLOTS.sky2))
  PF.blobs(ctx,W,H,String(SLOTS.blob),5)
  PF.dots(ctx,W,H,String(SLOTS.dot),16,0.7)
  const t=L.title, c=L.catcher
  ctx.fillStyle='#e0aaff'; ctx.textAlign='center'
  ctx.font='600 '+Math.floor(t.h*0.75)+'px sans-serif'
  ctx.fillText(String(SLOTS.titleText), t.x+t.w/2, t.y+t.h*0.8)
  for(const it of items){
    PF.soft(ctx,it.x,it.y,13, it.good?'#38b000':'#ef476f', it.good?'#208b3a':'#c1121f')
  }
  const bob=typeof PF.bob==='function'?PF.bob(3,5,0):0
  const pr=Math.min(c.w,c.h)*0.45
  PF.buddy(ctx,bx,c.y+c.h/2+bob,pr,String(SLOTS.buddy0),String(SLOTS.buddy1),{ lookY:-0.3, squash, stretch, blush:true })
}
layout()
`.trim()
}

function stackBody(): string {
  const slots: ScaffoldSlots = {
    titleText: 'STACK',
    sky0: '#3d1f14',
    sky1: '#7b2d26',
    sky2: '#e09f3e',
    blob: '#e09f3e',
    dot: '#ffe8a3',
    block0: '#ffe066',
    block1: '#f4d35e',
    cur0: '#ffffff',
    cur1: '#e9ecef',
  }
  return `
const LAYOUT_PLAN = ${planJson(STACK_PLAN)}
const SLOTS = ${slotsJson(slots)}
let L={}, stack=[], cur=null, dir=1, speed=140
function layoutRects(){ return L }
function scorePos(){ return cur?[cur.x,cur.y]:[W*0.5,H*0.5] }
function diePos(){ return scorePos() }
function layout(){
  L = GS.layoutFromPlan(LAYOUT_PLAN, W, H)
  if(!stack.length && L.base){
    stack=[{ x:L.base.x+L.base.w/2, y:L.base.y, w:Math.min(L.base.w*0.85, W*0.42) }]
  }
  if(!cur && stack.length){
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
  if(GS.paused||!cur||!stack.length) return
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
  if(!L.base) layout()
  PF.sky(ctx,W,H,String(SLOTS.sky0),String(SLOTS.sky1),String(SLOTS.sky2))
  PF.blobs(ctx,W,H,String(SLOTS.blob),4)
  PF.dots(ctx,W,H,String(SLOTS.dot),14,0.6)
  const t=L.title
  ctx.fillStyle='#fff'; ctx.textAlign='center'
  ctx.font='700 '+Math.floor(t.h*0.85)+'px sans-serif'
  ctx.fillText(String(SLOTS.titleText), t.x+t.w/2, t.y+t.h*0.8)
  for(const p of stack){
    PF.block(ctx,p.x-p.w*0.5,p.y,p.w,28,String(SLOTS.block0),String(SLOTS.block1),8)
  }
  if(cur) PF.block(ctx,cur.x-cur.w*0.5,cur.y,cur.w,28,String(SLOTS.cur0),String(SLOTS.cur1),8)
}
layout()
`.trim()
}

const MERGE_SLOTS: ScaffoldSlots = {
  sky0: '#060918',
  sky1: '#0a1026',
  sky2: '#1a2744',
  dot: '#7ec8ff',
  tiers:
    '#ff5177,#ff8aa1,#a266ff,#6ddc5a,#ff9f3a,#ff4444,#e7e23a,#ffb59a,#ffe066,#7ed957,#3cb371',
  faces: '',
  dangerMs: 2500,
  dropCooldown: 0.42,
}

/** Physics drop-merge (Orb/Veggie Merge): aim, release, same-tier pieces fuse; combo scoring. */
function mergeBody(): string {
  return `
const LAYOUT_PLAN = ${planJson(MERGE_PLAN)}
const SLOTS = ${slotsJson(MERGE_SLOTS)}
const TIER_R = [13,17,22,28,35,44,54,66,80,96,116]
const TIER_SCORE = [1,3,6,10,15,21,28,36,45,55,120]
const COLORS = String(SLOTS.tiers).split(',').map(function(s){ return s.trim() }).filter(Boolean)
const FACES = String(SLOTS.faces||'').split(',').map(function(s){ return s.trim() }).filter(Boolean)
const MAX_TIER = Math.min(TIER_R.length, Math.max(3, COLORS.length)) - 1
let L={}, S=1, jarL=0, jarR=0, jarBottom=0, dangerY=0, dropY=0
let orbs=[], nextId=1, holdTier=0, queue=[], holdX=0
let canDrop=true, dropCd=0, dangerSince=0, lastMergeAt=0, combo=0
let particles=[], popups=[], flash=0
function hexNum(c){ var h=String(c).replace('#',''); if(h.length===3){ h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2] } var n=parseInt(h,16); return isNaN(n)?8947848:n }
function mixColor(c,t,p){
  var a=hexNum(c), b=hexNum(t)
  var r=((a>>16&255)*(1-p)+(b>>16&255)*p)|0
  var g=((a>>8&255)*(1-p)+(b>>8&255)*p)|0
  var bl=((a&255)*(1-p)+(b&255)*p)|0
  return 'rgb('+r+','+g+','+bl+')'
}
function layoutRects(){ return L }
function layout(){
  L = GS.layoutFromPlan(LAYOUT_PLAN, W, H)
  S = Math.min(W, H) / 640
  jarL = L.jar.x
  jarR = L.jar.x + L.jar.w
  jarBottom = L.jar.y + L.jar.h
  dangerY = L.jar.y
  dropY = L.drop.y + L.drop.h * 0.5
  if (!holdX) holdX = W * 0.5
}
function onResize(){ layout() }
function tierR(t){ return TIER_R[t] * S * 1.65 }
function randDropTier(){
  var r = Math.random()
  if (r < 0.42) return 0
  if (r < 0.72) return Math.min(1, MAX_TIER)
  if (r < 0.9) return Math.min(2, MAX_TIER)
  if (r < 0.98) return Math.min(3, MAX_TIER)
  return Math.min(4, MAX_TIER)
}
function refillQueue(){
  queue = [randDropTier(), randDropTier()]
  holdTier = queue.shift()
  queue.push(randDropTier())
}
function diePos(){
  if (orbs.length){
    var worst = orbs[0]
    for (var i = 0; i < orbs.length; i++){
      var o = orbs[i]
      if (o.y - tierR(o.tier) < worst.y - tierR(worst.tier)) worst = o
    }
    return [worst.x, worst.y]
  }
  return [W * 0.5, dangerY || H * 0.2]
}
function scorePos(){ return diePos() }
function reset(){
  layout()
  orbs = []
  nextId = 1
  canDrop = true
  dropCd = 0
  dangerSince = 0
  lastMergeAt = 0
  combo = 0
  particles = []
  popups = []
  flash = 0
  refillQueue()
  holdX = W * 0.5
  setScore(0)
}
function onHostStart(){ reset() }
function die(){ reset() }
function clampHoldX(){
  var r = tierR(holdTier)
  holdX = Math.max(jarL + r + 2, Math.min(jarR - r - 2, holdX))
}
function addOrb(x, y, tier, vx, vy){
  orbs.push({ id: nextId++, x: x, y: y, vx: vx || 0, vy: vy || 0, tier: tier, merging: false, born: performance.now() })
}
function burst(x, y, tier){
  var n = 6 + tier
  for (var i = 0; i < n; i++){
    var a = Math.random() * Math.PI * 2
    var sp = (60 + tier * 10) * S * (0.5 + Math.random())
    particles.push({
      x: x, y: y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20 * S,
      life: 0, max: 0.35 + Math.random() * 0.35,
      color: i % 2 ? mixColor(COLORS[tier], '#ffffff', 0.55) : COLORS[tier],
      size: (2 + Math.random() * 3) * S,
    })
  }
  if (typeof Juice !== 'undefined' && Juice.burst) Juice.burst(x, y)
}
function popup(x, y, text){ popups.push({ x: x, y: y, text: text, life: 0, max: 0.85 }) }
function mergePair(a, b){
  if (a.merging || b.merging || a.tier !== b.tier) return
  a.merging = b.merging = true
  var tier = a.tier
  var now = performance.now()
  if (now - lastMergeAt < 700) combo++
  else combo = 1
  lastMergeAt = now
  var mult = combo >= 5 ? 3 : combo >= 3 ? 2 : combo >= 2 ? 1.5 : 1
  var pts = Math.round((TIER_SCORE[tier] || tier + 1) * mult)
  var mx = (a.x + b.x) * 0.5, my = (a.y + b.y) * 0.5
  var vx = (a.vx + b.vx) * 0.25, vy = (a.vy + b.vy) * 0.25
  burst(mx, my, tier)
  popup(mx, my, mult > 1 ? ('+' + pts + ' x' + mult) : ('+' + pts))
  bump(pts)
  orbs = orbs.filter(function(o){ return o.id !== a.id && o.id !== b.id })
  if (tier < MAX_TIER) addOrb(mx, my, tier + 1, vx, vy)
  else {
    bump(500)
    flash = 1
    if (typeof Juice !== 'undefined' && Juice.shake) Juice.shake(1.2)
    burst(mx, my, MAX_TIER)
    popup(mx, my - 20 * S, 'MAX!')
  }
}
function resolvePhysics(dt){
  var g = 1400 * S
  var sub = Math.max(1, Math.min(4, Math.ceil(dt / 0.012)))
  var h = dt / sub
  for (var s = 0; s < sub; s++){
    for (var i = 0; i < orbs.length; i++){
      var o = orbs[i]
      if (o.merging) continue
      o.vy += g * h
      o.vx *= Math.pow(0.992, h * 60)
      o.x += o.vx * h
      o.y += o.vy * h
      var r = tierR(o.tier)
      if (o.x - r < jarL){ o.x = jarL + r; o.vx = Math.abs(o.vx) * 0.25 }
      if (o.x + r > jarR){ o.x = jarR - r; o.vx = -Math.abs(o.vx) * 0.25 }
      if (o.y + r > jarBottom){
        o.y = jarBottom - r
        o.vy = -Math.abs(o.vy) * 0.18
        o.vx *= 0.85
        if (Math.abs(o.vy) < 40 * S) o.vy = 0
      }
    }
    for (var ia = 0; ia < orbs.length; ia++){
      var A = orbs[ia]
      if (!A || A.merging) continue
      for (var ib = ia + 1; ib < orbs.length; ib++){
        var B = orbs[ib]
        if (!B || B.merging) continue
        var ra = tierR(A.tier), rb = tierR(B.tier)
        var dx = B.x - A.x, dy = B.y - A.y
        var dist = Math.hypot(dx, dy) || 0.0001
        var min = ra + rb
        if (dist >= min) continue
        if (A.tier === B.tier){
          if (performance.now() - A.born > 60 && performance.now() - B.born > 60) mergePair(A, B)
          continue
        }
        var overlap = min - dist
        var nx = dx / dist, ny = dy / dist
        var ma = ra * ra, mb = rb * rb, inv = 1 / (ma + mb)
        A.x -= nx * overlap * mb * inv
        A.y -= ny * overlap * mb * inv
        B.x += nx * overlap * ma * inv
        B.y += ny * overlap * ma * inv
        var rvx = B.vx - A.vx, rvy = B.vy - A.vy
        var vn = rvx * nx + rvy * ny
        if (vn < 0){
          var e = 0.22
          var jn = -(1 + e) * vn / (1 / ma + 1 / mb)
          A.vx -= (jn / ma) * nx; A.vy -= (jn / ma) * ny
          B.vx += (jn / mb) * nx; B.vy += (jn / mb) * ny
        }
      }
    }
  }
}
function checkDanger(dt){
  var over = false
  for (var i = 0; i < orbs.length; i++){
    var o = orbs[i]
    if (o.merging) continue
    if (performance.now() - o.born < 600) continue
    if (o.y - tierR(o.tier) < dangerY && Math.abs(o.vy) < 50 * S){ over = true; break }
  }
  if (over){
    dangerSince += dt
    if (dangerSince >= Number(SLOTS.dangerMs) / 1000) die()
  } else dangerSince = 0
}
function tick(dt){
  if (GS.paused) return
  var t = Math.min(0.033, dt)
  if (dropCd > 0){
    dropCd -= t
    if (dropCd <= 0) canDrop = true
  }
  resolvePhysics(t)
  checkDanger(t)
  for (var i = 0; i < particles.length; i++){
    var p = particles[i]
    p.life += t; p.x += p.vx * t; p.y += p.vy * t; p.vy += 400 * S * t
  }
  particles = particles.filter(function(p){ return p.life < p.max })
  for (var j = 0; j < popups.length; j++) popups[j].life += t
  popups = popups.filter(function(p){ return p.life < p.max })
  if (flash > 0) flash = Math.max(0, flash - t * 1.8)
}
function drawOrb(x, y, tier, rad){
  var r = rad || tierR(tier)
  ctx.fillStyle = mixColor(COLORS[tier], '#000000', 0.45)
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = COLORS[tier]
  ctx.beginPath(); ctx.arc(x - r * 0.06, y - r * 0.08, r * 0.9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.34, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill()
  var face = FACES.length ? FACES[tier % FACES.length] : ''
  if (face){
    ctx.font = '700 ' + Math.round(r * 1.05) + 'px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(face, x, y + r * 0.04)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }
}
function draw(){
  if (!L.jar) layout()
  if (!queue.length) refillQueue()
  PF.sky(ctx, W, H, String(SLOTS.sky0), String(SLOTS.sky1), String(SLOTS.sky2))
  PF.dots(ctx, W, H, String(SLOTS.dot), 18, 0.35)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 4 * S
  ctx.beginPath()
  ctx.moveTo(jarL, dangerY)
  ctx.lineTo(jarL, jarBottom)
  ctx.lineTo(jarR, jarBottom)
  ctx.lineTo(jarR, dangerY)
  ctx.stroke()
  var dangerPulse = dangerSince > 0 ? 0.45 + 0.35 * Math.sin(performance.now() / 120) : 0.28
  ctx.strokeStyle = 'rgba(255,80,80,' + dangerPulse + ')'
  ctx.setLineDash([8 * S, 6 * S])
  ctx.beginPath(); ctx.moveTo(jarL, dangerY); ctx.lineTo(jarR, dangerY); ctx.stroke()
  ctx.setLineDash([])
  var nx = L.next.x + L.next.w * 0.7
  var ny = L.next.y + L.next.h * 0.5
  var nr = Math.min(tierR(queue[0]) * 0.55, L.next.h * 0.5)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '700 ' + Math.round(11 * S) + 'px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('NEXT', L.next.x, ny + 4 * S)
  drawOrb(nx, ny, queue[0], nr)
  for (var i = 0; i < orbs.length; i++) drawOrb(orbs[i].x, orbs[i].y, orbs[i].tier)
  if (!GS.paused && canDrop){
    clampHoldX()
    ctx.globalAlpha = 0.9
    drawOrb(holdX, dropY, holdTier)
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = '#fff'
    ctx.setLineDash([4 * S, 4 * S])
    ctx.beginPath(); ctx.moveTo(holdX, dropY + tierR(holdTier)); ctx.lineTo(holdX, jarBottom); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }
  for (var j = 0; j < particles.length; j++){
    var p = particles[j]
    var a = 1 - p.life / p.max
    ctx.globalAlpha = a
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (var k = 0; k < popups.length; k++){
    var q = popups[k]
    var u = q.life / q.max
    ctx.globalAlpha = 1 - u
    ctx.fillStyle = '#ffee55'
    ctx.font = '800 ' + Math.round(16 * S) + 'px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(q.text, q.x, q.y - u * 36 * S)
  }
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1
  if (flash > 0){
    ctx.fillStyle = 'rgba(120,255,180,' + (flash * 0.35) + ')'
    ctx.fillRect(0, 0, W, H)
  }
}
function pointerX(e){
  var r = canvas.getBoundingClientRect()
  return (e.clientX - r.left) * (W / r.width)
}
function aimAt(x){ holdX = x; clampHoldX() }
function tryDrop(){
  if (GS.paused || !canDrop) return
  clampHoldX()
  addOrb(holdX, dropY + tierR(holdTier), holdTier, 0, 40 * S)
  holdTier = queue.shift()
  queue.push(randDropTier())
  canDrop = false
  dropCd = Number(SLOTS.dropCooldown) || 0.42
}
canvas.addEventListener('pointerdown', function(e){ if (GS.paused) return; aimAt(pointerX(e)) })
canvas.addEventListener('pointermove', function(e){ if (GS.paused) return; aimAt(pointerX(e)) })
canvas.addEventListener('pointerup', function(e){ if (GS.paused) return; aimAt(pointerX(e)); tryDrop() })
layout()
refillQueue()
`.trim()
}

const SORT_SLOTS: ScaffoldSlots = {
  sky0: '#2b1b4e',
  sky1: '#1a0f2e',
  sky2: '#3d1f5c',
  blob: '#ff4d6d',
  halftone: '#ffd23f',
  colors: '#ff4d6d,#3a86ff,#06d6a0,#ffd23f,#c77dff,#ff9f1c',
  ink: '#1a1025',
  rim: '#ffe8a3',
  sel: '#ffd23f',
  giveColor: '#ff4d6d',
  giveText: 'Give up',
  badgeColor: '#ffd23f',
}

/** Tube-sort level puzzle (Color Pour): tap tube, tap target, animated pour, level ramp. */
function sortBody(): string {
  return `
const LAYOUT_PLAN = ${planJson(SORT_PLAN)}
const SLOTS = ${slotsJson(SORT_SLOTS)}
const COLORS = String(SLOTS.colors).split(',').map(function(s){ return s.trim() }).filter(Boolean)
let L={}, tubes=[], ox=0, oy=0, tw=0, th=0, gap=12, rowGap=24, cap=4
let sel=-1, level=1, bounce=0, pourAnim=null
let giveBtn={x:0,y:0,w:0,h:0}
function layoutRects(){ return L }
function layout(){
  L = GS.layoutFromPlan(LAYOUT_PLAN, W, H)
  var n = tubes.length || 6
  var cols = Math.min(5, n)
  var rows = Math.ceil(n / cols)
  var b = L.board
  gap = Math.max(10, Math.min(20, b.w * 0.045))
  rowGap = Math.max(22, Math.min(34, b.h * 0.08))
  var rowBudget = (b.h - (rows - 1) * rowGap) / rows
  tw = Math.min(82, (b.w - gap * (cols - 1)) / cols)
  th = Math.min(rowBudget - 10, tw * (3.2 + cap * 0.35))
  var totalW = cols * tw + (cols - 1) * gap
  var totalH = rows * th + (rows - 1) * rowGap
  ox = b.x + (b.w - totalW) * 0.5
  oy = b.y + Math.max(0, (b.h - totalH) * 0.45)
  giveBtn = { x: L.give.x, y: L.give.y, w: L.give.w, h: L.give.h }
}
function onResize(){ layout() }
function diePos(){ return [W * 0.5, oy + th * 0.5] }
function scorePos(){ return diePos() }
function isMixed(t){
  if (t.length < 2) return false
  for (var i = 1; i < t.length; i++) if (t[i] !== t[0]) return true
  return false
}
function mixedCount(){
  var n = 0
  for (var i = 0; i < tubes.length; i++) if (isMixed(tubes[i])) n++
  return n
}
function moveUnit(from, to){
  if (from === to || !tubes[from].length || tubes[to].length >= cap) return false
  tubes[to].push(tubes[from].pop())
  return true
}
function forceSandwiches(n, need){
  var guard = 80
  while (mixedCount() < need && guard-- > 0){
    var moved = false
    for (var a = 0; a < n && !moved; a++){
      if (tubes[a].length < 2) continue
      var mono = true
      for (var k = 1; k < tubes[a].length; k++) if (tubes[a][k] !== tubes[a][0]) mono = false
      if (!mono) continue
      for (var b = 0; b < n; b++){
        if (a === b || tubes[b].length >= cap || !tubes[b].length) continue
        if (tubes[b][tubes[b].length - 1] === tubes[a][tubes[a].length - 1]) continue
        moveUnit(a, b)
        moved = true
        break
      }
    }
    if (!moved){
      moveUnit((Math.random() * n) | 0, (Math.random() * n) | 0)
    }
  }
}
function makeLevel(lv){
  cap = lv <= 2 ? 4 : lv <= 5 ? 5 : 6
  var colors = Math.max(3, Math.min(COLORS.length, lv <= 1 ? 4 : lv <= 3 ? 5 : 6))
  var empties = lv <= 2 ? 2 : lv <= 6 ? 2 : 1
  var n = colors + empties
  tubes = []
  for (var i = 0; i < colors; i++){
    var t = []
    for (var u = 0; u < cap; u++) t.push(i)
    tubes.push(t)
  }
  for (var e = 0; e < empties; e++) tubes.push([])
  var scramble = 90 + lv * 22
  for (var s = 0; s < scramble; s++){
    var from = (Math.random() * n) | 0
    var to = (Math.random() * n) | 0
    if (from === to || !tubes[from].length || tubes[to].length >= cap) continue
    if (tubes[to].length === 0 && tubes[from].length === cap && !isMixed(tubes[from])) continue
    tubes[to].push(tubes[from].pop())
  }
  var needMixed = Math.min(colors, 2 + ((lv + 1) / 2 | 0))
  forceSandwiches(n, needMixed)
  if (isWon()) forceSandwiches(n, Math.max(2, needMixed))
}
function canPour(a, b){
  if (a < 0 || b < 0 || a === b) return false
  var A = tubes[a], B = tubes[b]
  if (!A.length || B.length >= cap) return false
  var color = A[A.length - 1]
  if (B.length && B[B.length - 1] !== color) return false
  return true
}
function countPour(a, b){
  if (!canPour(a, b)) return 0
  var A = tubes[a], color = A[A.length - 1]
  var n = 0
  for (var i = A.length - 1; i >= 0 && tubes[b].length + n < cap; i--){
    if (A[i] !== color) break
    n++
  }
  return n
}
function commitPour(anim){
  for (var i = 0; i < anim.units; i++) tubes[anim.to].push(tubes[anim.from].pop())
}
function startPour(a, b){
  var units = countPour(a, b)
  if (!units) return false
  pourAnim = {
    from: a,
    to: b,
    color: tubes[a][tubes[a].length - 1],
    units: units,
    t: 0,
    dur: 0.36 + units * 0.1,
    fromBase: tubes[a].length - units,
    toBase: tubes[b].length,
  }
  return true
}
function pourEase(p){
  var t = Math.max(0, Math.min(1, p))
  return t * t * (3 - 2 * t)
}
function tubeXY(i){
  var cols = Math.min(5, tubes.length)
  var r = (i / cols) | 0, c = i % cols
  return { x: ox + c * (tw + gap), y: oy + r * (th + rowGap) }
}
function isWon(){
  for (var i = 0; i < tubes.length; i++){
    var t = tubes[i]
    if (!t.length) continue
    if (t.length !== cap) return false
    for (var k = 1; k < t.length; k++) if (t[k] !== t[0]) return false
  }
  return true
}
function syncScore(){ setScore(level) }
function reset(){
  makeLevel(level)
  layout()
  sel = -1
  bounce = 0
  pourAnim = null
  syncScore()
}
function onHostStart(){ level = 1; reset() }
function die(){ level = 1; reset() }
function tick(dt){
  if (GS.paused) return
  if (bounce > 0) bounce = Math.max(0, bounce - dt * 4)
  if (pourAnim){
    pourAnim.t += dt
    if (pourAnim.t >= pourAnim.dur){
      commitPour(pourAnim)
      pourAnim = null
      if (isWon()){
        bump(1)
        if (typeof Juice !== 'undefined' && Juice.burst) Juice.burst(W * 0.5, oy + th * 0.5)
        level++
        reset()
      }
    }
  }
}
function pointerXY(e){
  var r = canvas.getBoundingClientRect()
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
}
function hitGive(x, y){
  return x >= giveBtn.x && x <= giveBtn.x + giveBtn.w && y >= giveBtn.y && y <= giveBtn.y + giveBtn.h
}
function tubeAt(x, y){
  var cols = Math.min(5, tubes.length)
  for (var i = 0; i < tubes.length; i++){
    var r = (i / cols) | 0, c = i % cols
    var tx = ox + c * (tw + gap)
    var ty = oy + r * (th + rowGap) - (sel === i ? 10 : 0)
    if (x >= tx - 4 && x <= tx + tw + 4 && y >= ty - 8 && y <= ty + th + 12) return i
  }
  return -1
}
function tubePath(x, y, w, h){
  var r = Math.min(18, w * 0.42)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + h - r)
  ctx.quadraticCurveTo(x, y + h + 4, x + w * 0.5, y + h + 6)
  ctx.quadraticCurveTo(x + w, y + h + 4, x + w, y + h - r)
  ctx.lineTo(x + w, y)
}
function drawLiquid(x, y, w, h, colorIdx, top){
  ctx.fillStyle = COLORS[colorIdx] || '#888'
  ctx.beginPath()
  if (top){
    ctx.moveTo(x, y + 4)
    ctx.quadraticCurveTo(x + w * 0.25, y - 3, x + w * 0.5, y + 2)
    ctx.quadraticCurveTo(x + w * 0.75, y + 7, x + w, y + 2)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
  } else {
    ctx.rect(x, y, w, h)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = String(SLOTS.ink)
  ctx.lineWidth = 2.5
  ctx.stroke()
}
function drawTube(i, x, y){
  var pouringSrc = pourAnim && pourAnim.from === i
  var pouringDst = pourAnim && pourAnim.to === i
  var e = pourAnim ? pourEase(pourAnim.t / pourAnim.dur) : 0
  var lift = sel === i ? 12 + Math.sin(bounce * Math.PI) * 4 : pouringSrc ? 8 * (1 - e) : 0
  var yy = y - lift
  var pad = 5
  var unit = (th - 14) / cap
  var lw = tw - pad * 2
  var floor = yy + th - 8
  if (pouringSrc){
    var base = pourAnim.fromBase
    var drained = Math.min(pourAnim.units, e * pourAnim.units)
    var gone = Math.floor(drained + 1e-9)
    var frac = drained - gone
    for (var k = 0; k < base; k++){
      drawLiquid(x + pad, floor - (k + 1) * unit, lw, unit + 1, tubes[i][k], false)
    }
    var remainFull = Math.max(0, pourAnim.units - gone - (frac > 1e-6 ? 1 : 0))
    for (var u = 0; u < remainFull; u++){
      drawLiquid(x + pad, floor - (base + u + 1) * unit, lw, unit + 1, pourAnim.color, u === remainFull - 1 && frac <= 1e-6)
    }
    if (frac > 1e-6){
      var hh = (1 - frac) * unit
      if (hh > 1.2){
        drawLiquid(x + pad, floor - (base + remainFull) * unit - hh, lw, hh + 1, pourAnim.color, true)
      } else if (remainFull > 0){
        drawLiquid(x + pad, floor - (base + remainFull) * unit, lw, unit + 1, pourAnim.color, true)
      } else if (base > 0){
        drawLiquid(x + pad, floor - base * unit, lw, unit + 1, tubes[i][base - 1], true)
      }
    } else if (remainFull === 0 && base > 0){
      drawLiquid(x + pad, floor - base * unit, lw, unit + 1, tubes[i][base - 1], true)
    }
  } else if (pouringDst){
    var tb = pourAnim.toBase
    var filled = Math.min(pourAnim.units, e * pourAnim.units)
    var full = Math.floor(filled + 1e-9)
    var ffrac = filled - full
    for (var k2 = 0; k2 < tb; k2++){
      drawLiquid(x + pad, floor - (k2 + 1) * unit, lw, unit + 1, tubes[i][k2], k2 === tb - 1 && full === 0 && ffrac <= 1e-6)
    }
    for (var u2 = 0; u2 < full; u2++){
      drawLiquid(x + pad, floor - (tb + u2 + 1) * unit, lw, unit + 1, pourAnim.color, u2 === full - 1 && ffrac <= 1e-6)
    }
    if (ffrac > 1e-6){
      var fh = ffrac * unit
      if (fh > 1.2){
        drawLiquid(x + pad, floor - (tb + full) * unit - fh, lw, fh + 1, pourAnim.color, true)
      }
    }
  } else {
    var topK = tubes[i].length - 1
    for (var k3 = 0; k3 < tubes[i].length; k3++){
      drawLiquid(x + pad, floor - (k3 + 1) * unit, lw, unit + 1, tubes[i][k3], k3 === topK)
    }
  }
  tubePath(x, yy, tw, th)
  ctx.strokeStyle = String(SLOTS.ink)
  ctx.lineWidth = sel === i ? 5 : 4
  ctx.lineJoin = 'round'
  ctx.stroke()
  if (sel === i){
    tubePath(x - 1, yy - 1, tw + 2, th + 2)
    ctx.strokeStyle = String(SLOTS.sel)
    ctx.lineWidth = 3
    ctx.stroke()
  }
  ctx.fillStyle = String(SLOTS.ink)
  PF.rr(ctx, x - 4, yy - 6, tw + 8, 10, 4)
  ctx.fill()
  ctx.fillStyle = sel === i ? String(SLOTS.sel) : String(SLOTS.rim)
  PF.rr(ctx, x - 2, yy - 4, tw + 4, 6, 3)
  ctx.fill()
}
function drawPourStream(){
  if (!pourAnim) return
  var p = Math.min(1, pourAnim.t / pourAnim.dur)
  var alpha = Math.sin(p * Math.PI) * 0.45
  if (alpha < 0.03) return
  var a = tubeXY(pourAnim.from)
  var b = tubeXY(pourAnim.to)
  var x0 = a.x + tw * 0.5
  var y0 = a.y + 2
  var x1 = b.x + tw * 0.5
  var y1 = b.y + 2
  var mx = (x0 + x1) * 0.5
  var my = Math.min(y0, y1) - 20 - Math.abs(x1 - x0) * 0.08
  ctx.lineCap = 'round'
  ctx.strokeStyle = COLORS[pourAnim.color] || '#888'
  ctx.globalAlpha = alpha
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(mx, my, x1, y1)
  ctx.stroke()
  ctx.globalAlpha = 1
}
function drawBadge(){
  var label = 'LV ' + level
  ctx.font = '800 16px sans-serif'
  var w = ctx.measureText(label).width + 28
  var x = 12, y = 12
  ctx.fillStyle = String(SLOTS.ink)
  PF.rr(ctx, x + 3, y + 3, w, 32, 12)
  ctx.fill()
  ctx.fillStyle = String(SLOTS.badgeColor)
  PF.rr(ctx, x, y, w, 32, 12)
  ctx.fill()
  ctx.strokeStyle = String(SLOTS.ink)
  ctx.lineWidth = 3
  PF.rr(ctx, x, y, w, 32, 12)
  ctx.stroke()
  ctx.fillStyle = String(SLOTS.ink)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + w * 0.5, y + 17)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}
function drawGiveBtn(){
  var x = giveBtn.x, y = giveBtn.y, w = giveBtn.w, h = giveBtn.h
  ctx.fillStyle = String(SLOTS.ink)
  PF.rr(ctx, x + 3, y + 3, w, h, 14)
  ctx.fill()
  ctx.fillStyle = String(SLOTS.giveColor)
  PF.rr(ctx, x, y, w, h, 14)
  ctx.fill()
  ctx.strokeStyle = String(SLOTS.ink)
  ctx.lineWidth = 3
  PF.rr(ctx, x, y, w, h, 14)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = '800 16px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(SLOTS.giveText), x + w * 0.5, y + h * 0.5 + 1)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}
function draw(){
  if (!L.board) layout()
  PF.sky(ctx, W, H, String(SLOTS.sky0), String(SLOTS.sky1), String(SLOTS.sky2))
  ctx.fillStyle = String(SLOTS.halftone)
  for (var i = 0; i < 28; i++){
    var px = ((i * 97 + PF.t * 12) % (W + 30)) - 15
    var py = ((i * 61) % H)
    ctx.globalAlpha = 0.08 + (i % 4) * 0.02
    ctx.beginPath()
    ctx.arc(px, py, 3 + (i % 3), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  PF.blobs(ctx, W, H, String(SLOTS.blob), 4)
  var cols = Math.min(5, tubes.length)
  for (var t = 0; t < tubes.length; t++){
    var r = (t / cols) | 0, c = t % cols
    drawTube(t, ox + c * (tw + gap), oy + r * (th + rowGap))
  }
  drawPourStream()
  drawBadge()
  drawGiveBtn()
}
canvas.addEventListener('pointerdown', function(e){
  if (GS.paused) return
  var p = pointerXY(e)
  if (hitGive(p.x, p.y)){ die(); return }
  if (pourAnim) return
  var i = tubeAt(p.x, p.y)
  if (i < 0){ sel = -1; return }
  if (sel < 0){ sel = i; bounce = 1; return }
  if (sel === i){ sel = -1; return }
  if (!canPour(sel, i)){ sel = i; bounce = 1; return }
  startPour(sel, i)
  sel = -1
})
reset()
`.trim()
}

const GRID_SLOTS: ScaffoldSlots = {
  sky0: '#1a0f2e',
  sky1: '#2d1b4e',
  sky2: '#4a2c7a',
  dot: '#ff6bcb',
  faces: '◆,●,★,▲,■,✚,◉,✦',
  faceColors: '#ff6bcb,#6bcbff,#ffe66d,#95e1a3,#ff8e72,#c9a0ff,#7bed9f,#70a1ff',
  back0: '#5a3d8a',
  back1: '#3a2460',
  matchPts: 10,
}

/** Card-pair memory puzzle (Memory Match): flip two, match pairs, clear rounds. */
function gridBody(): string {
  return `
const LAYOUT_PLAN = ${planJson(GRID_PLAN)}
const SLOTS = ${slotsJson(GRID_SLOTS)}
const COLS = 4, ROWS = 4
const FACES = String(SLOTS.faces).split(',').map(function(s){ return s.trim() }).filter(Boolean)
const FCOLORS = String(SLOTS.faceColors).split(',').map(function(s){ return s.trim() }).filter(Boolean)
let L={}, cards=[], open=[], lock=0, matched=0, moves=0, round=1
let ox=0, oy=0, cw=0, ch=0, gap=8, popups=[]
function layoutRects(){ return L }
function layout(){
  L = GS.layoutFromPlan(LAYOUT_PLAN, W, H)
  var b = L.board
  gap = Math.max(6, Math.min(10, b.w * 0.025))
  var side = Math.min(b.w, b.h)
  cw = (side - gap * (COLS - 1)) / COLS
  ch = (side - gap * (ROWS - 1)) / ROWS
  ox = b.x + (b.w - side) * 0.5
  oy = b.y + (b.h - side) * 0.5
}
function onResize(){ layout() }
function cardXY(i){
  var r = (i / COLS) | 0, c = i % COLS
  return { x: ox + c * (cw + gap), y: oy + r * (ch + gap) }
}
function diePos(){
  var b = L.board || { x: 0, y: 0, w: W, h: H }
  return [b.x + b.w / 2, b.y + b.h / 2]
}
function scorePos(){ return diePos() }
function shuffle(a){
  for (var i = a.length - 1; i > 0; i--){
    var j = (Math.random() * (i + 1)) | 0
    var t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}
function dealCards(){
  var pairs = COLS * ROWS / 2
  var deck = []
  for (var i = 0; i < pairs; i++){
    deck.push({ face: i % FACES.length, open: false, done: false })
    deck.push({ face: i % FACES.length, open: false, done: false })
  }
  cards = shuffle(deck)
  open = []
  lock = 0
  matched = 0
  moves = 0
}
function popup(x, y, text){ popups.push({ x: x, y: y, text: text, life: 0, max: 0.85 }) }
function reset(){
  layout()
  round = 1
  dealCards()
  popups = []
  setScore(0)
}
function onHostStart(){ reset() }
function die(){ reset() }
function tick(dt){
  if (GS.paused) return
  for (var i = 0; i < popups.length; i++) popups[i].life += dt
  popups = popups.filter(function(p){ return p.life < p.max })
  if (lock <= 0) return
  lock -= dt
  if (lock > 0) return
  for (var j = 0; j < open.length; j++){
    if (!cards[open[j]].done) cards[open[j]].open = false
  }
  open = []
}
function cardAt(e){
  var r = canvas.getBoundingClientRect()
  var x = (e.clientX - r.left) * (W / r.width)
  var y = (e.clientY - r.top) * (H / r.height)
  for (var i = 0; i < cards.length; i++){
    var p = cardXY(i)
    if (x >= p.x && x <= p.x + cw && y >= p.y && y <= p.y + ch) return i
  }
  return -1
}
function draw(){
  if (!L.board) layout()
  PF.sky(ctx, W, H, String(SLOTS.sky0), String(SLOTS.sky1), String(SLOTS.sky2))
  PF.dots(ctx, W, H, String(SLOTS.dot), 16, 0.4)
  for (var i = 0; i < cards.length; i++){
    var p = cardXY(i)
    var card = cards[i]
    if (card.done || card.open){
      PF.block(ctx, p.x, p.y, cw, ch, FCOLORS[card.face % FCOLORS.length] || '#eee', '#222', 10)
      ctx.fillStyle = '#fff'
      ctx.font = '800 ' + Math.floor(Math.min(cw, ch) * 0.42) + 'px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(FACES[card.face % FACES.length] || '?', p.x + cw * 0.5, p.y + ch * 0.52)
    } else {
      PF.block(ctx, p.x, p.y, cw, ch, String(SLOTS.back0), String(SLOTS.back1), 10)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '800 ' + Math.floor(Math.min(cw, ch) * 0.35) + 'px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', p.x + cw * 0.5, p.y + ch * 0.52)
    }
  }
  var s = L.status
  ctx.font = '600 ' + Math.floor(s.h * 0.7) + 'px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Round ' + round + ' — Moves ' + moves, s.x + s.w / 2, s.y + s.h * 0.55)
  for (var k = 0; k < popups.length; k++){
    var q = popups[k]
    var u = q.life / q.max
    ctx.globalAlpha = 1 - u
    ctx.fillStyle = '#ffe66d'
    ctx.font = '800 ' + Math.floor(Math.min(W, H) * 0.045) + 'px sans-serif'
    ctx.fillText(q.text, q.x, q.y - u * 30)
  }
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}
canvas.addEventListener('pointerdown', function(e){
  if (GS.paused || lock > 0) return
  var i = cardAt(e)
  if (i < 0) return
  var card = cards[i]
  if (card.open || card.done) return
  card.open = true
  open.push(i)
  if (open.length < 2) return
  moves++
  var a = cards[open[0]], b = cards[open[1]]
  if (a.face === b.face){
    a.done = b.done = true
    matched++
    var pts = (Number(SLOTS.matchPts) || 10) * round
    bump(pts)
    var p = cardXY(open[1])
    popup(p.x + cw / 2, p.y, '+' + pts)
    if (typeof Juice !== 'undefined' && Juice.burst) Juice.burst(p.x + cw / 2, p.y + ch / 2)
    open = []
    if (matched >= cards.length / 2){
      var bonus = Math.max(20, 120 - moves * 2) * round
      bump(bonus)
      popup(W * 0.5, oy + ch, 'CLEAR +' + bonus)
      if (typeof Juice !== 'undefined' && Juice.shake) Juice.shake(1)
      round++
      dealCards()
    }
  } else {
    lock = 0.7
  }
})
layout()
dealCards()
`.trim()
}

const WORD_BUILTIN =
  'APPLE,BRAVE,CRANE,TIGER,MOUSE,GHOST,PLANT,MARCH,BREAD,CANDY,LEMON,GLASS,PLATE,SHARE,SHEET,CLOUD,TRUCK,BRICK,SHINE,DRIVE,EARTH,QUIET,SNAKE,CLOCK,SHARP,ABOUT,ABOVE,ACTOR,ADULT,AGAIN,AGENT,AGREE,AHEAD,ALARM,ALBUM,ALERT,ALIVE,ALLOW,ALONE,ALONG,AMONG,ANGEL,ANGER,ANGLE,APART,ARENA,ARGUE,ARISE,ARROW,ASIDE,AUDIO,AVOID,AWARD,AWARE,BADGE,BAKER,BASIC,BEACH,BEGIN,BEING,BELOW,BENCH,BERRY,BIRTH,BLACK,BLADE,BLAME,BLANK,BLAST,BLAZE,BLEND,BLESS,BLIND,BLOCK,BLOOM,BOARD,BONUS,BOOST,BOUND,BRAIN,BRAND,BREAK,BREED,BRIEF,BRING,BROAD,BROWN,BRUSH,BUILD,BUILT,BURST,BUYER,CABLE,CAMEL,CARRY,CATCH,CAUSE,CHAIN,CHAIR,CHALK,CHARM,CHART,CHEAP,CHECK,CHEST,CHIEF,CHILD,CIVIC,CLAIM,CLASS,CLEAN,CLEAR,CLIMB,CLING,CLOSE,CLOTH,COACH,COAST,COLOR,COMET,COMIC,CORAL,COUCH,COULD,COUNT,COURT,COVER,CRASH,CRAWL,CRAZY,CREAM,CREEK,CRIME,CRISP,CROSS,CROWD,CROWN,CRUSH,CURVE,CYCLE,DAILY,DANCE,DEATH,DELAY,DELTA,DENSE,DEPTH,DIARY,DOZEN,DRAFT,DRAIN,DRAMA,DRANK,DRAWN,DREAM,DRESS,DRIFT,DRILL,DRINK,DROVE,EAGER,EARLY,EATEN,EIGHT,ELBOW,ELDER,ELECT,ELITE,EMPTY,ENEMY,ENTER,ENTRY,EQUAL,ERROR,EVENT,EVERY,EXACT,EXIST,EXTRA,FAITH,FALSE,FANCY,FAULT,FAVOR,FEAST,FENCE,FEVER,FIELD,FIFTH,FIFTY,FIGHT,FINAL,FIRST,FIXED,FLAME,FLASH,FLEET,FLESH,FLOAT,FLOOR,FLOUR,FLUID,FOCUS,FORCE,FORGE,FORTH,FORUM,FOUND,FRAME,FRANK,FRESH,FRONT,FROST,FROWN,FRUIT,FULLY,FUNNY,GIANT,GIVEN,GLORY,GRACE,GRADE,GRAIN,GRAND,GRANT,GRAPE,GRAPH,GRASP,GRASS,GREAT,GREEN,GREET,GRILL,GRIND,GROUP,GROWN,GUARD,GUESS,GUEST,GUIDE,HAPPY,HARSH,HEART,HEAVY,HEDGE,HELLO,HONEY,HONOR,HORSE,HOTEL,HOUSE,HUMAN,HUMOR,HURRY,IDEAL,IMAGE,INDEX,INNER,INPUT,INTRO,ISSUE,IVORY,JEANS,JOINT,JOKER,JUDGE,JUICE,KNIFE,KNOCK,KNOWN,LABEL,LABOR,LARGE,LASER,LAUGH,LAYER,LEARN,LEAST,LEAVE,LEGAL,LEVEL,LIGHT,LIMIT,LINEN,LOBBY,LOCAL,LOGIC,LOOSE,LOWER,LOYAL,LUCKY,LUNCH,LYRIC,MAGIC,MAJOR,MAKER,MANGO,MAPLE,MATCH,MAYBE,MAYOR,MEDAL,MEDIA,MERCY,MERIT,METAL,METER,MIGHT,MINOR,MODEL,MOIST,MONEY,MONTH,MORAL,MOTOR,MOUNT,MOVIE,MUSIC,NERVE,NEVER,NIGHT,NOBLE,NOISE,NORTH,NOVEL,NURSE,OCEAN,OFFER,OFTEN,OLIVE,ONION,OPERA,ORBIT,ORDER,ORGAN,OTHER,OUTER,OWNER,PAINT,PANEL,PANIC,PAPER,PARTY,PATCH,PAUSE,PEACE,PEACH,PEARL,PENNY,PHASE,PHONE,PHOTO,PIANO,PIECE,PILOT,PITCH,PIXEL,PIZZA,PLACE,PLAIN,PLANE,PLAZA,POINT,POLAR,PORCH,POUND,POWER,PRESS,PRICE,PRIDE,PRIME,PRINT,PRIZE,PROOF,PROUD,PROVE,PULSE,PUNCH,PUPIL,PURSE,QUEEN,QUERY,QUEST,QUICK,QUILT,QUOTE,RADIO,RAISE,RANGE,RAPID,RATIO,REACH,REACT,READY,REALM,REBEL,RELAX,REPLY,RIDER,RIDGE,RIGHT,RIVER,ROBOT,ROCKY,ROMAN,ROUGH,ROUND,ROUTE,ROYAL,RULER,RURAL,SAINT,SALAD,SCALE,SCARE,SCENE,SCENT,SCOPE,SCORE,SENSE,SERVE,SEVEN,SHADE,SHAKE,SHALL,SHAME,SHAPE,SHARK,SHELL,SHIFT,SHIRT,SHOCK,SHOOT,SHORT,SHOWN,SIGHT,SILLY,SINCE,SIXTH,SIXTY,SKILL,SKIRT,SLEEP,SLICE,SLIDE,SLOPE,SMALL,SMART,SMELL,SMILE,SMOKE,SNAIL,SOLAR,SOLID,SOLVE,SORRY,SOUND,SOUTH,SPACE,SPARE,SPEAK,SPEED,SPELL,SPEND,SPICE,SPINE,SPLIT,SPORT,SPRAY,SQUAD,STACK,STAFF,STAGE,STAIN,STAIR,STAKE,STAMP,STAND,STARE,START,STATE,STEAK,STEAM,STEEL,STEEP,STEER,STICK,STILL,STOCK,STONE,STORE,STORM,STORY,STOVE,STUFF,STYLE,SUGAR,SUITE,SUNNY,SUPER,SWEET,SWIFT,SWING,SWORD,TABLE,TASTE,TEACH,TEETH,TEMPO,THANK,THEIR,THEME,THERE,THICK,THING,THINK,THIRD,THOSE,THREE,THROW,THUMB,TIGHT,TIMER,TITLE,TOAST,TODAY,TOKEN,TOOTH,TOPIC,TORCH,TOTAL,TOUCH,TOUGH,TOWER,TRACE,TRACK,TRADE,TRAIL,TRAIN,TRAIT,TREAT,TREND,TRIAL,TRIBE,TRICK,TRIED,TRULY,TRUST,TRUTH,TWICE,TWIST,ULTRA,UNCLE,UNDER,UNION,UNITE,UNITY,UNTIL,UPPER,UPSET,URBAN,USAGE,USUAL,VALID,VALUE,VIDEO,VISIT,VITAL,VIVID,VOCAL,VOICE,VOTER,WAGON,WATCH,WATER,WHALE,WHEAT,WHEEL,WHERE,WHICH,WHILE,WHITE,WHOLE,WHOSE,WIDTH,WOMAN,WORLD,WORRY,WORTH,WOULD,WRIST,WRITE,WRONG,WROTE,YACHT,YIELD,YOUNG,YOUTH,ZEBRA'

const WORD_SLOTS: ScaffoldSlots = {
  titleText: 'WORD GUESS',
  sky0: '#fff3e6',
  sky1: '#ffe5ec',
  sky2: '#e0e5ff',
  blob: '#fae29c',
  ink: '#242c3b',
  good: '#3ec46d',
  near: '#ffd23f',
  miss: '#bdbdbd',
  keyBg: '#e0e0e0',
  delBg: '#29c7fa',
  hintColor: '#e71d36',
  words: '',
}

/** Guess-the-word grid (Wordle Mini): 6×5 grid + canvas keyboard, green/yellow/grey feedback. */
function wordBody(): string {
  return `
const LAYOUT_PLAN = ${planJson(WORD_PLAN)}
const SLOTS = ${slotsJson(WORD_SLOTS)}
const BUILTIN = '${WORD_BUILTIN}'
const CUSTOM = String(SLOTS.words || '').toUpperCase().split(',').map(function(s){ return s.trim() }).filter(function(s){ return /^[A-Z]{5}$/.test(s) })
const WORDS = CUSTOM.length >= 10 ? CUSTOM : BUILTIN.split(',')
const KB = ['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), 'ZXCVBNM'.split('').concat(['DEL'])]
let L={}, R={ cells: [], keys: [], enter: null }
let answer='', phase='play', board=[], row=0, col=0, result='', hintMsg='', kbState={}, wins=0
function layoutRects(){ return L }
function layout(){
  L = GS.layoutFromPlan(LAYOUT_PLAN, W, H)
  R = { cells: [], keys: [], enter: null }
  var g = L.grid
  var gapC = Math.max(4, Math.min(g.w, g.h) * 0.018)
  var cell = Math.min((g.w - gapC * 4) / 5, (g.h - gapC * 5) / 6)
  var usedW = cell * 5 + gapC * 4
  var usedH = cell * 6 + gapC * 5
  var gx = g.x + (g.w - usedW) / 2
  var gy = g.y + (g.h - usedH) / 2
  for (var r = 0; r < 6; r++){
    for (var c = 0; c < 5; c++){
      R.cells.push({ x: gx + c * (cell + gapC), y: gy + r * (cell + gapC), w: cell, h: cell })
    }
  }
  R.gridBox = { x: gx, y: gy, w: usedW, h: usedH }
  var kb = L.kb
  var rowGap = Math.max(6, kb.h * 0.03)
  var keyGap = Math.max(3, Math.min(6, kb.w * 0.012))
  var enterH = Math.max(40, kb.h * 0.2)
  var letterAreaH = kb.h - enterH - rowGap
  var letterW = (kb.w - keyGap * 9) / 10
  var keyH = (letterAreaH - 2 * rowGap) / 3
  var ky = kb.y
  for (var i = 0; i < 3; i++){
    var keys = KB[i]
    var widths = keys.map(function(l){ return l === 'DEL' ? letterW * 1.5 : letterW })
    var totalW = widths.reduce(function(a, b){ return a + b }, 0) + keyGap * (keys.length - 1)
    var kx = kb.x + Math.max(0, (kb.w - totalW) / 2)
    for (var j = 0; j < keys.length; j++){
      R.keys.push({ x: kx, y: ky, w: widths[j], h: keyH, label: keys[j] })
      kx += widths[j] + keyGap
    }
    ky += keyH + rowGap
  }
  var enterW = Math.min(kb.w, letterW * 6 + keyGap * 5)
  R.enter = { x: kb.x + (kb.w - enterW) / 2, y: kb.y + kb.h - enterH, w: enterW, h: enterH }
}
function onResize(){ layout() }
function diePos(){
  var g = L.grid || { x: 0, y: 0, w: W, h: H }
  return [g.x + g.w / 2, g.y + g.h / 2]
}
function scorePos(){ return diePos() }
function emptyBoard(){
  var b = []
  for (var r = 0; r < 6; r++){
    var rowArr = []
    for (var c = 0; c < 5; c++) rowArr.push('')
    b.push(rowArr)
  }
  return b
}
function pickWord(){ return WORDS[(Math.random() * WORDS.length) | 0] }
function nextWord(){
  answer = pickWord()
  board = emptyBoard()
  row = 0
  col = 0
  result = ''
  phase = 'play'
  hintMsg = ''
  kbState = {}
}
function reset(){
  layout()
  wins = 0
  nextWord()
  setScore(0)
}
function onHostStart(){ reset() }
function die(){ phase = 'fail'; result = answer }
function letterColor(r, c){
  if (!board[r]) return String(SLOTS.keyBg)
  if (phase === 'play' && r > row) return String(SLOTS.keyBg)
  if (phase === 'play' && r === row) return board[r][c] ? '#f5f5f5' : String(SLOTS.keyBg)
  var chv = board[r][c]
  if (!chv) return String(SLOTS.keyBg)
  if (answer[c] === chv) return String(SLOTS.good)
  if (answer.indexOf(chv) >= 0) return String(SLOTS.near)
  return String(SLOTS.miss)
}
function updateKbState(){
  for (var r = 0; r < row; r++){
    for (var c = 0; c < 5; c++){
      var chv = board[r][c]
      if (!chv) continue
      var state = 'grey'
      if (answer[c] === chv) state = 'green'
      else if (answer.indexOf(chv) >= 0) state = 'yellow'
      if (kbState[chv] === 'green') continue
      if (state === 'green' || (state === 'yellow' && kbState[chv] !== 'green')) kbState[chv] = state
      else if (!kbState[chv]) kbState[chv] = state
    }
  }
}
function pointerXY(e){
  var r = canvas.getBoundingClientRect()
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
}
function hitRect(o, x, y){ return o && x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h }
function submitGuess(){
  if (col < 5){ hintMsg = 'Fill all 5 letters'; return }
  var guess = board[row].join('')
  if (guess === answer){
    row++
    updateKbState()
    row--
    phase = 'win'
    result = answer
    wins++
    var pts = Math.max(1, 6 - row) * 10 * wins
    bump(pts)
    hintMsg = ''
    if (typeof Juice !== 'undefined' && Juice.burst){
      var g = R.gridBox || L.grid
      Juice.burst(g.x + g.w / 2, g.y + g.h / 2)
    }
    return
  }
  row++
  updateKbState()
  col = 0
  hintMsg = ''
  if (row >= 6) die()
}
function tick(dt){ if (GS.paused) return }
function draw(){
  if (!R.cells.length || !R.enter) layout()
  if (!board.length) board = emptyBoard()
  PF.sky(ctx, W, H, String(SLOTS.sky0), String(SLOTS.sky1), String(SLOTS.sky2))
  PF.blobs(ctx, W, H, String(SLOTS.blob), 3)
  var t = L.title
  ctx.save()
  ctx.font = '700 ' + Math.floor(t.h * 0.82) + 'px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = String(SLOTS.ink)
  ctx.fillText(String(SLOTS.titleText), t.x + t.w / 2, t.y + t.h * 0.78)
  ctx.restore()
  ctx.save()
  for (var r = 0; r < 6; r++){
    for (var c = 0; c < 5; c++){
      var cell = R.cells[r * 5 + c]
      ctx.beginPath()
      PF.rr(ctx, cell.x, cell.y, cell.w, cell.h, Math.min(cell.w, cell.h) * 0.15)
      ctx.fillStyle = letterColor(r, c)
      ctx.fill()
      var chv = board[r] && board[r][c]
      if (chv){
        ctx.font = '700 ' + Math.floor(cell.h * 0.55) + 'px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = String(SLOTS.ink)
        ctx.fillText(chv, cell.x + cell.w / 2, cell.y + cell.h * 0.68)
      }
    }
  }
  ctx.restore()
  ctx.save()
  var hb = L.hint
  ctx.font = '600 ' + Math.floor(hb.h * 0.7) + 'px sans-serif'
  ctx.fillStyle = String(SLOTS.hintColor)
  ctx.textAlign = 'center'
  var hint = phase === 'win' ? 'You got it! Tap grid for next word'
    : phase === 'fail' ? ('Answer: ' + result + ' — tap grid to replay')
    : hintMsg
  ctx.fillText(hint, hb.x + hb.w / 2, hb.y + hb.h * 0.75)
  ctx.restore()
  ctx.save()
  for (var k = 0; k < R.keys.length; k++){
    var key = R.keys[k]
    ctx.beginPath()
    PF.rr(ctx, key.x, key.y, key.w, key.h, Math.min(key.w, key.h) * 0.22)
    var bg = String(SLOTS.keyBg), fg = String(SLOTS.ink)
    if (key.label === 'DEL'){ bg = String(SLOTS.delBg); fg = '#fff' }
    if (/^[A-Z]$/.test(key.label) && kbState[key.label]){
      if (kbState[key.label] === 'green') bg = String(SLOTS.good)
      else if (kbState[key.label] === 'yellow') bg = String(SLOTS.near)
      else bg = String(SLOTS.miss)
      fg = '#fff'
    }
    ctx.fillStyle = bg
    ctx.fill()
    var long = key.label.length > 1
    ctx.font = '700 ' + Math.floor(key.h * (long ? 0.32 : 0.42)) + 'px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = fg
    ctx.fillText(key.label, key.x + key.w / 2, key.y + key.h * 0.66)
  }
  var btn = R.enter
  ctx.beginPath()
  PF.rr(ctx, btn.x, btn.y, btn.w, btn.h, Math.min(btn.w, btn.h) * 0.28)
  ctx.fillStyle = String(SLOTS.ink)
  ctx.fill()
  ctx.font = '700 ' + Math.floor(btn.h * 0.42) + 'px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.fillText('Enter', btn.x + btn.w / 2, btn.y + btn.h * 0.66)
  ctx.restore()
}
canvas.addEventListener('pointerdown', function(e){
  if (GS.paused) return
  if (!R.keys.length || !R.enter) layout()
  var p = pointerXY(e)
  if (phase === 'play'){
    if (hitRect(R.enter, p.x, p.y)){ submitGuess(); return }
    for (var i = 0; i < R.keys.length; i++){
      var key = R.keys[i]
      if (!hitRect(key, p.x, p.y)) continue
      if (key.label === 'DEL'){
        if (col > 0){ col--; board[row][col] = '' }
      } else if (col < 5 && /^[A-Z]$/.test(key.label)){
        board[row][col] = key.label
        col++
      }
      break
    }
  } else if (phase === 'win'){
    if (hitRect(L.grid, p.x, p.y)) nextWord()
  } else if (phase === 'fail'){
    if (hitRect(L.grid, p.x, p.y)) reset()
  }
})
layout()
nextWord()
`.trim()
}

const SCAFFOLDS: Record<ArcadeFamily, MechanicScaffold> = {
  reaction: {
    family: 'reaction',
    layoutPlan: REACTION_PLAN,
    defaultSlots: { ...REACTION_SLOTS },
    bodyJs: reactionBody(),
    slotGuide:
      'titleText, ctaIdle/Wait/Go/Foul/Again, sky0-2, blob, dot, btn0-1, lampRed, lampGo, waitMin, waitSpan',
  },
  timing: {
    family: 'timing',
    layoutPlan: TIMING_PLAN,
    defaultSlots: {
      titleText: 'TIMING',
      hintText: 'Tap when rings meet',
      sky0: '#231942',
      sky1: '#3c096c',
      sky2: '#5a189a',
      blob: '#7b2cbf',
      dot: '#e0aaff',
      spawnEvery: 1.2,
    },
    bodyJs: timingBody(),
    slotGuide: 'titleText, hintText, sky0-2, blob, dot, spawnEvery',
  },
  dodge: {
    family: 'dodge',
    layoutPlan: DODGE_PLAN,
    defaultSlots: {
      titleText: 'DODGE',
      sky0: '#0d1b2a',
      sky1: '#1d3557',
      sky2: '#457b9d',
      blob: '#457b9d',
      dot: '#a8dadc',
      buddy0: '#a8dadc',
      buddy1: '#48cae4',
      hazard0: '#ff8fa3',
      hazard1: '#e63946',
      speed: 220,
    },
    bodyJs: dodgeBody(),
    slotGuide: 'titleText, sky0-2, blob, dot, buddy0-1, hazard0-1, speed',
  },
  drag: {
    family: 'drag',
    layoutPlan: DRAG_PLAN,
    defaultSlots: {
      titleText: 'Catch green',
      sky0: '#240046',
      sky1: '#3c096c',
      sky2: '#5a189a',
      blob: '#7b2cbf',
      dot: '#e0aaff',
      buddy0: '#9d4edd',
      buddy1: '#7b2cbf',
      goodRate: 0.65,
    },
    bodyJs: dragBody(),
    slotGuide: 'titleText, sky0-2, blob, dot, buddy0-1, goodRate',
  },
  stack: {
    family: 'stack',
    layoutPlan: STACK_PLAN,
    defaultSlots: {
      titleText: 'STACK',
      sky0: '#3d1f14',
      sky1: '#7b2d26',
      sky2: '#e09f3e',
      blob: '#e09f3e',
      dot: '#ffe8a3',
      block0: '#ffe066',
      block1: '#f4d35e',
      cur0: '#ffffff',
      cur1: '#e9ecef',
    },
    bodyJs: stackBody(),
    slotGuide: 'titleText, sky0-2, blob, dot, block0-1, cur0-1',
  },
  merge: {
    family: 'merge',
    layoutPlan: MERGE_PLAN,
    defaultSlots: { ...MERGE_SLOTS },
    bodyJs: mergeBody(),
    slotGuide:
      'sky0-2, dot, tiers (csv of 6-11 hex colors, small→big), faces (csv emoji per tier, optional), dangerMs, dropCooldown',
  },
  sort: {
    family: 'sort',
    layoutPlan: SORT_PLAN,
    defaultSlots: { ...SORT_SLOTS },
    bodyJs: sortBody(),
    slotGuide:
      'sky0-2, blob, halftone, colors (csv of 4-6 hex liquids), ink, rim, sel, giveColor, giveText, badgeColor',
  },
  grid: {
    family: 'grid',
    layoutPlan: GRID_PLAN,
    defaultSlots: { ...GRID_SLOTS },
    bodyJs: gridBody(),
    slotGuide:
      'sky0-2, dot, faces (csv of 8 symbols/emoji), faceColors (csv of 8 hex), back0-1, matchPts',
  },
  word: {
    family: 'word',
    layoutPlan: WORD_PLAN,
    defaultSlots: { ...WORD_SLOTS },
    bodyJs: wordBody(),
    slotGuide:
      'titleText, sky0-2, blob, ink, good, near, miss, keyBg, delBg, hintColor, words (csv of 5-letter A-Z words, optional theme, min 10)',
  },
}

/** @deprecated Prefer hasArcadeScaffold — custom must NOT map to reaction. */
export function resolveScaffoldFamily(family: MechanicFamily): ArcadeFamily {
  if (!hasArcadeScaffold(family)) {
    throw new Error(`No arcade scaffold for family "${family}" — use freeform custom path`)
  }
  return family
}

export function getScaffold(family: MechanicFamily): MechanicScaffold {
  if (!hasArcadeScaffold(family)) {
    throw new Error(`No arcade scaffold for family "${family}"`)
  }
  return SCAFFOLDS[family]
}

export function parseScaffoldSlots(raw: unknown): ScaffoldSlots | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: ScaffoldSlots = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number') out[k.slice(0, 40)] = v
  }
  return Object.keys(out).length ? out : null
}

/** Merge slot overrides into scaffold defaults and rewrite `const SLOTS = …` in bodyJs. */
export function applyScaffoldSlots(
  bodyJs: string,
  defaults: ScaffoldSlots,
  overrides?: ScaffoldSlots | null,
): string {
  const merged: ScaffoldSlots = { ...defaults, ...(overrides || {}) }
  const json = JSON.stringify(merged)
  // SLOTS is always emitted as a single-line JSON object.
  if (/const SLOTS\s*=\s*\{[^\n]*\}/.test(bodyJs)) {
    return bodyJs.replace(/const SLOTS\s*=\s*\{[^\n]*\}/, `const SLOTS = ${json}`)
  }
  return bodyJs
}

export function bodyReferencesSlots(bodyJs: string): boolean {
  return /\bSLOTS\s*[.\[]/.test(bodyJs)
}

export function bodyHasSlotsBinding(bodyJs: string): boolean {
  return /const\s+SLOTS\s*=/.test(bodyJs)
}

/** True when draw/tick will throw ReferenceError: SLOTS is not defined. */
export function missingSlotsBinding(bodyJs: string): boolean {
  return bodyReferencesSlots(bodyJs) && !bodyHasSlotsBinding(bodyJs)
}

/** Replace embedded LAYOUT_PLAN array after deterministic plan mutations. */
export function replaceLayoutPlanInBody(bodyJs: string, plan: LayoutRect[]): string {
  const json = JSON.stringify(plan)
  if (/const LAYOUT_PLAN\s*=\s*\[[\s\S]*?\]/.test(bodyJs)) {
    return bodyJs.replace(/const LAYOUT_PLAN\s*=\s*\[[\s\S]*?\]/, `const LAYOUT_PLAN = ${json}`)
  }
  return bodyJs
}

export function materializeScaffold(
  family: MechanicFamily,
  slots?: ScaffoldSlots | null,
): { family: ArcadeFamily; bodyJs: string; layoutPlan: LayoutRect[] } {
  const scaffold = getScaffold(family)
  return {
    family: scaffold.family,
    layoutPlan: scaffold.layoutPlan.map((r) => ({ ...r })),
    bodyJs: applyScaffoldSlots(scaffold.bodyJs, scaffold.defaultSlots, slots),
  }
}

export function scaffoldSeedMessage(family: ArcadeFamily): string {
  const scaffold = getScaffold(family)
  return [
    `Selected mechanic family: ${family} (arcade scaffold).`,
    'GOLDEN SCAFFOLD PATH — do NOT invent coordinates or rewrite layout()/LAYOUT_PLAN.',
    'Server injects a locked playable body. Return game with:',
    '- title, tip, accent, bg, mechanic',
    `- slots: object overriding theme/labels only (${scaffold.slotGuide})`,
    '- layoutPlan: copy the scaffold plan unchanged (or omit — server uses scaffold plan)',
    '- bodyJs: "" (empty — server fills from golden scaffold)',
    'Default slots JSON for reference:',
    JSON.stringify(scaffold.defaultSlots),
    'Scaffold layoutPlan:',
    JSON.stringify(scaffold.layoutPlan),
  ].join('\n')
}

/** Seed for novel / custom games — full bodyJs, layout-checked, not an arcade substitute. */
export function customFreeformSeedMessage(): string {
  return [
    'Selected mechanic family: custom (FREEFORM PATH).',
    'Build the game the user asked for — Wordle, puzzles, novel rules, etc.',
    'Do NOT substitute a reaction / timing / dodge / drag / stack arcade loop unless they asked for that.',
    'Return phase="generated" with title, tip, accent, bg, mechanic:"custom", layoutPlan, and complete bodyJs.',
    freeformChromeSeedSection(DEFAULT_PORTRAIT_CHROME),
    'Same host contract as official games: PF.sky + helpers, scorePos/diePos, pointer via getBoundingClientRect, no DOM controls.',
  ].join('\n')
}

/** First-build seed: arcade scaffold vs freeform custom. */
export function firstBuildSeedMessage(family: MechanicFamily): string {
  return hasArcadeScaffold(family) ? scaffoldSeedMessage(family) : customFreeformSeedMessage()
}
