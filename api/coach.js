export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Health-check: GET /api/coach — used by the client to verify the key is set
  if (req.method === 'GET') {
    return res.status(apiKey ? 200 : 500).json({ ok: !!apiKey });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
