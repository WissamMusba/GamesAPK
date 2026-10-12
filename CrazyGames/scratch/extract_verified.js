const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

const slices = [
  { file: 'tag/js/core.js', start: 0, end: 108 },
  { file: 'tag/js/input.js', start: 108, end: 660 },
  { file: 'tag/js/audio.js', start: 660, end: 942 },
  { file: 'tag/js/config.js', start: 942, end: 1081 },
  { file: 'tag/js/maps.js', start: 1081, end: 1201 },
  { file: 'tag/js/bot_ai.js', start: 1201, end: 2646 },
  { file: 'tag/js/match.js', start: 2646, end: 2790 },
  { file: 'tag/js/modes/infection.js', start: 2790, end: 3913 },
  { file: 'tag/js/modes/bomb.js', start: 3913, end: 5098 },
  { file: 'tag/js/modes/crown.js', start: 5098, end: 6526 },
  { file: 'tag/js/modes/ctf.js', start: 6526, end: 7962 },
  { file: 'tag/js/modes/wiring.js', start: 7962, end: 8223 },
  { file: 'tag/js/physics.js', start: 8223, end: 8326 },
  { file: 'tag/js/bot_engine.js', start: 8326, end: 9935 },
  { file: 'tag/js/modes/hunter.js', start: 9935, end: 10939 },
  { file: 'tag/js/career.js', start: 10939, end: 11184 },
  { file: 'tag/js/gameplay.js', start: 11184, end: 11601 },
  { file: 'tag/js/renderer.js', start: 11601, end: 12662 },
  { file: 'tag/js/ui.js', start: 12662, end: 16276 },
  { file: 'tag/js/netplay.js', start: 16276, end: 21654 },
  { file: 'tag/js/main.js', start: 21654, end: lines.length }
];

let allExtracted = [];
slices.forEach(s => {
  const chunk = lines.slice(s.start, s.end).join('\n');
  fs.writeFileSync(s.file, chunk + '\n');
  console.log(`Saved ${s.file} (lines ${s.start + 1} to ${s.end}, total ${s.end - s.start})`);
  allExtracted.push(chunk);
});

// Check if concatenating all chunks reproduces scriptContent exactly
const combined = allExtracted.join('\n');
console.log('Original length:', scriptContent.length);
console.log('Combined length:', combined.length);
console.log('Exact match:', combined === scriptContent);
