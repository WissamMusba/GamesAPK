const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      checkDir(full);
    } else if (f.endsWith('.js')) {
      try {
        execSync(`node --check "${full}"`, { stdio: 'pipe' });
        console.log('OK:   ' + full);
      } catch (e) {
        console.log('FAIL: ' + full);
        console.log(e.stderr ? e.stderr.toString().split('\n').slice(0, 3).join('\n') : e.message);
      }
    }
  }
}

checkDir('tag/js');
