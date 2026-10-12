const fs = require('fs');
const html = fs.readFileSync('PokiGames/index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes("m.t === 'chat'") || l.includes('netAddChatMessage')) {
    console.log((i+1) + ': ' + l.trim());
  }
});
