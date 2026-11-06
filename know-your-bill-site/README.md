# Know Your Bill NOLA

Student prototype (Tulane, AI & Real Estate, Fall 2026). Look up any Orleans Parish property in the 2026 tax roll, see its value, exemptions and an estimated 2026 tax bill, compare it to the neighborhood, and ask sourced questions about exemptions and appeals. Not legal or tax advice.

## Pages
- `index.html`: the tool (lookup, bill card, neighborhood compare, chat)
- `data.html`, `dictionary.html`, `matching.html`, `outside-data.html`, `testing.html`, `sources.html`: "Behind the data"

## Files
- `assets/site.css`, `assets/site.js`: shared design and header/footer
- `data/eda.json`, `data/project.json`: chart data, data dictionary, test results
- `matcher.js` — turns a typed address into tax-roll format and finds the parcel
- `data/b_*.json` — 2026 Orleans Parish roll (Louisiana Tax Commission), trimmed, split by street initial; no owner names
- `data/nbhd.json` — neighborhood medians
- `api/chat.js` — serverless function that calls the Claude API
- `api/_prompt.js` — the chatbot's rules and knowledge base (server side)

## Deploy (Vercel)
1. Import this GitHub repo in Vercel (framework preset: Other, no build command).
2. Settings → Environment Variables → add `ANTHROPIC_API_KEY` (your key from console.anthropic.com).
3. Optional: `CLAUDE_MODEL` (default `claude-sonnet-5-5`), `PER_IP_PER_HOUR` (default 30).
4. Redeploy. Set a monthly spend limit in the Anthropic Console.

Without the key, the lookup works and the chat shows a "not set up" message.
