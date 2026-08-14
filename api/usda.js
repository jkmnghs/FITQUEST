import { requireUser } from './_auth.js';

const ALLOWED_DATA_TYPES = new Set(['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded']);
const DEFAULT_DATA_TYPE = 'Foundation,SR Legacy';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireUser(req, res);
  if (!auth) return;

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'USDA API key not configured' });

  const { query, dataType, pageSize } = req.query;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query is required' });

  // Clamp the caller-controlled parameters so this can't be used to pull large
  // pages off the shared USDA quota.
  const safeQuery = query.slice(0, 200);
  const requestedSize = Number(pageSize);
  const safePageSize = Number.isFinite(requestedSize)
    ? Math.min(Math.max(Math.round(requestedSize), 1), 25)
    : 8;
  const safeDataType = (typeof dataType === 'string' ? dataType : '')
    .split(',')
    .map(t => t.trim())
    .filter(t => ALLOWED_DATA_TYPES.has(t))
    .join(',') || DEFAULT_DATA_TYPE;

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(safeQuery)}&api_key=${apiKey}&dataType=${encodeURIComponent(safeDataType)}&pageSize=${safePageSize}`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
