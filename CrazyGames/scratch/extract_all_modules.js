const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

const modules = [
  { file: 'tag/js/core.js', start: 0, end: 108 },
  { file: 'tag/js/input.js', start: 108, end: 660 },
  { file: 'tag/js/audio.js', start: 660, end: 942 },
  { file: 'tag/js/config.js', start: 942, end: 1081 },
  { file: 'tag/js/maps.js', start: 1081, end: 1201 },
  { file: 'tag/js/bot_ai.js', start: 1201, end: 2646 },
  { file: 'tag/js/match.js', start: 2646, end: 2789 },
  // 2789 - 7961 are the modes: infection.js, bomb.js, crown.js, ctf.js
  { file: 'tag/js/modes/wiring.js', start: 7961, end: 8223 },
  { file: 'tag/js/physics.js', start: 8223, end: 8326 },
  { file: 'tag/js/bot_engine.js', start: 8326, end: 9935 },
  { file: 'tag/js/modes/hunter.js', start: 9935, end: 11020 },
  { file: 'tag/js/career.js', start: 11020, end: 11265 },
  { file: 'tag/js/gameplay.js', start: 11265, end: 11601 },
  { file: 'tag/js/renderer.js', start: 11601, end: 12662 },
  { file: 'tag/js/ui.js', start: 12662, end: 16276 },
  { file: 'tag/js/netplay.js', start: 16276, end: 21654 },
  { file: 'tag/js/main.js', start: 21654, end: lines.length }
];

modules.forEach(m => {
  const content = lines.slice(m.start, m.end).join('\n');
  fs.writeFileSync(m.file, content + '\n');
  console.log('Written:', m.file, `(${m.end - m.start} lines)`);
});
