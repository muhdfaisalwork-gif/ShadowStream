'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ShadowStreamClient, DEFAULT_API_BASE } = require('./index.js');

test('ShadowStreamClient initializes with default production API base', () => {
    const client = new ShadowStreamClient();
    assert.equal(client.apiBase, DEFAULT_API_BASE);
});

test('ShadowStreamClient strips trailing slashes and builds query parameters', async () => {
    let requestedUrl = '';
    const mockFetch = async (url) => {
        requestedUrl = url;
        return {
            ok: true,
            status: 200,
            json: async () => ({ status: 'ok', items: [] }),
        };
    };

    const client = new ShadowStreamClient({
        apiBase: 'https://ssmoviestvs.site/api/v1/',
        fetchImpl: mockFetch,
    });

    const res = await client.getTitles({ type: 'tv', country: 'KR', page: 1 });
    assert.equal(res.status, 'ok');
    assert.equal(requestedUrl, 'https://ssmoviestvs.site/api/v1/titles?type=tv&country=KR&page=1');
});

test('ShadowStreamClient validates required idOrSlug in getTitle and getTitleSeasons', async () => {
    const client = new ShadowStreamClient();
    await assert.rejects(() => client.getTitle(''), /idOrSlug is required/);
    await assert.rejects(() => client.getTitleSeasons(null), /idOrSlug is required/);
});
