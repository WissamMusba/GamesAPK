const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

const checks = [
  { name: 'start', start: 0, end: 108 },
  { name: 'input', start: 108, end: 660 },
  { name: 'audio', start: 660, end: 942 },
  { name: 'config', start: 942, end: 1081 },
  { name: 'maps', start: 1081, end: 1201 },
  { name: 'bot_ai_1', start: 1201, end: 2646 },
  { name: 'match_core', start: 2646, end: 2789 },
  // modes are 2789 to 7961
  { name: 'mode_wiring_and_match_lifecycle', start: 7961, end: 8223 },
  { name: 'particles_and_physics', start: 8223, end: 8326 },
  { name: 'bot_ai_2', start: 8326, end: 9935 },
  { name: 'hunter_mode', start: 9935, end: 11020 }
];

checks.forEach(c => {
  console.log(`${c.name}: [${c.start+1} - ${c.end}] (${c.end - c.start} lines)`);
  console.log('   First line: ' + lines[c.start].slice(0, 60));
  console.log('   Last line:  ' + lines[c.end - 1].slice(0, 60));
});
