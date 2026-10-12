const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

const checks = [
  2788, 3912, 5096, 6525, 7168, 7200
];

checks.forEach(idx => {
  console.log('--- Around line ' + idx + ' ---');
  for (let j = Math.max(0, idx - 5); j <= Math.min(lines.length - 1, idx + 5); j++) {
    console.log((j+1) + ': ' + lines[j].slice(0, 80));
  }
});
