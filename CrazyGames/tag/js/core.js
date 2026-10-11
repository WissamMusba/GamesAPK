
"use strict";
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rand=(a,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
const easeBack=t=>{t=clamp(t,0,1);const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);if(r<0)r=0;g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')';}
const FT=px=>'900 '+px+'px "'+FAMILIES[fontIdx]+'",system-ui,sans-serif';
const FN=(px,w)=>(w||800)+' '+px+'px "'+FAMILIES[fontIdx]+'",system-ui,sans-serif';
const FAMILIES=['Outfit','Bebas Neue','Anton','Bangers','Black Han Sans','Luckiest Guy','Righteous','Fredoka One','Baloo 2','Nunito','Poppins','Montserrat','Titan One','Chewy','MuseoModerno','Comfortaa','Space Grotesk','Orbitron','Russo One','Staatliches'];
const PINNED_FONTIdx=8; // font #9 = Baloo 2 — pinned for CrazyGames
let fontIdx=PINNED_FONTIdx;
function cycleFont(d){ toast('Fonts locked to pinned pick #' + (PINNED_FONTIdx+1) + ' — ' + FAMILIES[PINNED_FONTIdx]); }
const INK='#141414';

const cv=document.getElementById('g'),g=cv.getContext('2d'); window.renderCtx = g;
let CW=0,CH=0,DPR=1;
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;

function resize(){
  const docW = (document.documentElement && document.documentElement.clientWidth) ? document.documentElement.clientWidth : (window.innerWidth || 800);
  const docH = (document.documentElement && document.documentElement.clientHeight) ? document.documentElement.clientHeight : (window.innerHeight || 600);
  const rect = cv.getBoundingClientRect();
  const rawW = (rect.width > 0 && rect.width <= docW) ? rect.width : docW;
  const rawH = (rect.height > 0 && rect.height <= docH) ? rect.height : docH;
  CW = Math.floor(Math.min(rawW, docW));
  CH = Math.floor(Math.min(rawH, docH));
  const maxDpr = isTouch ? 1.5 : 2.0;
  DPR = Math.min(maxDpr, window.devicePixelRatio || 1);
  cv.width = Math.floor(CW * DPR);
  cv.height = Math.floor(CH * DPR);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { setTimeout(resize, 50); setTimeout(resize, 220); });
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', resize);
}
resize();
cv.style.touchAction='none';

function getCanvasCoords(clientX, clientY){
  const rect = cv.getBoundingClientRect();
  const scaleX = rect.width ? (CW / rect.width) : 1;
  const scaleY = rect.height ? (CH / rect.height) : 1;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function grabFocus(){try{window.focus();}catch(e){}}
window.addEventListener('load',grabFocus);grabFocus();

/* ================= keyboard shield (laptop room code & chat typing fix) ================= */
function isInputActive(){
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/* ================= input ================= */
const keys=new Set(),pressed=new Set();
const GAMEKEYS=new Set([
  'ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',
  'KeyW','KeyA','KeyS','KeyD',
  'KeyI','KeyJ','KeyK','KeyL',
  'KeyT','KeyF','KeyG','KeyH',
  'Enter','NumpadEnter','KeyM','KeyP','KeyN','KeyB','Digit1','Digit2','Digit3','Digit4',
  'Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Tab'
]);
let scoreboardOpen=false;
function onKey(e){
  if(isInputActive()){
    // Shield all game controls while typing in room code or chat input!
    return;
  }
  if(e.code === 'Tab'){
    e.preventDefault();
    if(match && screen === 'game'){
      scoreboardOpen = !scoreboardOpen;
      sfx('ui');
    }
    return;
  }
  if(e.code === 'Enter' || e.code === 'NumpadEnter'){
    if(typeof NET !== 'undefined' && NET && NET.role !== null){
      if(typeof chatToggle === 'function'){
        e.preventDefault();
        chatToggle();
        return;
      }
    }
  }
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(GAMEKEYS.has(e.code))e.preventDefault();
  if(e.repeat)return;
  keys.add(e.code);pressed.add(e.code);initAudio();
}
window.addEventListener('keydown',onKey);
window.addEventListener('keyup',e=>{
  if(isInputActive()) return;
  keys.delete(e.code);
});
window.addEventListener('blur',()=>{keys.clear();touchPts.clear();});
window.addEventListener('contextmenu',e=>e.preventDefault());
const anyPressed=list=>{for(const k of list)if(pressed.has(k))return true;return false;};

