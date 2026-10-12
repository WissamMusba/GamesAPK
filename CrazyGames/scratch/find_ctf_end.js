const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

for (let j = 7200; j < 8350; j++) {
  const l = lines[j];
  if (l.includes('particles') || l.includes('AIRTIGHT') || l.includes('/* ===')) {
    console.log((j+1) + ': ' + l.slice(0, 80));
  }
}
