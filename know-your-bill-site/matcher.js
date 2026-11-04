/* Know Your Bill NOLA — address matcher.
   Turns what an owner types ("2808 St. Charles Avenue, New Orleans 70115")
   into the format the 2026 Orleans Parish roll uses ("2808 ST CHARLES AV")
   and finds the matching record(s). Works in the browser and in Node. */
(function (root) {
  const SUFFIX = {
    STREET: 'ST', STR: 'ST', ST: 'ST', AVENUE: 'AV', AVE: 'AV', AV: 'AV',
    BOULEVARD: 'BL', BLVD: 'BL', BL: 'BL', DRIVE: 'DR', DR: 'DR', ROAD: 'RD', RD: 'RD',
    PLACE: 'PL', PL: 'PL', COURT: 'CT', CT: 'CT', HIGHWAY: 'HW', HWY: 'HW', HW: 'HW',
    LANE: 'LN', LN: 'LN', PARKWAY: 'PW', PKWY: 'PW', PKY: 'PW', PW: 'PW',
    CIRCLE: 'CR', CIR: 'CR', CR: 'CR', WAY: 'WY', WY: 'WY', TERRACE: 'TR', TER: 'TR', TR: 'TR',
    WALK: 'WALK', ALLEY: 'AL', ROW: 'ROW', SQUARE: 'SQ', LOOP: 'LP'
  };
  const ORD = { FIRST: '1ST', SECOND: '2ND', THIRD: '3RD', FOURTH: '4TH', FIFTH: '5TH', SIXTH: '6TH',
    SEVENTH: '7TH', EIGHTH: '8TH', NINTH: '9TH', TENTH: '10TH', ELEVENTH: '11TH', TWELFTH: '12TH' };
  const DIRS = new Set(['N', 'S', 'E', 'W', 'NORTH', 'SOUTH', 'EAST', 'WEST']);
  // Renamed or commonly abbreviated streets -> how the roll spells them.
  const ALIAS = [
    [/\bMARTIN LUTHER KING( JR)?\b|\bMLK( JR)?\b|\bM L KING\b/, 'MARTIN L KING'],
    [/\bORETHA CASTLE HALEY\b|\bO ?C HALEY\b/, 'ORETHA C HALEY'],
    [/\bJEFFERSON DAVIS\b|\bJEFF DAVIS\b/, 'NORMAN C FRANCIS'],
    [/\bGENERAL\b/, 'GEN'],
    [/\bSAINT\b/, 'ST'],
    [/\bFORT\b/, 'FT'],
    [/\bGOVERNOR\b/, 'GOV'],
    [/\bDE SOTO\b/, 'DESOTO'],
    [/^LOUISIANA AVENUE$/, 'LOUISIANA AVE'],
    [/\bMOUNT\b/, 'MT']
  ];
  const UNIT_RE = /\s(?:APT|APARTMENT|UNIT|STE|SUITE|BLDG|BUILDING|#|NO)\s*([A-Z0-9-]+)\s*$/;
  const CITY_RE = /\s(NEW ORLEANS|NOLA|METAIRIE|KENNER|GRETNA|HARVEY|MARRERO|CHALMETTE|ARABI|SLIDELL|BATON ROUGE|COVINGTON|MANDEVILLE|WESTWEGO|RIVER RIDGE|HARAHAN|ALGIERS)$/;

  function clean(s) {
    s = String(s || '');
    // "814 Gravier St, 818 Gravier St" -> keep the first address
    const parts = s.split(',');
    if (parts.length > 1 && /^\s*\d/.test(parts[1]) && /^\s*\d/.test(parts[0])) s = parts[0];
    return s.toUpperCase()
      .replace(/['’]/g, '').replace(/[.,()]/g, ' ').replace(/#/g, ' # ').replace(/\s-([A-Z0-9]+)$/, ' # $1')
      .replace(/\s+/g, ' ').trim();
  }

  // Parse free text into {nums, core, suffix, unit, zip, notes}
  function parse(input) {
    let s = clean(input);
    const out = { raw: input, nums: [], core: '', suffix: '', unit: '', zip: '', dir: '', notes: [] };
    const z = s.match(/\b(70[01]\d\d)(-\d{4})?\b/);
    if (z) { out.zip = z[1]; s = s.replace(z[0], ' '); }
    // strip trailing state / country / city words (only at the end, so LOUISIANA AVE survives)
    let prev;
    do {
      prev = s;
      s = s.replace(/\s(LA|LOUISIANA|USA|US)$/, '').trim();
      const c = s.match(CITY_RE);
      if (c) { out.city = c[1]; s = s.slice(0, c.index).trim(); }
    } while (s !== prev);
    if (/^(P ?O ?BOX|POST OFFICE)/.test(s)) { out.notes.push('po_box'); return out; }
    const u = s.match(UNIT_RE);
    if (u) { out.unit = u[1]; s = s.slice(0, u.index).trim(); }
    const n = s.match(/^(\d+)[A-Z]?(?:\s*-\s*(\d+))?\s+/);
    if (!n) { out.notes.push('no_number'); }
    else { out.nums.push(n[1]); if (n[2]) out.nums.push(n[2]); s = s.slice(n[0].length); }
    let toks = s.split(' ').filter(Boolean);
    if (toks.length > 1 && DIRS.has(toks[0])) { out.dir = toks[0]; toks.shift(); }
    // trailing unit given without a keyword, e.g. "2 CANAL ST 1901" or "455 9TH ST B"
    if (!out.unit && toks.length > 2 && SUFFIX[toks[toks.length - 2]] && /^[A-Z0-9]{1,5}$/.test(toks[toks.length - 1]) && !SUFFIX[toks[toks.length - 1]]) {
      out.unit = toks.pop();
    }
    if (toks.length > 1 && SUFFIX[toks[toks.length - 1]]) out.suffix = SUFFIX[toks.pop()];
    toks = toks.map(t => ORD[t] || t);
    let core = toks.join(' ');
    for (const [re, rep] of ALIAS) core = core.replace(re, rep);
    out.core = core.replace(/\s+/g, ' ').trim();
    // keep a version with the directional word, for streets like WEST END BL
    out.coreWithDir = out.dir ? (out.dir + ' ' + out.core) : '';
    return out;
  }

  // Split one roll address ("2 CANAL ST 1901") into parts, same rules.
  function parseRoll(addr) {
    const s = addr.replace(/\s+/g, ' ').trim();
    const m = s.match(/^(\d+)\s+(.*)$/);
    if (!m) return null;
    const toks = m[2].split(' ');
    let unit = '', suffix = '';
    // unit = anything after the last suffix token
    let si = -1;
    for (let i = toks.length - 1; i > 0; i--) if (SUFFIX[toks[i]] && SUFFIX[toks[i]] === toks[i]) { si = i; break; }
    if (si > 0) { suffix = toks[si]; unit = toks.slice(si + 1).join(' '); toks.length = si; }
    return { num: m[1], core: toks.join(' '), suffix, unit };
  }

  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  /* index: Map key "NUM|CORE" -> array of {rec, suffix, unit}
     cores: Set of all street cores (for fuzzy matching) */
  function buildIndex(records, addrOf) {
    const idx = new Map(), cores = new Map();
    for (const rec of records) {
      for (const part of addrOf(rec).split(' | ')) {
        const p = parseRoll(part); if (!p) continue;
        const k = p.num + '|' + p.core;
        if (!idx.has(k)) idx.set(k, []);
        idx.get(k).push({ rec, suffix: p.suffix, unit: p.unit, addr: part.replace(/\s+/g, ' ').trim() });
        if (!cores.has(p.core)) cores.set(p.core, new Set());
        cores.get(p.core).add(p.suffix);
      }
    }
    return { idx, cores };
  }

  function uniq(hits) {
    const seen = new Set(), out = [];
    for (const h of hits) if (!seen.has(h.rec)) { seen.add(h.rec); out.push(h); }
    return out;
  }

  /* Returns {status, method, hits, parsed}
     status: 'match' (one record), 'choose' (several — ask the owner), 'none' */
  function match(input, index) {
    const p = parse(input);
    if (p.notes.includes('po_box')) return { status: 'none', reason: 'A PO box is a mailing address, not a property.', parsed: p, hits: [] };
    if (!p.nums.length) return { status: 'none', reason: 'No house number found.', parsed: p, hits: [] };
    if (!p.core) return { status: 'none', reason: 'No street name found.', parsed: p, hits: [] };
    if (p.zip && !p.zip.startsWith('701')) return { status: 'none', parsed: p, hits: [], reason: 'ZIP ' + p.zip + ' is outside Orleans Parish.' };
    if (p.city && p.city !== 'NEW ORLEANS' && p.city !== 'NOLA' && p.city !== 'ALGIERS')
      return { status: 'none', parsed: p, hits: [], reason: 'That address is in ' + p.city + ', outside Orleans Parish.' };
    let hits = [], method = '';
    const look = core => { let h = []; for (const n of p.nums) h = h.concat(index.idx.get(n + '|' + core) || []); return h; };
    hits = look(p.core); method = 'exact';
    if (!hits.length && p.coreWithDir && index.cores.has(p.coreWithDir)) { p.core = p.coreWithDir; hits = look(p.core); }
    if (!hits.length) {
      // fuzzy street name (typos), same house number
      const max = p.core.length <= 5 ? 1 : 2; let best = max + 1, bestCores = [];
      for (const core of index.cores.keys()) {
        if (core[0] !== p.core[0] && max < 2) continue;
        const d = lev(p.core, core, max);
        if (d < best) { best = d; bestCores = [core]; } else if (d === best) bestCores.push(core);
      }
      if (best <= max) { for (const c of bestCores) hits = hits.concat(look(c)); method = 'fuzzy street (edit distance ' + best + ')'; }
    }
    if (!hits.length && index.cores.has(p.core) && p.nums.length) {
      // Doubles and multi-unit lots are often listed under one side's number
      // (1123 GORDON ST is on the roll as 1121 or 1125). Look up to 4 numbers
      // away on the same side of the street and ask the owner to confirm.
      const n0 = +p.nums[0];
      for (let d = 2; d <= 4 && !hits.length; d += 2) {
        for (const n of [n0 - d, n0 + d]) hits = hits.concat(index.idx.get(n + '|' + p.core) || []);
      }
      if (hits.length) method = 'nearby house number (confirm)';
    }
    if (!hits.length) {
      const streetKnown = index.cores.has(p.core);
      return { status: 'none', parsed: p, hits: [], reason: streetKnown ? 'The street is in the roll but this house number is not.' : 'Street not found in the Orleans Parish roll.' };
    }
    // narrow by suffix when the owner gave one and it helps
    if (p.suffix) { const f = hits.filter(h => h.suffix === p.suffix); if (f.length) hits = f; }
    // narrow by unit
    if (p.unit) { const f = hits.filter(h => h.unit.replace(/\s/g, '') === p.unit); if (f.length) { hits = f; method += ' + unit'; } }
    else { const f = hits.filter(h => !h.unit); if (f.length) hits = f; }
    hits = uniq(hits);
    const confirm = method.startsWith('nearby') || method.startsWith('fuzzy');
    return { status: hits.length === 1 && !confirm ? 'match' : 'choose', method, hits, parsed: p };
  }

  const api = { parse, parseRoll, buildIndex, match, lev };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KYBMatcher = api;
})(typeof window !== 'undefined' ? window : globalThis);
