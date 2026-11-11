// Vercel serverless function: POST /api/chat
// Sends the owner's question to Claude with the site's fixed rules and knowledge base.
//
// Route 1 (default, free): Vercel AI Gateway, authenticated with this deployment's
//   built-in OIDC token (request header x-vercel-oidc-token). Every Vercel account gets
//   $5 of free AI Gateway usage per month, so no API key or card is needed.
// Route 2: Google Gemini free tier, if GEMINI_API_KEY is set (free key from aistudio.google.com, no card).
// Route 3: Anthropic API directly, if ANTHROPIC_API_KEY is set and has credits.
const { RULES } = require('./_prompt.js');

const GATEWAY_MODELS = (process.env.GATEWAY_MODELS || 'anthropic/claude-sonnet-5.5,anthropic/claude-sonnet-4.5,anthropic/claude-haiku-4.5').split(',');
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-2.5-flash,gemini-flash-lite-latest,gemini-2.5-flash-lite').split(',');
const ANTHROPIC_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
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

async function callMessages(url, headers, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', ...headers }, body: JSON.stringify(body) });
  let data = {}; try { data = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, data };
}


async function callGemini(key, system, messages) {
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  let last = { ok: false, status: 0, data: {} };
  for (const model of GEMINI_MODELS) {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model.trim() + ':generateContent', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents,
        generationConfig: { maxOutputTokens: 1200, temperature: 0.3, responseMimeType: 'application/json' } })
    });
    let data = {}; try { data = await r.json(); } catch (e) {}
    if (r.ok) {
      const text = ((data.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('');
      return { ok: true, text, model: model.trim() };
    }
    last = { ok: false, status: r.status, data };
    if ([401, 403].includes(r.status)) break; // bad key: no point trying other models
    // 400/404 (model name), 429 (that model's quota), 500/503 (overloaded): try the next model
  }
  return last;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only', code: 'method' });

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
  const base = { max_tokens: 900, system, messages };
  const errors = [];

  try {
    // Route 1: Vercel AI Gateway (free monthly credits, OIDC auth)
    const token = req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;
    if (token) {
      for (const model of GATEWAY_MODELS) {
        const r = await callMessages('https://ai-gateway.vercel.sh/v1/messages', { authorization: 'Bearer ' + token }, { model: model.trim(), ...base });
        if (r.ok) {
          const text = (r.data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
          return res.status(200).json({ ...parseJson(text), via: 'gateway:' + model.trim() });
        }
        errors.push('gateway ' + model + ' ' + r.status + ' ' + ((r.data.error && r.data.error.message) || ''));
        if (r.status === 429) break;               // out of free credits or rate limited
        if (![400, 404].includes(r.status)) break;  // only try the next model on a model error
      }
    }
    // Route 2: Gemini free tier
    const gkey = process.env.GEMINI_API_KEY;
    if (gkey) {
      const g = await callGemini(gkey, system, messages);
      if (g.ok) return res.status(200).json({ ...parseJson(g.text), via: 'gemini:' + g.model });
      errors.push('gemini ' + g.status + ' ' + ((g.data.error && g.data.error.message) || ''));
    }
    // Route 3: Anthropic API directly
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) {
      const r = await callMessages('https://api.anthropic.com/v1/messages', { 'x-api-key': key }, { model: ANTHROPIC_MODEL, ...base });
      if (r.ok) {
        const text = (r.data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
        return res.status(200).json({ ...parseJson(text), via: 'anthropic' });
      }
      errors.push('anthropic ' + r.status + ' ' + ((r.data.error && r.data.error.message) || ''));
    }
    if (!token && !key && !gkey) return res.status(503).json({ error: 'Chat is not configured', code: 'no_key' });
    console.error('chat failed:', errors.join(' | '));
    const limitedOut = errors.some(e => / 429 /.test(e));
    return res.status(limitedOut ? 429 : 502).json({ error: 'Could not get an answer', code: limitedOut ? 'rate_limited' : 'upstream_error', detail: errors.map(e => e.slice(0, 160)) });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach Claude', code: 'upstream_error' });
  }
};
