/* ================= constants ================= */
const W=2400,H=1320,WALL=60;

/* --- TUNED CRISP PHYSICS WITH PARKOUR & CONTROLLED BLUE BOOST --- */
const G=2100;
const JUMP_V=990;               /* Tap jump (~233px). Holding jump sustains lift briefly (see HOLD_LIFT) */
const HOLD_LIFT_T=0.10;         /* Max extra-lift time while jump is held (full hold ≈270px, just above old 257px) */
const HOLD_GRAV_F=0.6;          /* Gravity multiplier during held lift */
const MAXFALL=1600;
const RUN_SPEED=504,IT_SPEED=582;       /* ~1.155x hunter edge (582/504); modes override via get*Speed */
const ACC=8400,DECEL=11400;      /* Razor-sharp acceleration & instant stopping */
const AIR_ACC=6240,AIR_DEC=4320; /* Responsive mid-air jukes without floaty sliding */
const SPEED_MULT=1.55;
const BOOST_MULT=1.31;           /* Blue pad jump: clean ~346px boost, just before apex of double jump! */

// Online player cap: 10 slots (0..9). Offline/local stays 4.
const MAXP = 10;
const PALETTE=[
  {name:'CHERRY',c:'#e8433f'},{name:'SUNNY',c:'#f5a623'},{name:'SKY',c:'#2f9be8'},
  {name:'GRAPE',c:'#a06cd5'},{name:'MINT',c:'#27c487'},{name:'PINK',c:'#f06292'},
  {name:'CYAN',c:'#00d2d3'},{name:'LIME',c:'#a8e024'},
  {name:'ORANGE',c:'#ff7f11'},{name:'SILVER',c:'#ecf0f1'}
];

const TEAMS = [
  { name: 'RED TEAM', icon: '🔴', base: '#e8433f', shades: ['#e8433f', '#ff6b6b', '#b81414', '#f06595', '#ff8c42'] },
  { name: 'BLUE TEAM', icon: '🔵', base: '#2f9be8', shades: ['#2f9be8', '#00d2d3', '#1b4f9c', '#5f27cd', '#7ed6ff'] },
  { name: 'GREEN TEAM', icon: '🟢', base: '#27c487', shades: ['#27c487', '#a8e024', '#10ac84', '#1dd1a1', '#55efc4'] },
  { name: 'YELLOW TEAM', icon: '🟡', base: '#f5a623', shades: ['#f5a623', '#feca57', '#ff9f43', '#ffeaa7', '#fff3b0'] }
];

const MODES=['party','teams','ctf','freeze','infection','bomb','crown','hunter'];
const TIMES=[60,120,180];
const SHORT_TIMES=[30,60,90];
const settings={map:0,randomMap:false,doubleJump:true,collision:false,timeIdx:1,shortTimeIdx:1,teams:false,botDifficulty:'hard',gameMode:'party',ctfTargetCaptures:3,hunterRed:0,hunterBlue:1,hunterRotate:false};
Object.defineProperty(settings,'time',{
  get(){
    if(this.gameMode === 'freeze' || this.gameMode === 'infection'){
      return SHORT_TIMES[this.shortTimeIdx != null ? this.shortTimeIdx : 1];
    }
    return TIMES[this.timeIdx != null ? this.timeIdx : 1];
  },
  set(v){
    if(this.gameMode === 'freeze' || this.gameMode === 'infection'){
      const idx = SHORT_TIMES.indexOf(v);
      if(idx >= 0) this.shortTimeIdx = idx;
      else this.shortTimeIdx = 1;
    } else {
      const idx = TIMES.indexOf(v);
      if(idx >= 0) this.timeIdx = idx;
      else this.timeIdx = 1;
    }
  }
});

/* ================= LOCAL CONTROLS SCHEMES ================= */
const LOCAL_CTRL_SCHEMES = [
  { id: 'wasd', label: 'WASD', map: { L: ['KeyA','KeyQ'], R: 'KeyD', U: ['KeyW','Space'], D: 'KeyS' } },
  { id: 'arrows', label: 'ARROWS', map: { L: 'ArrowLeft', R: 'ArrowRight', U: ['ArrowUp','Numpad0'], D: 'ArrowDown' } },
  { id: 'ijkl', label: 'IJKL', map: { L: 'KeyJ', R: 'KeyL', U: 'KeyI', D: 'KeyK' } },
  { id: 'tfgh', label: 'TFGH', map: { L: 'KeyF', R: 'KeyH', U: 'KeyT', D: 'KeyG' } },
  { id: 'controller', label: 'CONTROLLER', map: {} },
  { id: 'bot', label: '🤖 BOT', map: {} }
];

function cycleSlotCtrl(slot, d){
  if(!menu.slotCtrl) menu.slotCtrl = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
  const total = LOCAL_CTRL_SCHEMES.length;
  let cur = menu.slotCtrl[slot] != null ? menu.slotCtrl[slot] : slot;
  if(typeof isSlotBot === 'function' && isSlotBot(slot)){
    cur = LOCAL_CTRL_SCHEMES.findIndex(s => s.id === 'bot');
    if(cur < 0) cur = total - 1;
  }
  
  // Find keyboard schemes already taken by other active players
  const taken = new Set();
  const act = (typeof activeSlots === 'function') ? activeSlots() : [0, 1];
  for(const other of act){
    if(other !== slot && !(typeof isSlotBot === 'function' && isSlotBot(other))){
      const otherIdx = menu.slotCtrl[other];
      if(otherIdx != null){
        const s = LOCAL_CTRL_SCHEMES[((otherIdx % total) + total) % total];
        if(s && s.id !== 'controller' && s.id !== 'bot'){
          taken.add(s.id);
        }
      }
    }
  }

  // Cycle to next available scheme, skipping taken keyboard schemes
  for(let step = 1; step <= total; step++){
    const nextIdx = ((cur + d * step) % total + total) % total;
    const candidate = LOCAL_CTRL_SCHEMES[nextIdx];
    if(!candidate) continue;
    if(!taken.has(candidate.id) || candidate.id === 'controller' || candidate.id === 'bot'){
      menu.slotCtrl[slot] = nextIdx;
      if(!menu.slotIsBot) menu.slotIsBot = [false, false, false, false, false, false, false, false, false, false];
      if(candidate.id === 'bot'){
        menu.slotIsBot[slot] = true;
        toast('🤖 P' + (slot+1) + ' SET TO BOT');
      } else {
        menu.slotIsBot[slot] = false;
        toast('🎮 P' + (slot+1) + ': ' + candidate.label);
      }
      break;
    }
  }
  sfx('ui');
}

const SLOTS=[
  {label:'WASD',pad:0,map:{L:['KeyA','KeyQ'],R:'KeyD',U:['KeyW','Space'],D:'KeyS'}},
  {label:'↑←↓→',pad:1,map:{L:'ArrowLeft',R:'ArrowRight',U:'ArrowUp',D:'ArrowDown'}},
  {label:'IJKL',pad:2,map:{L:'KeyJ',R:'KeyL',U:'KeyI',D:'KeyK'}},
  {label:'TFGH',pad:3,map:{L:'KeyF',R:'KeyH',U:'KeyT',D:'KeyG'}},
  {label:'P5 (NET)',pad:4,map:{L:['KeyA'],R:'KeyD',U:['KeyW','Space'],D:'KeyS'}},
  {label:'P6 (NET)',pad:5,map:{L:['KeyA'],R:'KeyD',U:['KeyW','Space'],D:'KeyS'}},
  {label:'P7 (NET)',pad:6,map:{L:['KeyA'],R:'KeyD',U:['KeyW','Space'],D:'KeyS'}},
  {label:'P8 (NET)',pad:7,map:{L:['KeyA'],R:'KeyD',U:['KeyW','Space'],D:'KeyS'}},
  {label:'P9 (NET)',pad:8,map:{L:['KeyA'],R:'KeyD',U:['KeyW','Space'],D:'KeyS'}},
  {label:'P10 (NET)',pad:9,map:{L:['KeyA'],R:'KeyD',U:['KeyW','Space'],D:'KeyS'}}
];

function getPlayerColor(p, pList){
  if(!p) return '#ffffff';
  if(settings.gameMode === 'infection' && p.isInfected){
    if(p.zombieColor) return p.zombieColor;
    const ZOMBIE_GREENS = ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#84cc16', '#65a30d', '#a3e635', '#10b981'];
    const idx = (p.infectionOrder != null && p.infectionOrder >= 0) ? p.infectionOrder : (p.slot || 0);
    return ZOMBIE_GREENS[idx % ZOMBIE_GREENS.length];
  }
  if(settings.teams){
    const teamIdx = p.team != null ? (p.team % TEAMS.length) : 0;
    const teamDef = TEAMS[teamIdx] || TEAMS[0];
    const list = pList || (match ? match.players : []);
    const mates = list.filter(o => o.team === p.team);
    const rank = Math.max(0, mates.findIndex(o => o.slot === p.slot));
    return teamDef.shades[rank % teamDef.shades.length] || teamDef.base;
  }
  const c = p.colIdx != null ? p.colIdx : p.slot;
  return (PALETTE[c >= 0 ? c % PALETTE.length : p.slot % PALETTE.length] || PALETTE[0]).c;
}

function getSlotColor(slot, slotColorArr, slotTeamArr){
  if(settings.teams){
    const teamIdx = (slotTeamArr && slotTeamArr[slot] != null) ? (slotTeamArr[slot] % TEAMS.length) : (slot % 2);
    const teamDef = TEAMS[teamIdx] || TEAMS[0];
    let rank = 0;
    const max = (slotColorArr && slotColorArr.length) || MAXP;
    for(let s = 0; s < slot; s++){
      if((slotColorArr ? slotColorArr[s] >= 0 : true) && slotTeamArr && slotTeamArr[s] === teamIdx) rank++;
    }
    return teamDef.shades[rank % teamDef.shades.length] || teamDef.base;
  }
  const c = slotColorArr ? slotColorArr[slot] : slot;
  return (PALETTE[c >= 0 ? c % PALETTE.length : slot % PALETTE.length] || PALETTE[0]).c;
}

