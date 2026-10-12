const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

for (let j = 7955; j < 7975; j++) {
  console.log((j+1) + ': ' + lines[j].slice(0, 80));
}
