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

function reactionBody(): string {
  const slots: ScaffoldSlots = {
    titleText: 'REACT',
    ctaIdle: 'START',
    ctaWait: 'WAIT',
    ctaGo: 'TAP!',
    ctaFoul: 'TOO EARLY',
    ctaAgain: 'AGAIN',
    sky0: '#1b1f3b',
    sky1: '#2d3561',
    sky2: '#4a5180',
    blob: '#3d4570',
    dot: '#c8d0ff',
    btn0: '#264653',
    btn1: '#1d3557',
    waitMin: 1,
    waitSpan: 2,
  }
  return `
const LAYOUT_PLAN = ${planJson(REACTION_PLAN)}
const SLOTS = ${slotsJson(slots)}
let L = {}, phase='idle', waitLeft=0, reactAt=0, flash=0
function layoutRects(){ return L }
function scorePos(){ const f=L.focus||{x:0,y:0,w:W,h:H}; return [f.x+f.w/2, f.y+f.h/2] }
function diePos(){ return scorePos() }
function layout(){ L = GS.layoutFromPlan(LAYOUT_PLAN, W, H) }
function reset(){ phase='idle'; waitLeft=0; flash=0; setScore(0); layout() }
function die(){ phase='foul'; waitLeft=0.9 }
function hit(id,x,y){ const r=L[id]; return r && x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h }
function pointerXY(e){ const r=canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) } }
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown',(e)=>{
  if(GS.paused) return
  const {x,y}=pointerXY(e)
  if(phase==='idle'&&hit('start',x,y)){ phase='waiting'; waitLeft=Number(SLOTS.waitMin)+Math.random()*Number(SLOTS.waitSpan); return }
  if(phase==='waiting'){ die(); return }
  if(phase==='go'){ setScore(Math.max(1,Math.round(performance.now()-reactAt))); phase='result'; waitLeft=1.4; flash=0.2; return }
  if((phase==='result'||phase==='foul')&&hit('start',x,y)) reset()
})
function tick(dt){
  if(GS.paused) return
  flash=Math.max(0,flash-dt)
  if(phase==='waiting'){ waitLeft-=dt; if(waitLeft<=0){ phase='go'; reactAt=performance.now() } }
  else if(phase==='result'||phase==='foul'){ waitLeft-=dt; if(waitLeft<=0) reset() }
}
function draw(){
  if(!L.start) layout()
  PF.sky(ctx,W,H,String(SLOTS.sky0),String(SLOTS.sky1),String(SLOTS.sky2))
  PF.blobs(ctx,W,H,String(SLOTS.blob),5)
  PF.dots(ctx,W,H,String(SLOTS.dot),14,0.7)
  const t=L.title, f=L.focus, b=L.start
  ctx.fillStyle='#fff'; ctx.textAlign='center'
  ctx.font='700 '+Math.floor(t.h*0.85)+'px sans-serif'
  ctx.fillText(String(SLOTS.titleText), t.x+t.w/2, t.y+t.h*0.8)
  const pulse=phase==='go'?1+Math.sin(PF.t*18)*0.08:1
  const c0=phase==='go'?'#2ec4b6':phase==='waiting'?'#ff9f1c':'#e71d36'
  const c1=phase==='go'?'#20a4a0':phase==='waiting'?'#f4a261':'#c1121f'
  PF.soft(ctx, f.x+f.w/2, f.y+f.h/2, Math.min(f.w,f.h)*0.42*pulse*(flash>0?1.12:1), c0, c1)
  PF.block(ctx,b.x,b.y,b.w,b.h,String(SLOTS.btn0),String(SLOTS.btn1),14)
  ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(b.h*0.45)+'px sans-serif'
  const label=phase==='idle'?SLOTS.ctaIdle:phase==='waiting'?SLOTS.ctaWait:phase==='go'?SLOTS.ctaGo:phase==='foul'?SLOTS.ctaFoul:SLOTS.ctaAgain
  ctx.fillText(String(label), b.x+b.w/2, b.y+b.h*0.68)
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

const SCAFFOLDS: Record<ArcadeFamily, MechanicScaffold> = {
  reaction: {
    family: 'reaction',
    layoutPlan: REACTION_PLAN,
    defaultSlots: {
      titleText: 'REACT',
      ctaIdle: 'START',
      ctaWait: 'WAIT',
      ctaGo: 'TAP!',
      ctaFoul: 'TOO EARLY',
      ctaAgain: 'AGAIN',
      sky0: '#1b1f3b',
      sky1: '#2d3561',
      sky2: '#4a5180',
      blob: '#3d4570',
      dot: '#c8d0ff',
      btn0: '#264653',
      btn1: '#1d3557',
      waitMin: 1,
      waitSpan: 2,
    },
    bodyJs: reactionBody(),
    slotGuide: 'titleText, ctaIdle/Wait/Go/Foul/Again, sky0-2, blob, dot, btn0-1, waitMin, waitSpan',
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
