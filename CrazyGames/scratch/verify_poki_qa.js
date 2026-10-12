const fs = require('fs');
const html = fs.readFileSync('PokiGames/index.html', 'utf8');

// 1. External scripts
const scripts = html.match(/<script[^>]*src=[^>]*>/gi);
console.log('1. External Scripts:', scripts);

// 2. LocalStorage keys
const keys = Array.from(html.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g)).map(m => m[1]);
console.log('2. LocalStorage keys:', Array.from(new Set(keys)));

// 3. Telemetry config
const telem = html.match(/const NET_TELEMETRY_CONFIG = \{[\s\S]*?\};/);
console.log('3. Telemetry enabled:', telem ? telem[0].includes('enabled: false') : 'not found');

// 4. Test PokiSafety
eval(fs.readFileSync('PokiGames/poki-safety.js', 'utf8'));
console.log('4. PokiSafety isPokiQACompliant:', PokiSafety.isPokiQACompliant);
console.log('   Quick Chat messages count:', PokiSafety.quickChatMessages.length);
console.log('   Username sanitization test:', PokiSafety.sanitizeUsername('badword fuck', 0));
console.log('   Chat filter test:', PokiSafety.validateChatMessage('Hey you bitch'));
