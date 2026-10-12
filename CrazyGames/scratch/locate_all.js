const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

const markers = [
  { name: 'core.js', marker: 'const TAU=Math.PI*2;' },
  { name: 'input.js', marker: '/* ================= mobile touch action state ================= */' },
  { name: 'audio.js', marker: '/* ================= audio ================= */' },
  { name: 'config.js', marker: '/* ================= constants ================= */' },
  { name: 'maps.js', marker: '/* ================= 10 INTRICATE, ACCESSIBLE MAPS' },
  { name: 'bot_ai.js', marker: '/* ================= PLATFORM TRAINING HARNESS & BOT MIMICRY' },
  { name: 'match.js', marker: '/* ================= match ================= */' },
  { name: 'modes/infection.js', marker: 'BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING' },
  { name: 'modes/bomb.js', marker: 'BUNDLED MODE: BOMB TAG / HOT POTATO' },
  { name: 'modes/crown.js', marker: 'BUNDLED MODE: CROWN KING / KING OF THE HILL' },
  { name: 'modes/ctf.js', marker: 'BUNDLED MODE: CAPTURE THE FLAG (CTF)' },
  { name: 'modes/wiring.js', marker: '/* Export live mode references to top-level lexical scope */' },
  { name: 'physics.js', marker: '/* ================= particles & ghost trails ================= */' },
  { name: 'bot_engine.js', marker: '/* ================= TRIAL BOT: P2 chase/flee + anti-stuck =================' },
  { name: 'modes/hunter.js', marker: '/* ================= HUNTER MODE CORE ENGINE ================= */' },
  { name: 'career.js', marker: '/* ================= career persistence' },
  { name: 'gameplay.js', marker: '/* ================= camera ================= */' },
  { name: 'renderer.js', marker: '/* ================= text/ui ================= */' },
  { name: 'ui.js', marker: '/* ================= MENU ================= */' },
  { name: 'netplay.js', marker: '/* ================= netplay (host-authoritative P2P) ================= */' },
  { name: 'main.js', marker: '/* ================= main loop ================= */' }
];

markers.forEach(m => {
  const idx = lines.findIndex(l => l.includes(m.marker));
  console.log(`${m.name}: line ${idx + 1}`);
});
