exports.handler = async event => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.headers['x-api-key'] !== process.env.LLM_PROXY_SECRET) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { model, messages } = JSON.parse(event.body || '{}');
  if (!model || !messages) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'model and messages are required' }) };
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mikekilcoyne.com',
      'X-Title': 'MK Projects',
    },
    body: JSON.stringify({ model, messages }),
  });

  const data = await res.json();
  return {
    statusCode: res.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
