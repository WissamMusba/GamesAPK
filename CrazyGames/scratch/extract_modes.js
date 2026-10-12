const fs = require('fs');
const html = fs.readFileSync('tag/index.html', 'utf8');

// 1. Extract CSS
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  fs.writeFileSync('tag/css/style.css', styleMatch[1].trim() + '\n');
  console.log('Written tag/css/style.css');
}

// 2. Extract script lines
const scriptContent = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const lines = scriptContent.split('\n');

// Module 1: js/modes/infection.js (lines 2790 to 3911)
const infectionLines = lines.slice(2789, 3911);
fs.writeFileSync('tag/js/modes/infection.js', infectionLines.join('\n') + '\n');
console.log('Written tag/js/modes/infection.js');

// Module 2: js/modes/bomb.js (lines 3912 to 5096)
const bombLines = lines.slice(3911, 5096);
fs.writeFileSync('tag/js/modes/bomb.js', bombLines.join('\n') + '\n');
console.log('Written tag/js/modes/bomb.js');

// Module 3: js/modes/crown.js (lines 5097 to 6524)
const crownLines = lines.slice(5096, 6524);
fs.writeFileSync('tag/js/modes/crown.js', crownLines.join('\n') + '\n');
console.log('Written tag/js/modes/crown.js');

// Module 4: js/modes/ctf.js (lines 6525 to 7961)
const ctfLines = lines.slice(6524, 7961);
fs.writeFileSync('tag/js/modes/ctf.js', ctfLines.join('\n') + '\n');
console.log('Written tag/js/modes/ctf.js');
