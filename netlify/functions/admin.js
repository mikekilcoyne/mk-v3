const https = require('https');

const GITHUB_TOKEN   = process.env.GITHUB_TOKEN;
const GITHUB_REPO    = 'mikekilcoyne/mk-v3';
const SCRIPT_PATH    = 'js/script.js';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/* Paths the panels are allowed to read/write. The flipbook admin edits
   script.js; the essays admin edits content/essays/*.json. Anything else
   is rejected so a stray path can't reach the rest of the repo. */
function isAllowedPath(p) {
    if (!p) return false;
    if (p.includes('..')) return false;
    if (p === SCRIPT_PATH) return true;
    return /^content\/essays\/[A-Za-z0-9._-]+\.json$/.test(p);
}

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
};

function ghRequest(method, body, filePath) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_REPO}/contents/${filePath || SCRIPT_PATH}`,
            method,
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'User-Agent': 'mk-admin',
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };
        const req = https.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

exports.handler = async event => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS, body: '' };
    }

    const action   = (event.queryStringParameters || {}).action;
    const payload  = event.body ? JSON.parse(event.body) : {};
    const password = payload.password || event.headers['x-admin-password'];

    if (action === 'auth') {
        return password === ADMIN_PASSWORD
            ? { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
            : { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Wrong password' }) };
    }

    if (password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    /* Default keeps the flipbook admin (which sends no path) working. */
    const filePath = payload.path || (event.queryStringParameters || {}).path || SCRIPT_PATH;
    if (!isAllowedPath(filePath)) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Path not allowed' }) };
    }

    if (action === 'read') {
        if (!GITHUB_TOKEN) {
            return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'GITHUB_TOKEN is not set on the server' }) };
        }
        const res = await ghRequest('GET', null, filePath);
        if (res.status === 404) {
            /* A new essay JSON that isn't committed yet — let the panel create it. */
            return { statusCode: 200, headers: CORS, body: JSON.stringify({ content: null, sha: null, missing: true }) };
        }
        if (res.status !== 200 || !res.body || !res.body.content) {
            return { statusCode: 502, headers: CORS, body: JSON.stringify({
                error: 'GitHub read failed',
                githubStatus: res.status,
                githubMessage: res.body && res.body.message
            }) };
        }
        const content = Buffer.from(res.body.content, 'base64').toString('utf8');
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ content, sha: res.body.sha }) };
    }

    if (action === 'write') {
        const encoded = Buffer.from(payload.content).toString('base64');
        const body = {
            message: payload.message || 'admin: update photo/city data',
            content: encoded
        };
        /* Omit sha entirely when creating a new file — GitHub rejects null. */
        if (payload.sha) body.sha = payload.sha;
        const res = await ghRequest('PUT', body, filePath);
        if (res.status >= 300) {
            return { statusCode: 502, headers: CORS, body: JSON.stringify({
                error: 'GitHub write failed',
                githubStatus: res.status,
                githubMessage: res.body && res.body.message
            }) };
        }
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
};
