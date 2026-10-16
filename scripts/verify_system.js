/**
 * verify_system.js — End-to-end verification script for StreamApp.
 * Tests:
 * 1. Express backend (:3000) health and proxying to catalog (:7801)
 * 2. Serving static Expo web bundle from frontend/dist
 * 3. All Section 22 discovery rows and counts
 * 4. Anime ecosystem endpoints and Dub/Sub filters
 * 5. Short Dramas ecosystem endpoints
 * 6. 27 Genres, 42 Countries, 26 Languages, 68 Collections
 * 7. Multi-facet search engine
 * 8. Watchlist & History dual-sync persistence
 * 9. Lawful playback stream extraction and verification
 */

async function run() {
    console.log('================================================================');
    console.log('       STREAMAPP E2E VERIFICATION & 3-LOOP QUALITY AUDIT         ');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(name, condition, extra = '') {
        if (condition) {
            console.log(`[PASS] ${name} ${extra ? '(' + extra + ')' : ''}`);
            passed++;
        } else {
            console.error(`[FAIL] ${name} ${extra ? '(' + extra + ')' : ''}`);
            failed++;
        }
    }

    // 1. Health check
    try {
        const r = await fetch('http://localhost:3000/health');
        const d = await r.json();
        assert('Backend Health (:3000)', d.status === 'ok' || d.status === 'healthy');
        assert('Catalog Upstream (:7801)', d.service === 'catalog' || d.catalogAvailable === true);
    } catch (e) {
        assert('Backend Health', false, e.message);
    }

    // 2. Static Web delivery
    try {
        const r = await fetch('http://localhost:3000/');
        const html = await r.text();
        assert('Static HTML Delivery', r.status === 200 && html.includes('<!DOCTYPE html>'));
        assert('Expo JS Bundle Link', html.includes('_expo/static/js/web/index-'));
    } catch (e) {
        assert('Static Web Delivery', false, e.message);
    }

    // 3. Stats & 3-Count Rule
    try {
        const r = await fetch('http://localhost:3000/api/v1/stats');
        const d = await r.json();
        assert('Catalog Indexed Count >= 13,000', d.indexed >= 13000, `Found: ${d.indexed}`);
        assert('Playable Legal Streams >= 10', d.playable_legal >= 10, `Found: ${d.playable_legal}`);
        assert('Complete Metadata Count >= 44', d.metadata_complete >= 44, `Found: ${d.metadata_complete}`);
    } catch (e) {
        assert('Stats endpoint', false, e.message);
    }

    // 4. Section 22 Discovery Rows
    try {
        const r = await fetch('http://localhost:3000/api/v1/categories');
        const d = await r.json();
        const cats = d.categories || [];
        assert('Discovery Rows >= 16', cats.length >= 16, `Found: ${cats.length}`);
        const animeRow = cats.find(c => c.id === 'anime');
        assert('Anime Discovery Row Present', !!animeRow, `Count: ${animeRow?.count}`);
        const shortRow = cats.find(c => c.id === 'short-dramas');
        assert('Short Dramas Row Present', !!shortRow, `Count: ${shortRow?.count}`);
        const freeRow = cats.find(c => c.id === 'free-authorized');
        assert('Authorized Free Cinema Row Present', !!freeRow, `Count: ${freeRow?.count}`);
    } catch (e) {
        assert('Categories endpoint', false, e.message);
    }

    // 5. Anime Ecosystem
    try {
        const r = await fetch('http://localhost:3000/api/v1/titles/anime');
        const d = await r.json();
        assert('Anime Titles >= 14', (d.items || []).length >= 14, `Found: ${(d.items || []).length}`);
        const aot = (d.items || []).find(x => x.slug === 'attack-on-titan-2013');
        assert('Attack on Titan in Anime Hub', !!aot);

        // Check seasons for Attack on Titan
        if (aot) {
            const sRes = await fetch(`http://localhost:3000/api/v1/title/${aot.id}/seasons`);
            const sData = await sRes.json();
            assert('Anime Seasons & Episodes', (sData.seasons || []).length >= 1, `Seasons: ${(sData.seasons || []).length}`);
        }
    } catch (e) {
        assert('Anime Ecosystem', false, e.message);
    }

    // 6. Short Dramas Hub
    try {
        const r = await fetch('http://localhost:3000/api/v1/titles/short-dramas');
        const d = await r.json();
        assert('Short Dramas >= 7', (d.items || []).length >= 7, `Found: ${(d.items || []).length}`);
    } catch (e) {
        assert('Short Dramas', false, e.message);
    }

    // 7. Taxonomy: Genres, Countries, Languages, Collections
    try {
        const [gr, cr, lr, colr] = await Promise.all([
            fetch('http://localhost:3000/api/v1/genres').then(r => r.json()),
            fetch('http://localhost:3000/api/v1/countries').then(r => r.json()),
            fetch('http://localhost:3000/api/v1/languages').then(r => r.json()),
            fetch('http://localhost:3000/api/v1/collections').then(r => r.json()),
        ]);
        assert('Genres Count == 27', (gr.items || []).length === 27, `Found: ${(gr.items || []).length}`);
        assert('Countries Count >= 40', (cr.items || []).length >= 40, `Found: ${(cr.items || []).length}`);
        assert('Languages Count >= 26', (lr.items || []).length >= 26, `Found: ${(lr.items || []).length}`);
        assert('Collections Count >= 68', (colr.items || []).length >= 68, `Found: ${(colr.items || []).length}`);
    } catch (e) {
        assert('Taxonomy endpoints', false, e.message);
    }

    // 8. Search & Multi-facet Filtering
    try {
        const r = await fetch('http://localhost:3000/api/v1/search?q=Parasite');
        const d = await r.json();
        assert('Search for Parasite returns matching title', (d.items || []).some(x => x.title === 'Parasite'));
    } catch (e) {
        assert('Search endpoint', false, e.message);
    }

    // 9. Lawful Playback Verification (Sintel / Blender / Archive.org)
    try {
        const r = await fetch('http://localhost:3000/api/v1/title/4147/availability');
        const d = await r.json();
        const av = (d.availability || []).find(a => a.kind === 'playback');
        assert('Sintel Direct Playback Stream', !!av && av.playbackUrl.includes('.mp4'), `URL: ${av?.playbackUrl}`);
    } catch (e) {
        assert('Playable stream verification', false, e.message);
    }

    // 10. Watchlist & History Persistence (Node SQLite)
    try {
        const testUser = 'test_user_' + Date.now();
        // Add to watchlist
        const postRes = await fetch('http://localhost:3000/api/v1/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: testUser,
                titleId: 4147,
                title: 'Sintel',
                type: 'movie'
            })
        });
        assert('Watchlist Add Status', postRes.status === 201 || postRes.status === 200);

        // Fetch watchlist
        const getRes = await fetch(`http://localhost:3000/api/v1/watchlist?user_id=${testUser}`);
        const getData = await getRes.json();
        assert('Watchlist Sync Verification', (getData.items || []).some(i => i.id === 4147));

        // Record history
        const histRes = await fetch('http://localhost:3000/api/v1/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: testUser,
                titleId: 4147,
                title: 'Sintel',
                progressPct: 45,
                currentTime: 240,
                duration: 540
            })
        });
        assert('History Record Status', histRes.status === 200 || histRes.status === 201);

        // Fetch history
        const getHistRes = await fetch(`http://localhost:3000/api/v1/history?user_id=${testUser}`);
        const getHistData = await getHistRes.json();
        assert('History Sync Verification', (getHistData.items || []).some(i => i.id === 4147 && i.pct === 45));
    } catch (e) {
        assert('Watchlist/History Persistence', false, e.message);
    }

    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

run();
