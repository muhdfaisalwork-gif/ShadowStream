const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../frontend/src/components/ShadowStreamPlayer.js');
let content = fs.readFileSync(file, 'utf8');

const isCrlf = content.includes('\r\n');
let norm = content.replace(/\r\n/g, '\n');

// Target the second declaration of selectedSubtitle
const secondDeclPattern = /\n\s*\/\/\s*MUST be declared before the effect below reads it[\s\S]*?const \[activeTrackBlobUrls, setActiveTrackBlobUrls\] = useState\(\{\}\);\n/;

if (secondDeclPattern.test(norm)) {
    norm = norm.replace(secondDeclPattern, '\n');
    console.log('[OK] Found and removed second declaration of selectedSubtitle & activeTrackBlobUrls');
} else {
    console.log('[WARN] secondDeclPattern did not match');
}

const finalContent = isCrlf ? norm.replace(/\n/g, '\r\n') : norm;
fs.writeFileSync(file, finalContent, 'utf8');
