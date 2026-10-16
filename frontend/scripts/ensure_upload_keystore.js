#!/usr/bin/env node
/**
 * Ensure a durable Android upload keystore exists.
 *
 * This is the direct fix for the bug that made the old APK impossible to
 * update: `build_apk.py` deleted its build directory on every run, and the
 * keystore lived inside it, so a new RSA key was generated every time. A
 * new APK signed with a different key cannot install over an existing one
 * (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`), so every update forced the user
 * to uninstall first and lose their data.
 *
 * This script creates the keystore ONCE, in a stable location outside every
 * build directory, and never overwrites it.
 *
 * Usage:
 *   node scripts/ensure_upload_keystore.js
 *
 * Environment:
 *   SHADOWSTREAM_KEYSTORE_PATH  where to keep the .keystore file
 *                                (default: <repo>/.secrets/shadowstream-upload.keystore)
 *   SHADOWSTREAM_KEYSTORE_PASS  keystore password (required to create; not
 *                                required once the file exists)
 *   SHADOWSTREAM_KEY_ALIAS      key alias (default: shadowstream)
 *
 * The password is NEVER written into this file, into git, or into any
 * build output. If you lose the keystore and the password, the Play listing
 * can never be updated again.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const keystorePath =
    process.env.SHADOWSTREAM_KEYSTORE_PATH ||
    path.join(repoRoot, '.secrets', 'shadowstream-upload.keystore');
const alias = process.env.SHADOWSTREAM_KEY_ALIAS || 'shadowstream';

function fail(msg) {
    console.error(`\n[keystore] ERROR: ${msg}\n`);
    process.exit(1);
}

function findTool(name) {
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
        if (!dir) continue;
        const p = path.join(dir, name + (process.platform === 'win32' ? '.exe' : ''));
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function main() {
    fs.mkdirSync(path.dirname(keystorePath), { recursive: true });

    if (fs.existsSync(keystorePath)) {
        const stat = fs.statSync(keystorePath);
        console.log(`[keystore] Using existing keystore: ${keystorePath} (${stat.size} bytes)`);
        console.log('[keystore] This key signs every future update. Back it up somewhere safe.');
        return;
    }

    const pass = process.env.SHADOWSTREAM_KEYSTORE_PASS;
    if (!pass) {
        fail(
            'SHADOWSTREAM_KEYSTORE_PASS is not set and no keystore exists yet.\n' +
            '  Create one with a strong password, for example:\n' +
            '    $env:SHADOWSTREAM_KEYSTORE_PASS = "<a long random password>"\n' +
            '    node scripts/ensure_upload_keystore.js\n' +
            '  Do NOT commit the password or the keystore.'
        );
    }

    const keytool = findTool('keytool');
    if (!keytool) {
        fail('keytool not found on PATH. Install a JDK (17+) and retry.');
    }

    console.log(`[keystore] Creating new upload keystore at ${keystorePath}`);
    execFileSync(
        keytool,
        [
            '-genkeypair',
            '-keystore', keystorePath,
            '-storetype', 'PKCS12',
            '-storepass', pass,
            '-keypass', pass,
            '-alias', alias,
            '-keyalg', 'RSA',
            '-keysize', '4096',
            '-validity', '10950', // ~30 years; Play requires >= 22 years for app signing keys
            '-dname', 'CN=ShadowStream, OU=Mobile, O=ShadowStream, L=, ST=, C=US',
        ],
        { stdio: 'inherit' }
    );

    console.log(`\n[keystore] Done. Keystore created at:\n  ${keystorePath}`);
    console.log('[keystore] Back this file AND the password up now. Losing either');
    console.log('[keystore] permanently locks you out of updating the Play listing.');
}

main();
