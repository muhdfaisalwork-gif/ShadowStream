import re

path = 'downloads/streamapp-worker/src/index.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = """import {
    CURATED_ISLAMIC_TITLES,
    CURATED_ISLAMIC_MAP,
    CURATED_ISLAMIC_MAP_BY_ID,
    ISLAMIC_KNOWN_TITLES
} from "./islamic_catalog";"""

new_import = """import {
    CURATED_ISLAMIC_TITLES,
    CURATED_ISLAMIC_MAP,
    CURATED_ISLAMIC_MAP_BY_ID,
    ISLAMIC_KNOWN_TITLES,
    getIslamicStreams,
    buildIslamicAvailability
} from "./islamic_catalog";"""

assert old_import in content, "old_import not found"
content = content.replace(old_import, new_import, 1)

# 2. Update CURRENT_APP_RELEASE
old_ver = 'version: "2.4.44",\r\n\r\n    versionCode: 284,'
new_ver = 'version: "2.4.45",\r\n\r\n    versionCode: 285,'
if old_ver not in content:
    old_ver = 'version: "2.4.44",\n\n    versionCode: 284,'
    new_ver = 'version: "2.4.45",\n\n    versionCode: 285,'
assert old_ver in content, "old_ver not found"
content = content.replace(old_ver, new_ver, 1)

# 3. Update getFullTitleData availability
old_avail = 'availability: buildFallbackAvailability(curatedMatch),'
new_avail = 'availability: buildIslamicAvailability(curatedMatch, 1, 1),'
assert old_avail in content, "old_avail not found"
content = content.replace(old_avail, new_avail, 1)

# 4. In /stream/resolve, track curatedIslamicObj
old_curated_check = """                // A. Check curated Islamic titles and known titles map
                if (slugParam) {

                    const cleanSlug = slugParam.trim().toLowerCase();

                    const curated = CURATED_ISLAMIC_MAP[cleanSlug] || CURATED_ISLAMIC_MAP[cleanSlug.replace(/-\d+$/, '')];
                    if (curated) {
                        if (curated.tmdbId) tmdbId = String(curated.tmdbId);
                        if (!imdbId && curated.imdbId) imdbId = curated.imdbId;
                    }"""

new_curated_check = """                // A. Check curated Islamic titles and known titles map
                let curatedIslamicObj: any = null;
                if (slugParam) {

                    const cleanSlug = slugParam.trim().toLowerCase();

                    const curated = CURATED_ISLAMIC_MAP[cleanSlug] || CURATED_ISLAMIC_MAP[cleanSlug.replace(/-\d+$/, '')];
                    if (curated) {
                        curatedIslamicObj = curated;
                        if (curated.tmdbId) tmdbId = String(curated.tmdbId);
                        if (!imdbId && curated.imdbId) imdbId = curated.imdbId;
                    }
                }
                if (!curatedIslamicObj && titleParam) {
                    const cleanTitle = titleParam.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    curatedIslamicObj = CURATED_ISLAMIC_MAP[cleanTitle];
                }
                if (slugParam) {"""

assert old_curated_check in content, "old_curated_check not found"
content = content.replace(old_curated_check, new_curated_check, 1)

# 5. In /stream/resolve, inject curatedIslamicObj streams ahead of TMDB streams
old_streams_inject = """                // 2. TMDB-based providers (Verified 100% working high-uptime streams)
                if (tmdbId && tmdbId !== "null") {"""

new_streams_inject = """                // 2. Curated Islamic Titles direct & verified streams
                if (curatedIslamicObj) {
                    const islamicStreams = getIslamicStreams(curatedIslamicObj, parsedS, parsedE);
                    streams.push(...islamicStreams);
                } else if (tmdbId && tmdbId !== "null") {"""

assert old_streams_inject in content, "old_streams_inject not found"
content = content.replace(old_streams_inject, new_streams_inject, 1)

# 6. Available languages for Islamic titles
old_lang_map = """                // Available languages list for UI badges and switcher

                const availableLanguagesMap = new Map<string, any>();"""

new_lang_map = """                // Available languages list for UI badges and switcher

                const availableLanguagesMap = new Map<string, any>();

                if (curatedIslamicObj) {
                    const islamicLangs = [
                        { code: 'hi', name: 'Hindi/Urdu Dub', flag: '🇮🇳' },
                        { code: 'en', name: 'English', flag: '🇬🇧' },
                        { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
                        { code: 'fa', name: 'Farsi', flag: '🇮🇷' }
                    ];
                    islamicLangs.forEach(il => {
                        if (streams.some(s => s.language === il.code)) {
                            availableLanguagesMap.set(il.code, {
                                code: il.code,
                                name: il.name,
                                flag: il.flag,
                                isAvailable: true,
                                hasDub: streams.some(s => s.language === il.code && s.isDub),
                                hasSub: streams.some(s => s.language === il.code && s.isSub)
                            });
                        }
                    });
                }"""

assert old_lang_map in content, "old_lang_map not found"
content = content.replace(old_lang_map, new_lang_map, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated downloads/streamapp-worker/src/index.ts")
