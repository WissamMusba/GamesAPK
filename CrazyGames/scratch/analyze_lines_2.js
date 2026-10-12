const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

const checks = [
  { name: 'career', start: 11020, end: 11265 },
  { name: 'camera_and_gameplay', start: 11265, end: 11601 },
  { name: 'world_and_characters', start: 11601, end: 12662 },
  { name: 'ui_menus_hud', start: 12662, end: 16276 },
  { name: 'netplay', start: 16276, end: 21654 },
  { name: 'main_loop', start: 21654, end: lines.length }
];

checks.forEach(c => {
  console.log(`${c.name}: [${c.start+1} - ${c.end}] (${c.end - c.start} lines)`);
  console.log('   First line: ' + lines[c.start].slice(0, 60));
  console.log('   Last line:  ' + lines[c.end - 1].slice(0, 60));
});
