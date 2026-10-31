import sys, os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

player_file = "frontend/src/components/ShadowStreamPlayer.js"
with open(player_file, "r", encoding="utf-8") as f:
    code = f.read()

is_crlf = "\r\n" in code
norm = code.replace("\r\n", "\n")

# 1. Update tryNextMirror with targetMirror toast
old_try = """    const tryNextMirror = useCallback(() => {
        if (!mirrorList || mirrorList.length < 2) return;
        setPlayerHandoffFailed(false);
        const next = (activeMirrorIdx + 1) % mirrorList.length;
        if (onSelectMirror) onSelectMirror(mirrorList[next], next);
    }, [mirrorList, activeMirrorIdx, onSelectMirror]);"""

new_try = """    const tryNextMirror = useCallback(() => {
        if (!mirrorList || mirrorList.length < 2) return;
        setPlayerHandoffFailed(false);
        const next = (activeMirrorIdx + 1) % mirrorList.length;
        const targetMirror = mirrorList[next];
        setDubToast(`⚡ Switched to ${targetMirror.label || 'Alternate Stream'}`);
        setTimeout(() => setDubToast(null), 3000);
        if (onSelectMirror) onSelectMirror(targetMirror, next);
    }, [mirrorList, activeMirrorIdx, onSelectMirror]);"""

if old_try in norm:
    norm = norm.replace(old_try, new_try)
    print("[OK] Updated tryNextMirror with targetMirror toast")
else:
    print("[WARN] old_try not matched in ShadowStreamPlayer.js")

# 2. Add client-side DNS/connectivity preflight probe in watchdog useEffect
old_watchdog = """    useEffect(() => {
        setEmbedState('loading');
        if (embedTimer.current) clearTimeout(embedTimer.current);
        embedTimer.current = setTimeout(() => {
            setEmbedState((prev) => (prev === 'loading' ? 'stalled' : prev));
        }, 20000);
        return () => { if (embedTimer.current) { clearTimeout(embedTimer.current); embedTimer.current = null; } };
    }, [streamUrl]);"""

new_watchdog = """    useEffect(() => {
        if (!streamUrl || isDirect) return;
        setEmbedState('loading');
        let cancelled = false;

        // Fast client-side DNS and network reachability check
        if (typeof window !== 'undefined' && window.fetch && streamUrl.startsWith('http')) {
            const probeCtrl = new AbortController();
            const probeTimer = setTimeout(() => probeCtrl.abort(), 3500);
            fetch(streamUrl, { mode: 'no-cors', cache: 'no-store', signal: probeCtrl.signal })
                .then(() => {
                    clearTimeout(probeTimer);
                })
                .catch((err) => {
                    clearTimeout(probeTimer);
                    if (cancelled) return;
                    // If network failed (ERR_NAME_NOT_RESOLVED / ISP blocked domain), auto-failover!
                    if (err && err.name !== 'AbortError' && mirrorList && mirrorList.length > 1 && failoverAttemptsRef.current < 3) {
                        failoverAttemptsRef.current += 1;
                        setDubToast('⚡ Stream unreachable on network. Switching to backup mirror...');
                        setTimeout(() => setDubToast(null), 3500);
                        tryNextMirror();
                    }
                });
        }

        if (embedTimer.current) clearTimeout(embedTimer.current);
        embedTimer.current = setTimeout(() => {
            setEmbedState((prev) => (prev === 'loading' ? 'stalled' : prev));
        }, 15000);
        return () => {
            cancelled = true;
            if (embedTimer.current) { clearTimeout(embedTimer.current); embedTimer.current = null; }
        };
    }, [streamUrl, isDirect, mirrorList, tryNextMirror]);"""

if old_watchdog in norm:
    norm = norm.replace(old_watchdog, new_watchdog)
    print("[OK] Enhanced watchdog with client-side DNS/network preflight probe")
else:
    print("[WARN] old_watchdog not matched in ShadowStreamPlayer.js")

# 3. Add '⚡ Switch Source' button to top bar right after Fit button
fit_button_marker = "{/* Server Switcher removed: Unified Backend handles server routing automatically */}"
switch_button_code = """{/* Instant Stream Switcher — One tap failover if current source is blocked by ISP */}\n                    {mirrorList && mirrorList.length > 1 && (\n                        <TouchableOpacity\n                            style={[styles.pillButton, { borderColor: '#E50914', borderWidth: 1 }]}\n                            onPress={tryNextMirror}\n                            accessibilityLabel="Switch to next stream mirror"\n                        >\n                            <Text style={[styles.pillButtonText, { color: '#E50914', fontWeight: '700' }]}>⚡ Switch Source</Text>\n                        </TouchableOpacity>\n                    )}"""

if fit_button_marker in norm:
    norm = norm.replace(fit_button_marker, switch_button_code)
    print("[OK] Added '⚡ Switch Source' pill button to player top bar")
else:
    print("[WARN] fit_button_marker not matched in ShadowStreamPlayer.js")

# 4. Add Switch Source option in More menu
more_marker = "{/* Server selector removed from More menu: backend automatically picks optimal server */}"
more_switch_code = """{mirrorList && mirrorList.length > 1 && (\n                                                <TouchableOpacity\n                                                    style={styles.popupMenuItem}\n                                                    onPress={tryNextMirror}\n                                                >\n                                                    <Text style={[styles.popupMenuText, { color: '#E50914', fontWeight: '700' }]}>\n                                                        ⚡ Switch Stream Source ({activeMirrorIdx + 1}/{mirrorList.length})\n                                                    </Text>\n                                                </TouchableOpacity>\n                                            )}"""

if more_marker in norm:
    norm = norm.replace(more_marker, more_switch_code)
    print("[OK] Added '⚡ Switch Stream Source' to More menu")
else:
    print("[WARN] more_marker not matched in ShadowStreamPlayer.js")

final_p = norm.replace("\n", "\r\n") if is_crlf else norm
with open(player_file, "w", encoding="utf-8") as f:
    f.write(final_p)
print("[SUCCESS] Player updated successfully!")
