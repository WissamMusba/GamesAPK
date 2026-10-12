const fs = require('fs');
const html = fs.readFileSync('PokiGames/index.html', 'utf8');

// Find occurrences of discord, ntfy, raw.githubusercontent
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('discord.com') || l.includes('ntfy.sh') || l.includes('raw.githubusercontent.com')) {
    console.log(`${i+1}: ${l.trim().slice(0, 120)}`);
  }
});
