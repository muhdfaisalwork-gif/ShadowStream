/**
 * assistantBridge.js
 * Lightweight, zero-DOM cross-platform event bridge connecting
 * ShadowStream Copilot (Gemma4Assistant) to active player viewMode & UI controls
 * across Web, Android, iOS, and Windows Desktop.
 */

const VALID_SCREEN_MODES = ['fit', 'fill', 'full', 'crop', 'stretch'];
let currentScreenMode = 'fit';
const screenModeListeners = new Set();

export function getCurrentScreenMode() {
    return currentScreenMode;
}

export function setScreenModeFromAssistant(mode) {
    if (!mode || typeof mode !== 'string') return false;
    const normalized = mode.trim().toLowerCase();
    if (!VALID_SCREEN_MODES.includes(normalized)) return false;
    currentScreenMode = normalized;
    screenModeListeners.forEach((listener) => {
        try {
            listener(normalized);
        } catch (_) {}
    });
    return true;
}

export function subscribeScreenMode(listener) {
    if (typeof listener !== 'function') return () => {};
    screenModeListeners.add(listener);
    return () => {
        screenModeListeners.delete(listener);
    };
}
