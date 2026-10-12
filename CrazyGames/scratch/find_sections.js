const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

const patterns = ['ctf', 'bomb', 'infection', 'crown', 'hunter', 'bot', 'match', 'menu', 'netplay', 'audio', 'physics'];
patterns.forEach(p => {
  lines.forEach((l, i) => {
    if ((l.includes('/* =================') || l.includes('// =================')) && l.toLowerCase().includes(p)) {
      console.log(p + ' -> line ' + (i+1) + ': ' + l.trim().slice(0, 80));
    }
  });
});
