const fs = require('fs');
const path = require('path');

const frontendModules = path.resolve(__dirname, '../frontend/node_modules');
const parser = require(path.join(frontendModules, '@babel/parser'));

const filePath = path.resolve(__dirname, '../frontend/src/components/ShadowStreamPlayer.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Move tryNextMirror above handleEmbedFailed
const tryNextMirrorPattern = /\s*const tryNextMirror = useCallback\(\(\) => \{[\s\S]*?\}, \[mirrorList, activeMirrorIdx, onSelectMirror\]\);/;
const match = code.match(tryNextMirrorPattern);
if (!match) {
    console.error('[ERROR] tryNextMirror pattern not found');
    process.exit(1);
}
const tryNextMirrorCode = match[0].trim();

// Remove old declaration
code = code.replace(match[0], '');

// Insert tryNextMirror above handleEmbedLoaded
const target = "const embedTimer = useRef(null);";
if (!code.includes(target)) {
    console.error('[ERROR] target not found');
    process.exit(1);
}

const replacement = `const embedTimer = useRef(null);\n\n    ${tryNextMirrorCode}`;
code = code.replace(target, replacement);

fs.writeFileSync(filePath, code, 'utf8');
console.log('[OK] Moved tryNextMirror before handleEmbedFailed');

// 2. Parse with Babel
const updatedCode = fs.readFileSync(filePath, 'utf8');
try {
    const ast = parser.parse(updatedCode, {
        sourceType: 'module',
        plugins: ['jsx', 'flow']
    });
    console.log('[OK] Babel parsed ShadowStreamPlayer.js successfully! No syntax errors.');
} catch (err) {
    console.error('[SYNTAX/PARSE ERROR]:', err);
    process.exit(1);
}
