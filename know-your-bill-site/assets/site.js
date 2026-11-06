/* Shared header, prototype notice, footer, and the bigger-text toggle. */
(function(){
  const page = document.body.dataset.page || '';
  const tiles = (txt, cls) => '<span class="tiles'+(cls?' '+cls:'')+'" aria-hidden="true">' +
    [...txt].map(c => c===' ' ? '<span class="gap"></span>' : '<span>'+c+'</span>').join('') + '</span>';
  const isData = page !== 'home';
  const head = document.getElementById('site-top');
  if (head) head.outerHTML = `
  <div class="proto" role="note"><div class="wrap"><b>Student prototype.</b> Built by a Tulane student for a Real Estate &amp; AI class. Not legal or tax advice, and it can be wrong. Check anything important with the <a href="https://www.nolaassessor.com" target="_blank" rel="noopener">Orleans Parish Assessor</a>.</div></div>
  <header class="top"><div class="wrap">
    <a class="brand" href="index.html" aria-label="Know Your Bill NOLA, home">${tiles('KNOW YOUR BILL')}${tiles('NOLA','rev')}</a>
    <nav class="nav" aria-label="Main">
      <a href="index.html" ${page==='home'?'aria-current="page"':''}>Check my bill</a>
      <a href="data.html" ${isData?'aria-current="page"':''}>Behind the data</a>
      <button type="button" class="bigbtn" id="bigtext" aria-pressed="false">A+ Bigger text</button>
    </nav>
  </div></header>`;

  const sub = document.getElementById('subnav');
  if (sub) {
    const items = [['data','data.html','Explore the data'],['dictionary','dictionary.html','Data dictionary'],['matching','matching.html','Address matching'],['outside','outside-data.html','Outside data'],['testing','testing.html','Testing'],['sources','sources.html','Sources & method']];
    sub.innerHTML = items.map(([k,h,t]) => `<a href="${h}" ${k===page?'aria-current="page"':''}>${t}</a>`).join('');
  }

  const foot = document.getElementById('site-foot');
  if (foot) foot.outerHTML = `
  <footer class="foot"><div class="wrap">
    <div><h4>Know Your Bill NOLA</h4><p>A student prototype that helps New Orleans owners understand their property tax bill. Values come from the Orleans Parish 2026 and 2027 real estate rolls (Louisiana Tax Commission; both use market values as of Jan 1, 2023). Owner names are never shown. Not affiliated with the City, the Assessor, or any official office.</p></div>
    <div><h4>Use the tool</h4><p><a href="index.html">Check my bill</a><br><a href="index.html#ask">Ask a question</a><br><a href="index.html#people">Talk to a person</a></p></div>
    <div><h4>Behind the data</h4><p><a href="data.html">Explore the data</a><br><a href="dictionary.html">Data dictionary</a><br><a href="matching.html">Address matching</a><br><a href="outside-data.html">Outside data</a><br><a href="testing.html">Testing</a><br><a href="sources.html">Sources &amp; method</a></p></div>
  </div><div class="wrap tiny" style="padding-top:0;padding-bottom:24px;display:block;opacity:.75">Darby Brennan · SRED 4935 AI &amp; Real Estate · Tulane University · Fall 2026</div></footer>`;

  const bigBtn = document.getElementById('bigtext');
  function setBig(on){
    document.documentElement.classList.toggle('big', on);
    if (bigBtn){ bigBtn.setAttribute('aria-pressed', on?'true':'false'); bigBtn.textContent = on ? 'A− Normal text' : 'A+ Bigger text'; }
    try{ localStorage.setItem('kyb-big', on?'1':'0'); }catch(e){}
  }
  try{ if (localStorage.getItem('kyb-big')==='1') setBig(true); }catch(e){}
  if (bigBtn) bigBtn.addEventListener('click', () => setBig(!document.documentElement.classList.contains('big')));

  window.KYB = {
    money: n => '$' + Math.round(n).toLocaleString('en-US'),
    cents: n => '$' + Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),
    esc: s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    // Roll addresses are ALL CAPS with roll suffix codes; show them the way people write them.
    nice: a => String(a||'').toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase())
      .replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (m,d,s) => d + s.toLowerCase())
      .replace(/ Av\b/g,' Ave').replace(/ Bl\b/g,' Blvd').replace(/ Hw\b/g,' Hwy').replace(/ Pw\b/g,' Pkwy').replace(/ Wy\b/g,' Way').replace(/ Tr\b/g,' Ter')
      .replace(/\bMac Arthur\b/g,'MacArthur').replace(/\bMc([a-z])/g,(m,c)=>'Mc'+c.toUpperCase())
  };
  // Chart.js defaults shared by data pages
  if (window.Chart){
    Chart.defaults.font.family = "'Public Sans', system-ui, sans-serif";
    Chart.defaults.font.size = 13;
    Chart.defaults.color = '#4B5568';
    Chart.defaults.borderColor = '#E4D9C4';
    Chart.defaults.plugins.legend.labels.boxWidth = 14;
    Chart.defaults.plugins.tooltip.backgroundColor = '#16213A';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.maintainAspectRatio = false;
  }
})();
