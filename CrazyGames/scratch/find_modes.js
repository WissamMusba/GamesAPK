const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

for (let i = 2700; i < 7500; i++) {
  const l = lines[i];
  if (l.includes('CAPTURE THE FLAG') || l.includes('mode_bomb') || l.includes('mode_crown') || l.includes('mode_infection') || l.includes('/* ===') || l.includes('// ===')) {
    if (l.length < 100) console.log((i+1) + ': ' + l.trim());
  }
}
