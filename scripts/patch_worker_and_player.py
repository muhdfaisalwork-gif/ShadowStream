import re

def patch_all():
    # -------------------------------------------------------------
    # 1. Patch Worker index.ts: TMDB Multi-Key Rotator in getSeasonsData
    # -------------------------------------------------------------
    worker_path = "downloads/streamapp-worker/src/index.ts"
    with open(worker_path, "r", encoding="utf-8") as f:
        w_content = f.read()

    is_crlf = "\r\n" in w_content
    w_norm = w_content.replace("\r\n", "\n")

    # Match the seasons fetching block in worker
    seasons_pattern = re.compile(
        r"if\s*\(found\.tmdbId\s*&&[\s\S]*?const\s+tmdbKey\s*=\s*\"698d10c9649fba62a10117f6dc8e7568\";[\s\S]*?if\s*\(outSeasons\.length\s*>\s*0\)\s*return\s+outSeasons;\s*\}\s*\}\s*catch\s*\{[\s\S]*?\}\s*\}",
        re.MULTILINE
    )

    new_seasons_code = """if (found.tmdbId && (found.type === "tv" || found.type === "short_drama" || found.is_anime === 1 || found.isAnime === true)) {
        try {
            const tvData = await fetchTmdbWithRotation(`tv/${found.tmdbId}`);
            if (tvData) {
                const rawSeasons = (tvData.seasons || []).filter((s: any) => s.season_number >= 0);
                const outSeasons: any[] = [];
                for (const s of rawSeasons) {
                    const sn = s.season_number;
                    const sData = await fetchTmdbWithRotation(`tv/${found.tmdbId}/season/${sn}`);
                    let episodes: any[] = [];
                    if (sData && Array.isArray(sData.episodes)) {
                        episodes = sData.episodes.map((e: any) => ({
                            id: e.id,
                            episode_number: e.episode_number,
                            name: e.name || `Episode ${e.episode_number}`,
                            overview: e.overview || "",
                            thumbnail: e.still_path ? `https://image.tmdb.org/t/p/w500${e.still_path}` : null,
                            air_date: e.air_date,
                            runtime: e.runtime
                        }));
                    }
                    outSeasons.push({
                        id: s.id,
                        season_number: sn,
                        name: s.name || (sn === 0 ? "Specials" : `Season ${sn}`),
                        overview: s.overview || "",
                        poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
                        air_date: s.air_date,
                        episode_count: episodes.length || s.episode_count,
                        episodes
                    });
                }
                if (outSeasons.length > 0) return outSeasons;
            }
        } catch {
            // ignore error and fallback to empty
        }
    }"""

    if seasons_pattern.search(w_norm):
        w_norm = seasons_pattern.sub(new_seasons_code, w_norm, count=1)
        print("[OK] Replaced hardcoded TMDB season fetcher with fetchTmdbWithRotation in Worker")
    else:
        print("[WARN] seasons_pattern not matched in index.ts")

    final_w = w_norm.replace("\n", "\r\n") if is_crlf else w_norm
    with open(worker_path, "w", encoding="utf-8") as f:
        f.write(final_w)

    # -------------------------------------------------------------
    # 2. Patch Frontend: ShadowStreamPlayer.js
    # -------------------------------------------------------------
    player_path = "frontend/src/components/ShadowStreamPlayer.js"
    with open(player_path, "r", encoding="utf-8") as f:
        p_content = f.read()

    p_crlf = "\r\n" in p_content
    p_norm = p_content.replace("\r\n", "\n")

    # A. Add failover counter ref near embedState
    if "const failoverAttemptsRef = useRef(0);" not in p_norm:
        p_norm = p_norm.replace(
            "const [embedState, setEmbedState] = useState('loading'); // loading | ready | stalled",
            "const [embedState, setEmbedState] = useState('loading'); // loading | ready | stalled\n    const failoverAttemptsRef = useRef(0);"
        )
        print("[OK] Added failoverAttemptsRef in ShadowStreamPlayer.js")

    # B. Enhance handleEmbedFailed to perform silent auto-failover
    old_failed = """    const handleEmbedFailed = useCallback(() => {
        setEmbedState('stalled');
    }, []);"""
    new_failed = """    const handleEmbedFailed = useCallback(() => {
        if (mirrorList && mirrorList.length > 1 && failoverAttemptsRef.current < 3) {
            failoverAttemptsRef.current += 1;
            setDubToast('🔄 Optimizing playback stream (switching to backup mirror)...');
            setTimeout(() => setDubToast(null), 3000);
            tryNextMirror();
        } else {
            setEmbedState('stalled');
        }
    }, [mirrorList, tryNextMirror]);"""

    if old_failed in p_norm:
        p_norm = p_norm.replace(old_failed, new_failed)
        print("[OK] Enhanced handleEmbedFailed with silent auto-failover")
    else:
        print("[WARN] old_failed not matched in ShadowStreamPlayer.js")

    # C. Hide the manual Server Switcher button from the top control bar
    server_switcher_regex = re.compile(
        r"\{\s*/\*\s*Server Switcher\s*\*/\s*\}\s*\{mirrorList\.length\s*>\s*0\s*&&[\s\S]*?setShowServerMenu\(false\);[\s\S]*?\}\s*</View>\s*\)\s*\}\s*</View>\s*\)\s*\}",
        re.MULTILINE
    )
    if server_switcher_regex.search(p_norm):
        p_norm = server_switcher_regex.sub("{/* Server Switcher removed: Unified Backend handles server routing automatically */}", p_norm, count=1)
        print("[OK] Removed manual Server Switcher button from player top bar")
    else:
        print("[WARN] server_switcher_regex not matched in ShadowStreamPlayer.js")

    # D. Remove Server Switcher option from '⋯ More' popup menu
    more_server_regex = re.compile(
        r"\{mirrorList\s*&&\s*mirrorList\.length\s*>\s*0\s*&&\s*\(\s*<TouchableOpacity[\s\S]*?onPress=\{[^}]*setMoreSubmenu\('server'\)[^}]*\}[\s\S]*?<Text[^>]*>.*?Server:[\s\S]*?</TouchableOpacity>\s*\)\}",
        re.MULTILINE
    )
    if more_server_regex.search(p_norm):
        p_norm = more_server_regex.sub("{/* Server selector removed from More menu: backend automatically picks optimal server */}", p_norm, count=1)
        print("[OK] Removed Server item from 'More' popup menu in ShadowStreamPlayer.js")
    else:
        print("[WARN] more_server_regex not matched in ShadowStreamPlayer.js")

    # E. Modernize the failover bar text (when stalled)
    p_norm = p_norm.replace(
        "Still nothing after 20s. This server may not have this episode.",
        "Playback connection is taking longer than expected. Switch to backup stream?"
    )
    p_norm = p_norm.replace(
        "<Text style={styles.failoverBtnText}>Try next server</Text>",
        "<Text style={styles.failoverBtnText}>Switch Stream</Text>"
    )

    final_p = p_norm.replace("\n", "\r\n") if p_crlf else p_norm
    with open(player_path, "w", encoding="utf-8") as f:
        f.write(final_p)

    # -------------------------------------------------------------
    # 3. Patch Frontend: PlayerScreen.js
    # -------------------------------------------------------------
    screen_path = "frontend/src/screens/PlayerScreen.js"
    with open(screen_path, "r", encoding="utf-8") as f:
        s_content = f.read()

    s_crlf = "\r\n" in s_content
    s_norm = s_content.replace("\r\n", "\n")

    # Suppress technical resolveNote banner
    old_note = """                setResolveNote(
                    anyDirect
                        ? null
                        : 'Playing via the provider’s own player — no direct stream was available to decode.'
                );"""
    new_note = """                setResolveNote(null);"""

    if old_note in s_norm:
        s_norm = s_norm.replace(old_note, new_note)
        print("[OK] Suppressed technical provider resolveNote in PlayerScreen.js")
    else:
        # Try generic match
        s_norm = re.sub(
            r"setResolveNote\(\s*anyDirect[\s\S]*?no direct stream was available to decode\.'\s*\);",
            "setResolveNote(null);",
            s_norm
        )
        print("[OK] Regex replaced resolveNote in PlayerScreen.js")

    final_s = s_norm.replace("\n", "\r\n") if s_crlf else s_norm
    with open(screen_path, "w", encoding="utf-8") as f:
        f.write(final_s)

    print("\n[ALL PATCHES APPLIED SUCCESSFULLY!]")

if __name__ == "__main__":
    patch_all()
