/* ================= particles & ghost trails ================= */
const parts=[];
function addP(o){if(parts.length<430)parts.push(o);}
function dust(x,y,n,spd){
  for(let i=0;i<n;i++)addP({x:x+rand(-8,8),y:y+rand(-4,2),vx:rand(-spd,spd),vy:rand(-spd*0.7,-6),life:rand(0.25,0.5),max:0.5,size:rand(2.5,5),col:'#cfd8dc',grav:300,shape:0});
}
function ringP(x,y,col){for(let i=0;i<10;i++){const a=TAU*i/10;addP({x:x,y:y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,life:0.3,max:0.3,size:3.6,col:col,grav:0,shape:0});}}
function tagBurst(x,y,c1,c2){
  for(let i=0;i<26;i++){const a=rand(TAU),s=rand(120,420);addP({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(0.35,0.7),max:0.7,size:rand(3,7),col:i%3===0?'#ffffff':(i%2?c1:c2),grav:600,shape:i%4===0?1:0,rot:rand(TAU),vr:rand(-8,8)});}
}
function confetti(){
  for(let i=0;i<150;i++)addP({x:rand(WALL+40,W-WALL-40),y:rand(70,320),vx:rand(-130,130),vy:rand(-80,140),life:rand(1.6,2.8),max:2.8,size:rand(5,9),col:PALETTE[Math.floor(rand(PALETTE.length))].c,grav:520,shape:1,rot:rand(TAU),vr:rand(-7,7)});
}
function updateParts(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life-=dt;
    if(p.life<=0){parts[i]=parts[parts.length-1];parts.pop();continue;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.grav||0)*dt;
    if(p.vr)p.rot+=p.vr*dt;
  }
}
function drawParts(){
  for(const p of parts){
    const a=clamp(p.life/p.max,0,1);
    g.globalAlpha=a;
    if(p.shape===1){g.save();g.translate(p.x,p.y);g.rotate(p.rot||0);g.fillStyle=p.col;g.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.7);g.restore();}
    else{g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.size,0,TAU);g.fill();}
  }
  g.globalAlpha=1;
}

/* ============ PLAIN, MINIMALIST GRADIENT BACKGROUNDS (CACHED PER THEME) ============ */
let _cachedThemeIdx = -1, _cachedNightGr = null, _cachedIntGr = null, _cachedVignette = null;
function updateThemeGradients(){
  if(_cachedThemeIdx === currentThemeIdx && _cachedNightGr) return;
  _cachedThemeIdx = currentThemeIdx;
  const th = THEMES[currentThemeIdx];
  _cachedNightGr = g.createLinearGradient(0, -900, 0, H + 900);
  _cachedNightGr.addColorStop(0, th.top);
  _cachedNightGr.addColorStop(0.5, th.mid);
  _cachedNightGr.addColorStop(1, th.bot);

  _cachedIntGr = g.createLinearGradient(0, WALL, 0, H - WALL);
  _cachedIntGr.addColorStop(0, th.top);
  _cachedIntGr.addColorStop(0.5, th.mid);
  _cachedIntGr.addColorStop(1, th.bot);

  _cachedVignette = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.05);
  _cachedVignette.addColorStop(0, 'rgba(0,0,0,0)');
  _cachedVignette.addColorStop(1, 'rgba(0,0,0,0.30)');
}

function drawNightWorld(){
  updateThemeGradients();
  g.fillStyle = _cachedNightGr;
  g.fillRect(-1000, -1000, W + 2000, H + 2000);
}

function drawInterior(){
  updateThemeGradients();
  rr(g, WALL, WALL, W - 2 * WALL, H - 2 * WALL, 10);
  g.fillStyle = _cachedIntGr;
  g.fill();
  rr(g, WALL, WALL, W - 2 * WALL, H - 2 * WALL, 10);
  g.fillStyle = _cachedVignette;
  g.fill();
}

/* ================= PHYSICS: RELIABLE PINK DROP/JUMP-THROUGH & AIRTIGHT SOLIDS ================= */
function hitRect(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function hitRectInclusive(a,b){return a.x<=b.x+b.w&&a.x+a.w>=b.x&&a.y<=b.y+b.h&&a.y+a.h>=b.y;}

function zoneAtFeet(p,type){
  const feet=p.y+p.h;
  for(const s of SOLIDS){
    if(s.t!==type)continue;
    if(!s.dy){
      if(feet>=s.y-6&&feet<=s.y+18&&p.x+p.w>s.x&&p.x<s.x+s.w)return s;
    }else{
      const px=clamp(p.x+p.w/2,s.x,s.x+s.w);
      const sy=s.y+(px-s.x)*(s.dy/s.w);
      if(feet>=sy-8&&feet<=sy+20)return s;
    }
  }
  return null;
}
function botFullyOnDrop(p){
  if(p.grounded&&p.gp&&p.gp.t==='drop'){
    if(p.x+6>=p.gp.x&&p.x+p.w-6<=p.gp.x+p.gp.w)return p.gp;
  }
  const z=zoneAtFeet(p,'drop');
  if(z&&p.x+6>=z.x&&p.x+p.w-6<=z.x+z.w)return z;
  return null;
}

function landOn(p,gp,impact,wasG){
  p.grounded=true;p.gp=gp;p.lastGp=gp;p.airJumps=settings.doubleJump?1:0;p.wallJumps=0;
  // Subtle squash on landing — scaled down ~50% so it reads as weight, not a gag.
  if(!wasG){
    if(impact>430){p.sy=0.87;p.sx=1.13;p.landT=0.12;sfx('land');dust(p.x+p.w/2,p.y+p.h,8,90);}
    else if(impact>140){p.sy=0.93;p.sx=1.07;}
  }
}
