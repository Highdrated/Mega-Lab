(function () {
  const LABS = {
    hexle: { name: 'Hexle', path: 'hexle.html', key: 'hexle.v1', kind: 'learned', sub: 'HTML · CSS · JS' },
    webble: { name: 'Webble', path: 'webble.html', key: 'webble.v1', kind: 'school', sub: 'motion · CSS + JS' },
    spelle: { name: 'Java', path: 'spelle.html', sub: 'JavaScript spells' },
    passle: { name: 'Passle', path: 'passle.html', key: 'passle.v2', kind: 'learned', sub: 'PHP' },
    seqle: { name: 'Seqle', path: 'seqle.html', key: 'seqle.v1', kind: 'learned', sub: 'SQL' },
    subnle: { name: 'Subnle Pocket', path: 'subnle-pocket.html', sub: 'subnetting' },
    modle: { name: 'Modle', path: 'modle/index.html', sub: 'math' },
    gitlab: { name: 'Git Lab', path: 'git-lab.html', sub: 'git' },
    shelle: { name: 'Shelle', path: 'shelle.html', sub: 'zsh · Docker' },
    rebble: { name: 'Rebble', path: 'rebble.html', key: 'rebble.v1', sub: 'rebuild your projects' }
  };
  const PROJECTS = { dash: { name: 'IT Dashboard', lab: 'rebble', bp: 'dash' } };
  const L = (lab, ref, title) => ({ lab, ref, title });
  const U = (stage, note) => ({ p: 'dash', stage, note });
  const CONCEPTS = [
    { id: 'skeleton', label: 'Page skeleton', group: 'page', lessons: [L('hexle', 'r14', 'Every page has a skeleton'), L('hexle', 'r1', 'Tags come in pairs')], uses: [U(1, 'doctype, charset, viewport, title')] },
    { id: 'classes', label: 'Classes', group: 'page', lessons: [L('hexle', 'r5', 'Classes name things')], uses: [U(1, '.topbar, .layout, .sidebar'), U(3, '.nav-item and .nav-item.active')] },
    { id: 'stylesheet', label: 'Linking CSS + paths', group: 'page', lessons: [L('hexle', 'r7', 'Three places for CSS'), L('hexle', 'r13', 'Paths point to files')], uses: [U(1, 'href="css/style.css"')] },
    { id: 'grid', label: 'CSS grid', group: 'page', lessons: [L('hexle', 'r31', 'Grid: rows and columns'), L('hexle', 'r50', 'Responsive grids: auto-fit and minmax')], uses: [U(1, '220px | 1fr layout'), U(6, 'auto-fit metric cards')] },
    { id: 'cssvars', label: 'CSS variables', group: 'page', lessons: [L('hexle', 'r30', 'CSS variables')], uses: [U(2, '13 theme tokens')] },
    { id: 'themes', label: 'Theme switching', group: 'page', gap: 'webble', lessons: [L('webble', 'c15', 'App glue')], uses: [U(2, '[data-theme="dark"] block'), U(5, 'setTheme() on <html>')] },
    { id: 'dataattr', label: 'data attributes', group: 'js', lessons: [L('hexle', 'r72', 'data attributes and dataset')], uses: [U(3, 'data-page on every button'), U(4, 'i.dataset.page')] },
    { id: 'events', label: 'Events + classList', group: 'js', lessons: [L('hexle', 'r55', 'Events: addEventListener'), L('hexle', 'r56', 'Classes from JS: classList'), L('webble', 'c3', 'JS triggers')], uses: [U(4, 'navigate() moves .active')] },
    { id: 'domready', label: 'When scripts run', group: 'js', gap: 'webble', lessons: [L('hexle', 'r53', 'Scripts: script.js, defer, console.log'), L('webble', 'c15', 'App glue')], uses: [U(4, 'defer + DOMContentLoaded')] },
    { id: 'storage', label: 'localStorage + JSON', group: 'js', lessons: [L('hexle', 'r63', 'Remember things: localStorage'), L('hexle', 'r64', 'Storing lists: JSON.stringify and parse')], uses: [U(4, 'remember the last page'), U(5, 'getSetting / setSetting')] },
    { id: 'trycatch', label: 'try / catch', group: 'js', lessons: [L('hexle', 'r76', 'Handling failure: try, catch, response.ok'), L('passle', 'pz43', 'Exceptions: throw, try, catch, finally')], uses: [U(5, 'a broken setting never crashes'), U(7, 'fetchData() with finally')] },
    { id: 'percent', label: 'Percentages + rounding', group: 'math', lessons: [L('modle', 'Rounding', 'Rounding')], uses: [U(6, 'pct() → Math.round')] },
    { id: 'render', label: 'Data → HTML', group: 'js', lessons: [L('hexle', 'r57', 'let, const and template literals'), L('hexle', 'r60', 'Functions that build elements'), L('spelle', 'ARRAYS', 'ARRAYS'), L('spelle', 'OBJECTS', 'OBJECTS')], uses: [U(6, 'METRICS.map(…).join(\'\')')] },
    { id: 'numfmt', label: 'Formatting numbers', group: 'js', gap: 'webble', lessons: [L('passle', 'pz6', 'Formatting numbers'), L('webble', 'c15', 'App glue')], uses: [U(6, 'fmt(1180) → 1,180')] },
    { id: 'phparrays', label: 'PHP arrays + foreach', group: 'php', lessons: [L('passle', 'pz8', 'Keyed arrays'), L('passle', 'pz9', 'The array toolbox'), L('passle', 'pz10', 'foreach: one pass per item')], uses: [U(7, 'data.php adds up ports and racks')] },
    { id: 'json', label: 'JSON APIs', group: 'php', lessons: [L('passle', 'pz28', 'Reading a JSON file'), L('passle', 'pz57', 'JSON responses')], uses: [U(7, 'read_json() + json_encode')] },
    { id: 'dir', label: '__DIR__ + folders', group: 'php', lessons: [L('passle', 'pz17', '__DIR__ and the project folders')], uses: [U(7, "__DIR__ . '/../data/sites.json'")] },
    { id: 'fetch', label: 'fetch + await', group: 'js', lessons: [L('hexle', 'r75', 'fetch, async and await'), L('hexle', 'r76', 'Handling failure: try, catch, response.ok')], uses: [U(7, 'fetch(API_URL)'), U(10, 'POST from saveNote()')] },
    { id: 'filtersort', label: 'filter, sort, limit', group: 'data', lessons: [L('hexle', 'r71', 'filter and sort'), L('seqle', 's5', 'ORDER BY sorts the rows'), L('seqle', 's6', 'LIMIT keeps the first rows')], uses: [U(8, 'filter box on the IP table'), U(11, 'newest first, max 8')] },
    { id: 'paging', label: 'Pagination math', group: 'math', lessons: [L('modle', 'Pagination', 'Pagination'), L('modle', 'Rounding up', 'Rounding up')], uses: [U(8, 'Math.ceil(14 / 10) = 2 pages')] },
    { id: 'cidr', label: 'CIDR sizes', group: 'net', lessons: [L('subnle', 'prefix', 'The /number'), L('subnle', 'block', 'Block size'), L('subnle', 'hosts', 'Counting hosts')], uses: [U(8, 'a /26 holds 64 addresses')] },
    { id: 'post', label: 'GET vs POST', group: 'php', lessons: [L('passle', 'pz21', 'GET reads, POST changes'), L('passle', 'pz20', 'Reading input with ??')], uses: [U(9, 'php://input + ??')] },
    { id: 'validate', label: 'Allow-lists + 400', group: 'php', lessons: [L('passle', 'pz23', 'Allowlists and an errors list'), L('passle', 'pz46', 'HTTP status codes')], uses: [U(9, 'invalid page → 400')] },
    { id: 'locks', label: 'Writing files safely', group: 'php', lessons: [L('passle', 'pz29', 'Writing JSON back'), L('passle', 'pz84', 'File modes, locks and streams')], uses: [U(9, "fopen 'c+' + flock")] },
    { id: 'escape', label: 'Escaping (XSS)', group: 'js', gap: 'webble', lessons: [L('passle', 'pz3', 'Escape on the way out'), L('webble', 'c15', 'App glue')], uses: [U(10, 'escapeHtml() on every note'), U(11, 'activity text')] },
    { id: 'dates', label: 'Dates + time ago', group: 'js', lessons: [L('hexle', 'r68', 'Dates: new Date and toLocaleTimeString'), L('hexle', 'r85', 'Date maths: getDay, getDate and day 0'), L('passle', 'pz51', 'Dates: DateTimeImmutable and format')], uses: [U(10, "date('c') on every post"), U(11, 'relAge() → 5m ago')] },
    { id: 'combine', label: 'Combining data', group: 'data', lessons: [L('hexle', 'r69', 'Objects: named values'), L('seqle', 's12', 'GROUP BY makes one row per group')], uses: [U(11, 'Object.keys(notes) → one list')] },
    { id: 'svgmap', label: 'SVG + scaling', group: 'math', gap: 'modle', lessons: [L('webble', 'c11', 'SVG & shapes'), L('modle', 'Scaling a range', 'Scaling a range'), L('webble', 'c15', 'App glue')], uses: [U(12, 'latLngToXY()')] },
    { id: 'modal', label: 'Popups', group: 'js', gap: 'webble', lessons: [L('hexle', 'r81', 'The dialog element'), L('hexle', 'r74', 'Keyboard events'), L('webble', 'c15', 'App glue')], uses: [U(12, 'backdrop click + Escape')] },
    { id: 'config', label: 'Config + constants', group: 'php', lessons: [L('passle', 'pz103', 'Configuration and extensions'), L('passle', 'pz104', 'Constants and magic constants')], uses: [U(13, "define('CACHE_TTL', 120)")] },
    { id: 'git', label: 'Commits + .gitignore', group: 'ship', lessons: [L('gitlab', 'm1', 'M-01 // FIRST CARGO'), L('gitlab', 'm3', 'M-03 // THE IGNORE LIST')], uses: [U(13, 'config.php stays out of git'), U(0, 'git init · add · commit')] },
    { id: 'cache', label: 'Response cache', group: 'php', gap: 'passle', lessons: [L('passle', 'pz99', 'Headers, caching and 304'), L('passle', 'pz107', 'A cache file with a timer')], uses: [U(13, 'filemtime + CACHE_TTL')] },
    { id: 'phpserver', label: 'php -S + ports', group: 'ship', lessons: [L('shelle', 'procs', 'Processes & ports'), L('shelle', 'port', 'Port is already allocated')], uses: [U(0, 'php -S localhost:8000')] },
    { id: 'curl', label: 'curl an API', group: 'ship', lessons: [L('shelle', 'net', 'Network checks')], uses: [U(0, 'curl -s localhost:8000/api/data.php')] },
    { id: 'docker', label: 'Dockerfile + permissions', group: 'ship', gap: 'shelle', lessons: [L('shelle', 'docker', 'Docker basics'), L('shelle', 'ship', 'Ship a PHP app')], uses: [U(0, 'FROM php:8.2-apache + chown www-data')] }
  ];
  const GROUPS = { page: 'Page · HTML + CSS', js: 'Behaviour · JavaScript', php: 'Server · PHP', data: 'Data', math: 'Math', net: 'Network', ship: 'Shipping' };

  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function lessonDone(lab, ref) {
    const L0 = LABS[lab]; if (!L0 || !L0.key) return null;
    const s = read(L0.key); if (!s) return false;
    if (L0.kind === 'learned') return Array.isArray(s.learned) && s.learned.includes(ref);
    if (L0.kind === 'school') return !!(s.school && s.school[ref]);
    return null;
  }
  function stagePassed(stage) { const s = read(LABS.rebble.key); if (!s || !s.passed) return false; return stage === 0 ? !!(s.mission && s.mission.dash && s.mission.dash.done) : !!s.passed['dash:' + stage]; }
  const ME = document.currentScript;
  const BASE = ME && ME.src ? ME.src.replace(/data\/links\.js.*$/, '') : '';
  function projectHref(u) { return BASE + 'rebble.html?bp=' + u.p + (u.stage ? '&stage=' + u.stage + '&view=school' : '&view=mission'); }
  function labHref(lab) { return BASE + LABS[lab].path; }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function calloutHtml(c, from) {
    const uses = c.uses.map((u) => '<b>' + esc(PROJECTS[u.p].name) + '</b> · ' + (u.stage ? 'stage ' + u.stage : 'take it home') + ': ' + esc(u.note) + ' <a href="' + projectHref(u) + '" target="_self">open in Rebble →</a>').join('<br>');
    return '<span class="ml-ic" aria-hidden="true">⌁</span><span><span class="ml-k">Used in a real project</span> · ' + esc(c.label) + '<br>' + uses + '</span>';
  }
  function compactHtml(c) { const u = c.uses[0]; const nums = c.uses.filter((x) => x.stage).map((x) => x.stage), home = c.uses.some((x) => !x.stage); const st = (nums.length ? 'stage ' + nums.join(' · ') : '') + (home ? (nums.length ? ' · ' : '') + 'take it home' : ''); return '<span class="ml-ic">⌁</span><span>' + esc(PROJECTS[u.p].name) + ' · ' + st + ' <a href="' + projectHref(u) + '" target="_self" title="' + esc(c.uses.map((x) => x.note).join(' / ')) + '">→</a></span>'; }
  const CSS = '.ml-callout.ml-compact{margin:6px 0;padding:3px 8px;font-size:11px}.ml-callout{display:flex;gap:8px;align-items:flex-start;line-height:1.55;font-family:inherit;margin:10px 0;padding:8px 12px;border-left:2px solid currentColor;border-radius:0 8px 8px 0;background:color-mix(in srgb,currentColor 7%,transparent);opacity:.9;text-align:left;letter-spacing:normal;text-transform:none;font-weight:400;font-size:12px}.ml-callout b{font-weight:600}.ml-callout a{color:inherit;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}.ml-callout .ml-k{font-weight:700;letter-spacing:.04em}.ml-callout .ml-ic{font-weight:700}';
  const SKIP = 'button,option,select,textarea,input,label,a,nav,script,style,[role=tab],[role=listbox],[role=option],.ml-callout,.cm,.CodeMirror';
  function inject(lab) {
    const wanted = [];
    CONCEPTS.forEach((c) => c.lessons.forEach((l) => { if (l.lab === lab) wanted.push({ c, t: l.title.trim().toLowerCase() }); }));
    if (!wanted.length) return;
    if (!document.getElementById('ml-css')) { const st = document.createElement('style'); st.id = 'ml-css'; st.textContent = CSS; document.head.appendChild(st); }
    let t = null;
    const scan = () => {
      t = null;
      const els = document.body.querySelectorAll('h1,h2,h3,h4,.lt,.ttl,.title,div,span,b,strong,p,li');
      for (const el of els) {
        if (el.dataset.ml || el.children.length > 2) continue;
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!txt || txt.length > 60) continue;
        const hits = wanted.filter((w) => w.t === txt || txt.startsWith(w.t + ' · '));
        if (!hits.length) continue;
        if (el.closest(SKIP)) continue;
        if (el.parentElement && el.parentElement.closest('[data-ml]')) continue;
        const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
        el.dataset.ml = '1';
        const seen = new Set();
        const fs = parseFloat(getComputedStyle(el).fontSize) || 16, compact = fs < 20;
        let anchor = /^(SPAN|B|STRONG)$/.test(el.tagName) ? el.parentElement : el;
        for (let i = 0; i < 3 && anchor.parentElement; i++) { const ps = getComputedStyle(anchor.parentElement); if (ps.display.includes('flex') && !ps.flexDirection.startsWith('column')) anchor = anchor.parentElement; else break; }
        hits.forEach((h) => { if (seen.has(h.c.id)) return; seen.add(h.c.id); const d = document.createElement('div'); d.className = 'ml-callout' + (compact ? ' ml-compact' : ''); d.innerHTML = compact ? compactHtml(h.c) : calloutHtml(h.c, lab); anchor.insertAdjacentElement('afterend', d); anchor = d; });
      }
    };
    new MutationObserver(() => { if (!t) t = setTimeout(scan, 250); }).observe(document.body, { childList: true, subtree: true });
    scan();
  }

  window.MegaLinks = { LABS, PROJECTS, CONCEPTS, GROUPS, lessonDone, stagePassed, labHref, projectHref, calloutHtml, inject };
  const lab = ME && ME.dataset.lab;
  if (lab && lab !== 'rebble') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => inject(lab)); else inject(lab); }
})();
