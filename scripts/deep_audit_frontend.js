const fs = require('fs');
const path = require('path');
const parser = require('../frontend/node_modules/@babel/parser');
const traverse = require('../frontend/node_modules/@babel/traverse').default;

const FRONTEND_SRC = path.resolve(__dirname, '../frontend/src');

// Standard browser / node / React Native / ShadowStream globals
const KNOWN_GLOBALS = new Set([
    'window', 'document', 'navigator', 'location', 'console', 'localStorage', 'sessionStorage',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
    'fetch', 'Headers', 'Request', 'Response', 'URL', 'URLSearchParams', 'FormData', 'Blob', 'File',
    'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'TouchEvent',
    'Math', 'Date', 'JSON', 'RegExp', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet',
    'Promise', 'Symbol', 'Error', 'TypeError', 'RangeError', 'SyntaxError',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
    'globalThis', 'self', 'process', 'Buffer', 'module', 'exports', 'require',
    'ShadowStreamNative', 'HTMLAnchorElement', 'HTMLIFrameElement', 'HTMLVideoElement',
    'btoa', 'atob', 'alert', 'confirm', 'prompt', 'screen', 'AbortController'
]);

function getAllFiles(dir, exts = ['.js', '.jsx']) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(fullPath, exts));
        } else if (exts.includes(path.extname(file))) {
            results.push(fullPath);
        }
    }
    return results;
}

const files = getAllFiles(FRONTEND_SRC);
console.log(`Found ${files.length} JavaScript/JSX files in frontend/src.`);

let totalErrors = 0;
let totalWarnings = 0;

for (const filePath of files) {
    const relPath = path.relative(FRONTEND_SRC, filePath);
    const code = fs.readFileSync(filePath, 'utf-8');

    let ast;
    try {
        ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator', 'exportDefaultFrom'],
        });
    } catch (parseErr) {
        console.error(`[SYNTAX ERROR] ${relPath}: ${parseErr.message} at line ${parseErr.loc ? parseErr.loc.line : 'unknown'}`);
        totalErrors++;
        continue;
    }

    const undeclared = new Set();
    const bindingNames = new Set();

    try {
        traverse(ast, {
            Program(p) {
                // Collect top-level bindings
                for (const name in p.scope.bindings) {
                    bindingNames.add(name);
                }
            },
            ReferencedIdentifier(p) {
                const name = p.node.name;
                // Ignore property accesses like obj.foo
                if (p.parentPath.isMemberExpression() && p.parentPath.node.property === p.node && !p.parentPath.node.computed) {
                    return;
                }
                // Ignore object keys like { foo: 1 }
                if (p.parentPath.isObjectProperty() && p.parentPath.node.key === p.node && !p.parentPath.node.computed) {
                    return;
                }
                // Ignore JSX element names that start with lowercase (HTML tags)
                if (p.parentPath.isJSXOpeningElement() && p.parentPath.node.name === p.node && /^[a-z]/.test(name)) {
                    return;
                }
                // Check if binding exists in current scope chain or globals
                if (!p.scope.hasBinding(name) && !KNOWN_GLOBALS.has(name) && !bindingNames.has(name)) {
                    // Check if it's within a typeof check
                    if (p.parentPath.isUnaryExpression({ operator: 'typeof' })) {
                        return;
                    }
                    undeclared.add(`${name} (line ${p.node.loc ? p.node.loc.start.line : '?'})`);
                }
            }
        });
    } catch (travErr) {
        console.warn(`[TRAVERSE ERROR] ${relPath}: ${travErr.message}`);
        totalWarnings++;
    }

    if (undeclared.size > 0) {
        console.warn(`[UNDECLARED VARIABLE(S)] in ${relPath}:`);
        for (const item of undeclared) {
            console.warn(`    -> ${item}`);
            totalErrors++;
        }
    }
}

console.log('==============================================');
console.log(`Deep audit finished: ${files.length} files scanned, ${totalErrors} errors, ${totalWarnings} warnings.`);
console.log('==============================================');
process.exit(totalErrors > 0 ? 1 : 0);
