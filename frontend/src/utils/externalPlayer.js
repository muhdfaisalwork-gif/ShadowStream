/**
 * External player handoff.
 *
 * Not every device has a browser that can decode every codec, and not every
 * user wants our controls. This hands the stream to a real player app — VLC
 * being the obvious one — the way Kodi, Plex and Emby do.
 *
 * Protocols used:
 *   vlc://                       opens VLC on desktop/mobile
 *   vlc-x-callback://            opens VLC and returns playback to the page
 *   intent://...#Intent;...      Android: offers any installed app that
 *                                handles video/*, so the user picks VLC,
 *                                MX Player, VLC for Mobile, etc.
 *
 * On native (Android/iOS) we go through React Native's Linking, which uses the
 * platform's app-launcher. On web we navigate the current tab to the protocol
 * URL; the browser will either hand off or show "no app registered", which is
 * a normal outcome and not an error we can detect.
 */

import { Linking, Platform } from 'react-native';

const VLC_SCHEME = 'vlc://';

/** Deep-link back into the web app when VLC finishes. */
function callbackUrl(streamUrl) {
    const base =
        typeof window !== 'undefined' && window.location
            ? `${window.location.origin}/player-return`
            : 'https://ssmoviestvs.site/player-return';
    return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(
        streamUrl
    )}&title=Stream`;
}

export function vlcUrl(streamUrl) {
    if (!streamUrl) return null;
    return `${VLC_SCHEME}${encodeURIComponent(streamUrl)}`;
}

/**
 * Open the stream in VLC.
 * @returns {Promise<boolean>} whether a handoff was attempted
 */
export async function openInVlc(streamUrl) {
    const url = vlcUrl(streamUrl);
    if (!url) return false;
    try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            // A dedicated hidden frame keeps the current page alive so the
            // user comes back to the player when they close VLC.
            const frame = document.createElement('iframe');
            frame.style.display = 'none';
            frame.src = `${url.replace('vlc://', 'vlc-x-callback://x-callback-url/stream?url=')}`;
            document.body.appendChild(frame);
            setTimeout(() => {
                try {
                    frame.remove();
                } catch (_) {
                    /* already gone */
                }
            }, 1500);
            return true;
        }
        await Linking.openURL(url);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Open the stream in VLC and return to `onReturn` when playback ends.
 * Only meaningful on the web callback protocol.
 */
export async function openInVlcWithReturn(streamUrl, onReturn) {
    const url = callbackUrl(streamUrl);
    if (!url || typeof window === 'undefined') return false;
    try {
        window.addEventListener('message', (e) => {
            // VLC posts back "hls-callback-ready" / "callback" on completion.
            if (typeof e.data === 'string' && e.data.startsWith('callback:')) {
                if (onReturn) onReturn();
            }
        });
        const frame = document.createElement('iframe');
        frame.style.display = 'none';
        frame.src = url;
        document.body.appendChild(frame);
        setTimeout(() => {
            try {
                frame.remove();
            } catch (_) {
                /* already gone */
            }
        }, 1000 * 60 * 60);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Android: let the user pick from every installed app that can play video.
 * Falls back to a plain view intent where the intent:// form is unsupported.
 */
export async function openInExternalPlayer(streamUrl, title) {
    if (!streamUrl) return false;

    if (Platform.OS === 'android') {
        const fallback = Platform.OS === 'android' ? streamUrl : null;
        const intent = `intent://${streamUrl}#Intent;scheme=https;package=com.videolan.vlc;S.title=${encodeURIComponent(
            title || 'Stream'
        )};end`;
        try {
            await Linking.openURL(intent);
            return true;
        } catch (_) {
            try {
                await Linking.openURL(fallback || streamUrl);
                return true;
            } catch (__) {
                return false;
            }
        }
    }

    if (Platform.OS === 'ios') {
        // VLC on iOS registers the vlc:// scheme.
        return openInVlc(streamUrl);
    }

    // Web: hand straight to VLC, which is the universal desktop choice.
    return openInVlc(streamUrl);
}

/** Which handoff options to offer for the current platform. */
export function availablePlayers() {
    const out = [
        { id: 'vlc', label: 'VLC', run: openInVlc },
    ];
    if (Platform.OS === 'android') {
        out.push({ id: 'system', label: 'Other app', run: openInExternalPlayer });
    }
    return out;
}
