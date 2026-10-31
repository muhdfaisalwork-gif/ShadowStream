const fs = require('fs');
const path = require('path');

const frontendModules = path.resolve(__dirname, '../frontend/node_modules');
const parser = require(path.join(frontendModules, '@babel/parser'));
const traverse = require(path.join(frontendModules, '@babel/traverse')).default;

// Clean up any duplicate declaration in ShadowStreamPlayer.js
const playerPath = path.resolve(__dirname, '../frontend/src/components/ShadowStreamPlayer.js');
let playerCode = fs.readFileSync(playerPath, 'utf8');

const doubleBlock = `    const [selectedSubtitle, setSelectedSubtitle] = useState('off');
    const [activeTrackBlobUrls, setActiveTrackBlobUrls] = useState({});

    const [selectedSubtitle, setSelectedSubtitle] = useState('off');
    const [activeTrackBlobUrls, setActiveTrackBlobUrls] = useState({});`;

const singleBlock = `    const [selectedSubtitle, setSelectedSubtitle] = useState('off');
    const [activeTrackBlobUrls, setActiveTrackBlobUrls] = useState({});`;

const isCrlf = playerCode.includes('\r\n');
let norm = playerCode.replace(/\r\n/g, '\n');

if (norm.includes(doubleBlock)) {
    norm = norm.replace(doubleBlock, singleBlock);
    const finalCode = isCrlf ? norm.replace(/\n/g, '\r\n') : norm;
    fs.writeFileSync(playerPath, finalCode, 'utf8');
    console.log('[OK] Cleaned up duplicate block in ShadowStreamPlayer.js');
}

// 2. Comprehensive Read-Only TDZ Audit
function checkFile(relPath) {
    const fullPath = path.resolve(__dirname, '..', relPath);
    console.log(`\n================ Checking TDZ in ${relPath} ================`);
    const code = fs.readFileSync(fullPath, 'utf8');
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'flow']
    });

    let tdzErrors = [];

    traverse(ast, {
        Scope(path) {
            for (const [name, binding] of Object.entries(path.scope.bindings)) {
                if (binding.kind === 'let' || binding.kind === 'const') {
                    const declStart = binding.identifier.start;
                    for (const refPath of binding.referencePaths) {
                        let curr = refPath;
                        let evaluatedSynchronously = true;
                        while (curr && curr.node !== path.scope.block) {
                            if (curr.isFunction() && !curr.parentPath.isCallExpression()) {
                                evaluatedSynchronously = false;
                                break;
                            }
                            if (curr.isArrayExpression() && curr.parentPath.isCallExpression()) {
                                evaluatedSynchronously = true;
                                break;
                            }
                            curr = curr.parentPath;
                        }

                        if (evaluatedSynchronously && refPath.node.start < declStart) {
                            const line = refPath.node.loc?.start?.line;
                            const declLine = binding.identifier.loc?.start?.line;
                            tdzErrors.push({
                                name,
                                refLine: line,
                                declLine: declLine,
                                text: `Cannot access '${name}' at line ${line} before initialization at line ${declLine}`
                            });
                        }
                    }
                }
            }
        }
    });

    if (tdzErrors.length === 0) {
        console.log(`[PASS] No TDZ / temporal dead zone errors found in ${relPath}!`);
    } else {
        console.error(`[FAIL] Found ${tdzErrors.length} TDZ error(s) in ${relPath}:`);
        for (const err of tdzErrors) {
            console.error(`  - ${err.text}`);
        }
    }
    return tdzErrors.length;
}

const err1 = checkFile('frontend/src/components/ShadowStreamPlayer.js');
const err2 = checkFile('frontend/src/screens/PlayerScreen.js');

if (err1 + err2 === 0) {
    console.log('\n>>> ALL REACT COMPONENTS PASSED TDZ & INITIALIZATION AUDIT 100% <<<\n');
    process.exit(0);
} else {
    process.exit(1);
}
