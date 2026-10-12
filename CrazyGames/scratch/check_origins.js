const fs = require('fs');
const html = fs.readFileSync('PokiGames/index.html', 'utf8');

// Find all external urls
const urlMatches = Array.from(html.matchAll(/https?:\/\/[^\s'"\)\`]+/g)).map(m => m[0]);
const uniqueDomains = Array.from(new Set(urlMatches.map(u => {
  try { return new URL(u).origin; } catch(e){ return u; }
})));
console.log('Unique external origins in PokiGames/index.html:', uniqueDomains);

// Find where PokiSDK is called
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('PokiSDK') || l.includes('POKI.')) {
    console.log(`${i+1}: ${l.trim().slice(0, 100)}`);
  }
});
