const https = require('https');

const GITHUB_TOKEN   = process.env.GITHUB_TOKEN;
const GITHUB_REPO    = 'mikekilcoyne/mk-v3';
const SCRIPT_PATH    = 'js/script.js';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
};

function ghRequest(method, body) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_REPO}/contents/${SCRIPT_PATH}`,
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

    if (action === 'read') {
        const res = await ghRequest('GET');
        const content = Buffer.from(res.body.content, 'base64').toString('utf8');
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ content, sha: res.body.sha }) };
    }

    if (action === 'write') {
        const encoded = Buffer.from(payload.content).toString('base64');
        await ghRequest('PUT', {
            message: payload.message || 'admin: update photo/city data',
            content: encoded,
            sha: payload.sha
        });
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
};
