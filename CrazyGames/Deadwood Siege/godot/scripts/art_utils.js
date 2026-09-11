const fs = require('fs');
const path = require('path');
const ART = path.resolve('art');
if (!fs.existsSync(ART)) fs.mkdirSync(ART, { recursive: true });

function save(name, svg) {
  fs.writeFileSync(path.join(ART, name), svg.trim() + '\n', 'utf8');
  console.log('Saved:', name);
}

module.exports = { save, ART };
