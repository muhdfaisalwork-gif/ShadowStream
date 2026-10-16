
const fs = require('fs');
let content = fs.readFileSync('G:/streaming app/frontend/src/screens/PlayerScreen.js', 'utf8');

const fallbackStart = content.indexOf('// Fallback: ask the multi-mirror builder for a stream');
const fallbackEnd = content.indexOf('// Last resort: metadata-only discovery state');
if (fallbackStart !== -1 && fallbackEnd !== -1) {
    content = content.substring(0, fallbackStart) + content.substring(fallbackEnd);
}

content = content.replace('import React, { useState, useEffect, useRef, useCallback } from \'react\';', 
    'import React, { useState, useEffect, useRef, useCallback } from \'react\';\nimport { useVideoPlayer, VideoView } from \'expo-video\';');

const videoTagStart = content.indexOf('<video');
if (videoTagStart !== -1) {
    const videoTagEnd = content.indexOf('/>', videoTagStart) + 2;
    const videoViewCode = '<VideoView\n' +
        '    player={player}\n' +
        '    allowsFullscreen\n' +
        '    allowsPictureInPicture\n' +
        '    style={{\n' +
        '        width: \'100%\',\n' +
        '        height: \'100%\',\n' +
        '        backgroundColor: \'#000000\',\n' +
        '    }}\n' +
        '/>';
    content = content.substring(0, videoTagStart) + videoViewCode + content.substring(videoTagEnd);
}

const resolveStreamPos = content.indexOf('const resolveStream = useCallback(async () => {');
const playerInitCode = '\n' +
    '    const player = useVideoPlayer(streamUrl, player => {\n' +
    '        if (streamKind === \'playback\') {\n' +
    '            player.play();\n' +
    '        }\n' +
    '    });\n\n';
content = content.substring(0, resolveStreamPos) + playerInitCode + content.substring(resolveStreamPos);

const kbStart = content.indexOf('// Keyboard shortcuts on web');
if (kbStart !== -1) {
    const kbEnd = content.indexOf('}, []);', kbStart) + 7;
    content = content.substring(0, kbStart) + content.substring(kbEnd);
}

content = content.replace(/MULTI-MIRROR PLAYER/g, 'PLAYER');
content = content.replace(/No playable mirror surfaced yet/g, 'No playable source surfaced yet');
content = content.replace(/No mirror surfaced for this title./g, 'No playable source surfaced for this title.');

const onTimeUpdateStart = content.indexOf('// Periodically record playback progress');
const onTimeUpdateEnd = content.indexOf('// Restore saved resume position');
if (onTimeUpdateStart !== -1 && onTimeUpdateEnd !== -1) {
    content = content.substring(0, onTimeUpdateStart) + content.substring(onTimeUpdateEnd);
}

const onLoadedStart = content.indexOf('// Restore saved resume position');
const onLoadedEnd = content.indexOf('const toggleWatchlist', onLoadedStart);
if (onLoadedStart !== -1 && onLoadedEnd !== -1) {
    content = content.substring(0, onLoadedStart) + content.substring(onLoadedEnd);
}

fs.writeFileSync('G:/streaming app/frontend/src/screens/PlayerScreen.js', content);

