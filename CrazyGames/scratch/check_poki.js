const fs = require('fs');
const html = fs.readFileSync('PokiGames/index.html', 'utf8');

// 1. Script tags
const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
console.log('Total script blocks:', scriptMatches.length);
const srcScripts = html.match(/<script[^>]*src=[^>]*>/gi) || [];
console.log('External script tags:', srcScripts);

// 2. localStorage keys
const storageMatches = Array.from(html.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g)).map(m => m[1]);
console.log('Unique localStorage keys:', Array.from(new Set(storageMatches)));

// 3. Chat occurrences
const lines = html.split('\n');
const chatLines = [];
lines.forEach((l, idx) => {
  if (/\bchat\b/i.test(l) && !l.includes('catch')) {
    chatLines.push({ line: idx + 1, text: l.trim().slice(0, 100) });
  }
});
console.log('Chat references count:', chatLines.length);
console.log('Chat sample:', chatLines.slice(0, 5));

// 4. Nickname / username occurrences
const nameLines = [];
lines.forEach((l, idx) => {
  if (/(?:username|nickname|myProfile\.name|slotsName)/i.test(l)) {
    nameLines.push({ line: idx + 1, text: l.trim().slice(0, 100) });
  }
});
console.log('Username references count:', nameLines.length);
console.log('Username sample:', nameLines.slice(0, 5));
