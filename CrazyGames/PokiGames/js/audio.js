/* ================= audio ================= */

let AC=null,master=null,muted=false,sdkMuted=false;
let _cg=null;
let _cgBoot=null;
/* ================= POKI SDK v2 INTEGRATION ================= */
const POKI = {
  ready: false,
  isPlaying: false,
  adblock: false,
  chatDisabled: false,
  _user: null,
  boot() {
    return new Promise(res => {
      let _done = false;
      const finish = () => { try { if (!_done) { _done = true; res(); } } catch(e){} };
      try { setTimeout(finish, 4000); } catch(e){}
      if (typeof PokiSDK === 'undefined') { finish(); return; }
      try {
        PokiSDK.init().then(() => {
          this.ready = true;
          this.adblock = false;
          try { PokiSDK.gameLoadingFinished(); } catch(e){}
          finish();
        }).catch(() => {
          this.ready = true;
          this.adblock = true;
          try { PokiSDK.gameLoadingFinished(); } catch(e){}
          finish();
        });
      } catch(e) { finish(); }
    });
  },
  loadingFinished() { try { if (typeof PokiSDK !== 'undefined') PokiSDK.gameLoadingFinished(); } catch(e){} },
  gameplayStart() { try { if (!this.isPlaying && typeof PokiSDK !== 'undefined') { PokiSDK.gameplayStart(); this.isPlaying = true; } } catch(e){} },
  gameplayStop() { try { if (this.isPlaying && typeof PokiSDK !== 'undefined') { PokiSDK.gameplayStop(); this.isPlaying = false; } } catch(e){} },
  commercialBreak(onDone) { this.gameplayStop(); applySdkMute(true); if (typeof PokiSDK !== 'undefined') { PokiSDK.commercialBreak(() => applySdkMute(true)).then(() => { applySdkMute(false); if (onDone) onDone(); }).catch(() => { applySdkMute(false); if (onDone) onDone(); }); } else { applySdkMute(false); if (onDone) onDone(); } },
  rewardedBreak(onSuccess) { this.gameplayStop(); applySdkMute(true); if (typeof PokiSDK !== 'undefined') { PokiSDK.rewardedBreak().then(s => { applySdkMute(false); if (onSuccess) onSuccess(s); }).catch(() => { applySdkMute(false); if (onSuccess) onSuccess(false); }); } else { applySdkMute(false); if (onSuccess) onSuccess(true); } },
  happytime() {},
  getUser() { return null; },
  async getUserAsync() { return null; },
  updateRoom(roomId, playerList, isJoinable) {},
  leftRoom() {},
  showInviteButton() { return false; },
  hideInviteButton() {},
  async getInviteLink(roomId) {
    if (typeof PokiSDK !== 'undefined' && typeof PokiSDK.shareableURL === 'function') {
      try { const link = await PokiSDK.shareableURL({ room: roomId }); if (link) return link; } catch(e){}
    }
    try { return location.origin + location.pathname + '?room=' + encodeURIComponent(roomId); } catch(e){ return null; }
  }
};
const CG = POKI;
function applySdkMute(m){sdkMuted=!!m;applyEffectiveMute();}
function applySdkChatDisabled(v){try{if(typeof CG!=='undefined'&&CG)CG.chatDisabled=!!v;}catch(e){}}
function applyEffectiveMute(){const eff=muted||sdkMuted;try{if(master)master.gain.value=eff?0:0.5;}catch(e){}}
function unlockAllAudio(){
  if(AC && AC.state === 'suspended') AC.resume().catch(()=>{});
  if(typeof VOICE !== 'undefined' && VOICE.peers){
    for(const entry of VOICE.peers.values()){
      if(entry.audioEl && entry.audioEl.paused){
        entry.audioEl.play().catch(()=>{});
      }
    }
  }
}

function initAudio(){
  if(AC){
    if(AC.state==='suspended')AC.resume().catch(()=>{});
    applyEffectiveMute();
    unlockAllAudio();
    return;
  }
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();
    master.gain.value=(muted||sdkMuted)?0:0.5;
    master.connect(AC.destination);
  }catch(e){AC=null;}
  unlockAllAudio();
  if(!_cgBoot){_cgBoot=CG.boot();}
}
function beep(f0,f1,dur,type,vol,delay){
  if(!AC||!master)return;type=type||'square';vol=vol||0.16;delay=delay||0;
  const t0=AC.currentTime+delay,o=AC.createOscillator(),gn=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(Math.max(20,f0),t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
  gn.gain.setValueAtTime(vol,t0);gn.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(gn);gn.connect(master);o.start(t0);o.stop(t0+dur+0.03);
}
function noiseBurst(dur,vol,delay){
  if(!AC||!master)return;delay=delay||0;
  const t0=AC.currentTime+delay,len=Math.floor(AC.sampleRate*dur),buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
  const src=AC.createBufferSource();src.buffer=buf;
  const gn=AC.createGain();gn.gain.value=vol;
  const fl=AC.createBiquadFilter();fl.type='lowpass';fl.frequency.value=1100;
  src.connect(fl);fl.connect(gn);gn.connect(master);src.start(t0);
}
function sfx(n){
  switch(n){
    case'ui':beep(420,540,0.06,'square',0.10);break;
    case'ok':beep(520,780,0.08,'square',0.14);beep(780,1060,0.10,'square',0.11,0.07);break;
    case'back':beep(320,180,0.09,'square',0.11);break;
    case'jump':beep(320,620,0.12,'triangle',0.22);break;
    case'djump':beep(480,940,0.13,'triangle',0.22);break;
    case'walljump':beep(380,820,0.11,'triangle',0.24);noiseBurst(0.04,0.12);break;
    case'land':noiseBurst(0.05,0.10);beep(150,85,0.08,'sine',0.14);break;
    case'drop':beep(520,210,0.13,'sine',0.16);break;
    case'boost':beep(260,820,0.18,'sine',0.22);beep(520,1100,0.15,'triangle',0.08,0.02);break;
    case'pad':beep(360,780,0.14,'sawtooth',0.07);break;
    case'tag':beep(720,110,0.24,'square',0.24);beep(940,170,0.2,'sawtooth',0.13,0.02);noiseBurst(0.14,0.16);break;
    case'count':beep(600,600,0.09,'square',0.16);break;
    case'go':beep(880,880,0.16,'square',0.20);beep(1318,1318,0.26,'square',0.14,0.02);break;
    case'tick':beep(960,960,0.05,'square',0.11);break;
    case'win':{const f=[523,659,784,1047];for(let i=0;i<4;i++)beep(f[i],f[i],0.16,'triangle',0.18,i*0.11);break;}
  }
}

try{ if(!_cgBoot && typeof CG !== 'undefined' && typeof CG.boot === 'function') _cgBoot = CG.boot(); }catch(e){}

