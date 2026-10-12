const fs = require('fs');
const html = fs.readFileSync('PokiGames/index.html', 'utf8');
const lines = html.split('\n');

console.log('--- Chat HTML & Logic ---');
lines.forEach((l, idx) => {
  if (l.includes('id="chat') || l.includes('class="chat') || l.includes('netSendChat') || l.includes('chat-')) {
    console.log(`${idx + 1}: ${l.trim().slice(0, 100)}`);
  }
});

console.log('--- Username Input Logic ---');
lines.forEach((l, idx) => {
  if (l.includes('myProfile.name') || l.includes('tag_player_name') || l.includes('sanitize') || l.includes('slotsName')) {
    if (l.length < 150) console.log(`${idx + 1}: ${l.trim()}`);
  }
});
