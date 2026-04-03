export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'USDA API key not configured' });

  const { query, dataType = 'Foundation,SR Legacy', pageSize = 8 } = req.query;
  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}&dataType=${encodeURIComponent(dataType)}&pageSize=${pageSize}`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
