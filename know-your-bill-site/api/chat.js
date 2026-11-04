// Vercel serverless function: POST /api/chat
// Sends the owner's question to Claude with the site's fixed rules and knowledge base.
// The API key lives only in the Vercel environment variable ANTHROPIC_API_KEY.
const { RULES } = require('./_prompt.js');

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const PER_IP_PER_HOUR = Number(process.env.PER_IP_PER_HOUR || 30);
const hits = new Map(); // simple per-instance rate limit

function limited(ip) {
  const now = Date.now(), hour = 3600e3;
  const list = (hits.get(ip) || []).filter(t => now - t < hour);
  list.push(now); hits.set(ip, list);
  return list.length > PER_IP_PER_HOUR;
}

function parseJson(text) {
  try { return JSON.parse(text); } catch (e) {}
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (e) {} }
  return { answer: text, sources: [], handoff: '', confident: false };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only', code: 'method' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'Chat is not configured', code: 'no_key' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'Too many questions', code: 'rate_limited' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const raw = Array.isArray(body && body.messages) ? body.messages.slice(-6) : [];
  const messages = raw
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user')
    return res.status(400).json({ error: 'Bad request', code: 'invalid_request' });

  const property = typeof body.property === 'string' ? body.property.slice(0, 3000) : '';
  const system = RULES + (property ? '\n\nPROPERTY RECORD (the owner looked this up):\n' + property : '');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, system, messages })
    });
    const data = await r.json();
    if (!r.ok) {
      const code = r.status === 429 ? 'rate_limited' : 'upstream_error';
      return res.status(r.status === 429 ? 429 : 502).json({ error: (data.error && data.error.message) || 'Upstream error', code });
    }
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return res.status(200).json(parseJson(text));
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach Claude', code: 'upstream_error' });
  }
};
