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
let _cgBoot = null;
let _pokiBoot = null;
      try{setTimeout(finish,5000);}catch(e){}
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(!sdk||!sdk.init){finish();return;}
      try{
      sdk.init().then(async ()=>{
        this.ready=true;
        try{this.env=sdk.environment||'';}catch(e){}
        try{sdk.game.loadingStart();}catch(e){}
        try{sdk.game.loadingStop();}catch(e){}
        try{
          const st=sdk.game.settings;
          if(st!==undefined){applySdkMute(!!st.muteAudio);applySdkChatDisabled(!!st.disableChat);}
          const onSettings=x=>{try{applySdkMute(!!(x&&x.muteAudio));}catch(e){}try{applySdkChatDisabled(!!(x&&x.disableChat));}catch(e){}};
          if(sdk.game.addSettingsChangeListener) sdk.game.addSettingsChangeListener(onSettings);
          else if(sdk.addEventListener) sdk.addEventListener('settingsChange',onSettings);
        }catch(e){}
        /* Async CrazyGames user profile: cache {name, avatar}, never throws */
        try{
          if(sdk.user&&sdk.user.getUser){
            const u=await sdk.user.getUser();
            if(u&&(u.username||u.profilePictureUrl)){
              try{this._user={name:cleanText(u.username||'').slice(0,16),avatar:u.profilePictureUrl||''};}catch(e2){}
            }
          }
        }catch(e){}
        /* Portal invite joins: route into existing netJoinAction */
        try{this._registerJoinListener();}catch(e){}
        /* Cold-start invite params + instant-multiplayer auto-host */
        try{this._handleColdStartInvite();}catch(e){}
        finish();
      }).catch(()=>finish());
      }catch(e){finish();}
    });
  },
  ok(){return this.ready&&(this.env==='local'||this.env==='crazygames');},
  gameplayStart(){try{if(this.ok())window.CrazyGames.SDK.game.gameplayStart();}catch(e){}},
  gameplayStop(){try{if(this.ok())window.CrazyGames.SDK.game.gameplayStop();}catch(e){}},
  happytime(){try{if(this.ok())window.CrazyGames.SDK.game.happytime();}catch(e){}},
  /* CrazyGames User Profile detection (async SDK result is cached at boot) */
  getUser(){
    try{
      if(this._user&&this._user.name){
        return {username:this._user.name,profilePictureUrl:this._user.avatar||''};
      }
    }catch(e){}
    return null;
  },
  async getUserAsync(){
    try{
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(this._user&&this._user.name) return {username:this._user.name,profilePictureUrl:this._user.avatar||''};
      if(sdk&&sdk.user&&sdk.user.getUser){
        const u=await sdk.user.getUser();
        if(u&&u.username) return u;
      }
    }catch(e){}
    return null;
  },
  /* Portal join listener: params {room} or roomName -> netJoinAction */
  _registerJoinListener(){
    try{
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(!sdk||!sdk.game||typeof sdk.game.addJoinRoomListener!=='function')return;
      if(this._joinListenerOn)return;
      const fn=function(params){
        try{
          let code='';
          if(params){
            if(typeof params==='string')code=params;
            else code=params.room||params.roomName||params.roomId||'';
          }
          if(!code)return;
          if(typeof NET!=='undefined'&&NET&&NET.role!==null){
            // Stalled guest (never joined) may preempt with the new invite
            // instead of being stuck behind 'finish current match first'.
            const stuck = (NET.role==='guest' && NET.mySlot<0 && !NET.isSpectator);
            if(stuck){ try{ netLeaveRoom(); }catch(e){} }
            else { try{netToast('finish current match first');}catch(e){} return; }
          }
          if(typeof netJoinAction==='function')netJoinAction(code);
        }catch(e){}
      };
      try{sdk.game.addJoinRoomListener(fn);}catch(e){return;}
      this._joinListenerOn=true;
      this._joinListenerFn=fn;
    }catch(e){}
  },
  /* Cold-start: inviteParams auto-join; instant-multiplayer auto-host */
  _handleColdStartInvite(){
    try{
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(!sdk||!sdk.game)return;
      let invRoom='';
      try{
        if(typeof sdk.game.getInviteParam==='function'){
          invRoom=sdk.game.getInviteParam('room')||sdk.game.getInviteParam('roomName')||sdk.game.getInviteParam('roomId')||'';
        }
      }catch(e){}
      try{
        if(!invRoom&&sdk.game.inviteParams){
          const ip=sdk.game.inviteParams;
          if(typeof ip==='string')invRoom=ip;
          else if(typeof ip==='object'&&ip)invRoom=ip.room||ip.roomName||ip.roomId||'';
        }
      }catch(e){}
      let urlRoom='';
      try{const p=new URLSearchParams(location.search); urlRoom=(p.get('room')||p.get('roomId')||'');}catch(e){}
      if(invRoom&&!urlRoom){
        setTimeout(()=>{try{
          if(typeof NET!=='undefined'&&NET&&NET.role!==null)return;
          if(typeof netJoinAction==='function')netJoinAction(invRoom);
        }catch(e){}},600);
        return;
      }
      try{
        if(sdk.game.isInstantMultiplayer===true){
          setTimeout(()=>{try{
            if(typeof NET!=='undefined'&&NET&&NET.role!==null)return;
            if(typeof screen!=='undefined'&&screen!=='menu')return;
            let q='';try{const p=new URLSearchParams(location.search); q=(p.get('room')||p.get('roomId')||'');}catch(e){}
            if(q)return;
            if(typeof netHostAction==='function')netHostAction(false);
          }catch(e){}},800);
        }
      }catch(e){}
    }catch(e){}
  },
  /* CrazyGames Multiplayer Room & Invite Link API (SDK v3 object form) */
  updateRoom(roomId, playerList, isJoinable){
    try{
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(sdk&&sdk.game&&sdk.game.updateRoom){
        let join=isJoinable;
        if(typeof join!=='boolean'){
          try{
            let locked=false,full=false;
            if(typeof NET!=='undefined'&&NET)locked=!!NET.lobbyLocked;
            if(Array.isArray(playerList)){
              const max=(typeof NET!=='undefined'&&NET&&NET.maxPlayers)||MAXP;
              if(playerList.length>=max)full=true;
            }
            join=!(locked||full);
          }catch(e){join=true;}
        }
        sdk.game.updateRoom({
          roomId: roomId,
          isJoinable: join !== false,
          playerCount: Array.isArray(playerList) ? playerList.length : 0,
          maxPlayers: (typeof NET!=='undefined'&&NET&&NET.maxPlayers)||MAXP,
          inviteParams: { room: roomId, roomId: roomId }
        });
        try{window._cgLastRoom={roomId:roomId,join:join!==false,t:Date.now()};}catch(e){}
        try{console.log('[CG room] updateRoom',roomId,'joinable='+(join!==false),'players='+(Array.isArray(playerList)?playerList.length:0),'env='+(window.CrazyGames&&window.CrazyGames.SDK&&window.CrazyGames.SDK.environment));}catch(e){}
      } else { try{console.warn('[CG room] updateRoom skipped — SDK/game.updateRoom missing');}catch(e){} }
    }catch(e){ try{console.warn('[CG room] updateRoom threw');}catch(e2){} }
  },
  leftRoom(){
    try{
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(sdk&&sdk.game&&sdk.game.leftRoom){sdk.game.leftRoom();}
    }catch(e){}
    try{if(typeof this.hideInviteButton==='function')this.hideInviteButton();}catch(e){}
  },
  showInviteButton(roomId){
    try{
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(sdk&&sdk.game&&typeof sdk.game.showInviteButton==='function'){
        const params={roomId:roomId,room:roomId,roomName:roomId};
        try{const r=sdk.game.showInviteButton(params,()=>{});if(r&&r.catch)r.catch(()=>{});}catch(e){try{sdk.game.showInviteButton(params);}catch(e2){}}
        try{window._cgInviteShown={roomId:roomId,t:Date.now()};}catch(e){}
        try{console.log('[CG room] showInviteButton',roomId);}catch(e){}
        return true;
      } else { try{console.warn('[CG room] showInviteButton missing');}catch(e){} }
    }catch(e){}
    return false;
  },
  hideInviteButton(){
    try{
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(sdk&&sdk.game&&typeof sdk.game.hideInviteButton==='function'){try{sdk.game.hideInviteButton();}catch(e){}}
      try{window._cgInviteShown=null;}catch(e){}
    }catch(e){}
  },
  async getInviteLink(roomId){
    try{
      const sdk=window.CrazyGames&&window.CrazyGames.SDK;
      if(sdk&&sdk.game&&sdk.game.inviteLink){
        const r=await sdk.game.inviteLink({ room: roomId, roomId: roomId });
        if(typeof r==='string'&&r)return r;
        if(r&&r.inviteLink)return r.inviteLink;
        if(r&&r.url)return r.url;
        return r||null;
      }
    }catch(e){}
    return null;
  },
  /* Ads removed for Basic Launch submission (no midgame/rewarded/banner SDK calls). */
  /* (rewarded entry removed — see note above) */
  /* (banner API removed — see note above) */
};
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

