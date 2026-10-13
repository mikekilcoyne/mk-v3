/* A tiny Netlify Blobs client — just the two calls /api/houston needs —
   so the function has no npm dependencies and the site keeps deploying
   with no install step.

   Mirrors @netlify/blobs (v11): Netlify injects a base64 JSON context
   (siteID, token, edgeURL / uncachedEdgeURL, or apiURL) into every
   function; site-wide stores live under "site:<name>"; conditional writes
   use If-Match / If-None-Match and answer 412 when the condition fails. */

function context() {
    const raw = globalThis.netlifyBlobsContext || (globalThis.Netlify && Netlify.env && Netlify.env.get('NETLIFY_BLOBS_CONTEXT')) || process.env.NETLIFY_BLOBS_CONTEXT;
    if (!raw) throw new Error('Netlify Blobs isn’t available in this environment.');
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
}

async function fetchRetry(url, init, tries = 3) {
    for (let i = 0; ; i++) {
        const res = await fetch(url, init);
        if ((res.status === 429 || res.status >= 500) && i < tries - 1) {
            await new Promise((r) => setTimeout(r, 200 * (i + 1)));
            continue;
        }
        return res;
    }
}

export function siteStore(name) {
    const c = context();
    const path = (key) => `/${c.siteID}/site:${name}/${encodeURIComponent(key)}`;

    async function request(method, key, { body, headers = {} } = {}) {
        if (c.edgeURL) {
            const url = new URL(path(key), c.uncachedEdgeURL || c.edgeURL);   // uncached = strong consistency
            return fetchRetry(url, { method, body, headers: { authorization: `Bearer ${c.token}`, ...headers } });
        }
        // API mode: ask for a signed URL, then talk to that.
        const api = new URL(`/api/v1/blobs${path(key)}`, c.apiURL || 'https://api.netlify.com');
        const signed = await fetchRetry(api, { method, headers: { authorization: `Bearer ${c.token}`, accept: 'application/json;type=signed-url' } });
        if (signed.status !== 200) throw new Error(`Blobs ${method} failed (${signed.status})`);
        const { url } = await signed.json();
        return fetchRetry(url, { method, body, headers });
    }

    return {
        async getWithMetadata(key) {
            const res = await request('GET', key);
            if (res.status === 404) return null;
            if (res.status !== 200) throw new Error(`Blobs read failed (${res.status})`);
            return { data: await res.json(), etag: res.headers.get('etag') || undefined };
        },
        async setJSON(key, data, opts = {}) {
            const headers = { 'content-type': 'application/json', 'cache-control': 'max-age=0, stale-while-revalidate=60' };
            if (opts.onlyIfMatch) headers['if-match'] = opts.onlyIfMatch;
            else if (opts.onlyIfNew) headers['if-none-match'] = '*';
            const res = await request('PUT', key, { body: JSON.stringify(data), headers });
            if (res.status === 412) return { modified: false };
            if (res.status !== 200 && res.status !== 201 && res.status !== 204) throw new Error(`Blobs write failed (${res.status})`);
            return { modified: true, etag: res.headers.get('etag') || '' };
        }
    };
}
