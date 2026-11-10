// <script src="/fw-bar.js" defer> before </body> on every HTML page of fork./mempool.ecpool.tech.
// Shows: link to the pool, ECX price (wECX on Jupiter, from ecpool.tech's /api/pool/market, proxied
// Built with createElement/textContent only — nothing from the API is parsed as HTML.
(function () {
  'use strict';
  // fork page: fork-observer's main.js sets the tab title to "fork-observer - <network>"; show our name
  // (runs before the hide check, so closing the pill does not bring the old name back)
  if (location.hostname.indexOf('fork.') === 0) {
    var fixTitle = function () {
      if (document.title.indexOf('fork-observer') >= 0)
        document.title = document.title.replace('fork-observer', 'eCPool Fork Watch');
    };
    fixTitle();
    var t = document.querySelector('title');
    if (t && window.MutationObserver) new MutationObserver(fixTitle).observe(t, { childList: true });

    // every pool name in its own colour, picked from a fixed set by a hash of the name, so a pool keeps
    // its colour across reloads. The set leaves out red (invalid), orange (our pool) and bright green
    // (active tip) so a label never reads as a tip status. Our pool keeps the ecpool.tech orange.
    // into one slice. Picked to be as far apart as possible (OKLab), each >= 4.5:1 on a dark page; the order puts
    // the most different colours first. pool-registry-sync.py reads this list: change it here only.
    var PALETTE = ['#a855f7', '#67e8f9', '#f0abfc', '#bef264', '#3b82f6', '#f472b6', '#06b6d4', '#a78bfa', '#e7d7a8', '#a5b4fc',
                   '#e879f9', '#2dd4bf', '#a8865a', '#60a5fa', '#d946ef', '#fde047', '#cbd5e1', '#c8b48a', '#ec4899', '#14b8a6'];
    // the known ECX pools (pool list 3001-3108) each get their own colour — they are the ones that
    // matter after the fork; Bitcoin pools share the hashed colours (collisions there are fine)
    // pool-registry:ecx-colours begin
    var ECX_POOLS = { 'FreeBank': '#2dd4bf', 'bip300.xyz': '#a8865a', 'ePool': '#60a5fa', 'Pow.re': '#d946ef',
                      'guilastuce': '#fde047', 'kikko-ecash': '#cbd5e1', 'complicatedpool': '#c8b48a',
                      'avonpool': '#ec4899', 'ecashpool.io': '#14b8a6', 'euhashme': '#a855f7', 'Skydoge.net': '#67e8f9',
                      'ECX Solopool': '#f0abfc', 'Talking to you from the future': '#bef264', 'simplepool': '#3b82f6',
                      'solo-ecash': '#f472b6', 'ec-pool': '#06b6d4', 'NurseryPool': '#a78bfa', 'laPimpa': '#e7d7a8',
                      'SupaPool': '#a5b4fc', 'betaTests123': '#e879f9', 'Nanaco\'s Solo Mining Farm': '#2dd4bf',
                      'ECX-SOLO': '#a8865a', 'molepool.com': '#60a5fa', 'BCM-ECX-PPLNS': '#d946ef',
                      'Szats.world': '#fde047', 'SegPool': '#cbd5e1', 'vaultnet': '#c8b48a' };
    // pool-registry:ecx-colours end
    // the mining feed and our pool list spell some pools differently ("Antpool" / "AntPool",
    // "Binance" / "Binance Pool"): colour by a loose key so a pool keeps ONE colour from
    // "being mined" to its found block
    var looseKey = function (name) {
      return name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/pool$/, '');
    };
    var ECX_KEYS = {};
    for (var p in ECX_POOLS) ECX_KEYS[looseKey(p)] = ECX_POOLS[p];
    var poolColor = function (name) {
      if (/ecpool\.tech/i.test(name)) return '#ffb347';
      var key = looseKey(name);
      if (Object.prototype.hasOwnProperty.call(ECX_KEYS, key)) return ECX_KEYS[key];
      var h = 0;
      for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
      return PALETTE[h % PALETTE.length];
    };
    // fork-observer cuts labels to 14 characters + "…": map a cut label back to a known ECX pool name
    var fullName = function (label) {
      if (label.slice(-1) !== '\u2026') return label;
      var stem = label.slice(0, -1);
      for (var k in ECX_POOLS) if (k.indexOf(stem) === 0) return k;
      return stem;
    };
    // pool logo from the explorer's set (same pool list, same file names: name lower-cased, letters and
    // digits only, e.g. "Foundry USA" -> foundryusa.svg). 11-07: explorer.ecpool.tech (mempool.ecpool.tech
    // that fails, no icon. (A missing file answers 200 with HTML, which fails to load as an image.)
    var LOGO_BASE = 'https://explorer.ecpool.tech/resources/mining-pools/';
    var LOGO_DEFAULT = LOGO_BASE + 'default.svg';
    var SVGNS = 'http://www.w3.org/2000/svg';
    var ICON = 9;                           // matches the 9px found-block label (fw-theme.css)
    var placeIcon = function (text, name) {
      var g = text.parentNode;
      if (!g || !g.classList || !g.classList.contains('block-miner-group')) return true;   // found blocks only
      var slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!slug) return true;                 // nothing a logo file could be named after
      // not laid out yet (hidden tab, first paint): Firefox throws, others give a 0 box — retry later
      var box;
      try { box = text.getBBox(); } catch (e) { return false; }
      if (!box.width) return false;
      var img = g.querySelector('image.fw-pool-icon');
      var href = LOGO_BASE + slug + '.svg';
      if (!img) {
        img = document.createElementNS(SVGNS, 'image');
        img.setAttribute('class', 'fw-pool-icon');
        img.setAttribute('width', ICON);
        img.setAttribute('height', ICON);
        img.addEventListener('error', function () {
          if (this.getAttribute('href') !== LOGO_DEFAULT) this.setAttribute('href', LOGO_DEFAULT);
          else this.style.display = 'none';
        });
        g.appendChild(img);
      }
      if (img.getAttribute('data-fw-slug') !== slug) {
        img.setAttribute('data-fw-slug', slug);
        img.style.display = '';
        img.setAttribute('href', href);
      }
      // the group carries the rotation, so the text's local box lines up with the icon
      img.setAttribute('x', box.x - ICON - 2);
      img.setAttribute('y', box.y + (box.height - ICON) / 2);
      return true;
    };
    var paintPools = function () {
      // found blocks (text.block-miner) and the pools shown around a "being mined" block
      var labels = document.querySelectorAll('text.block-miner, text.mining-pool-text');
      for (var i = 0; i < labels.length; i++) {
        var n = labels[i], label = n.textContent || '';
        if (n.getAttribute('data-fw-pool') === label) continue;   // already done for this label
        n.setAttribute('data-fw-pool', label);
        // 11-07: a found block's text carries d3's datum with the FULL pool name (fork-observer cuts the
        // label at 14 characters) - so "Talking to you from the future" gets its own icon, as on the explorer.
        // The "being mined" labels have no such datum: fall back to the ECX_POOLS lookup.
        var dd = n.__data__, datumName = dd && dd.data && dd.data.data && dd.data.data.miner;
        var name = (typeof datumName === 'string' && datumName) ? datumName : fullName(label);
        var c = poolColor(name);
        n.style.fill = c;
        var bg = n.parentNode && n.parentNode.querySelector('rect.mining-pool-bg');
        if (bg) bg.style.stroke = c;
        if (label && !placeIcon(n, name)) n.removeAttribute('data-fw-pool');   // retried on the next change
      }
    };
    var queued = false;
    var schedulePaint = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; paintPools(); });
    };
    if (window.MutationObserver) {
      new MutationObserver(schedulePaint)
        .observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    schedulePaint();
    // an orientation change moves the labels without changing their text: re-place every icon
    var orient = document.getElementById('orientation');
    if (orient) orient.addEventListener('change', function () {
      setTimeout(function () {
        var done = document.querySelectorAll('[data-fw-pool]');
        for (var i = 0; i < done.length; i++) done[i].removeAttribute('data-fw-pool');
        schedulePaint();
      }, 300);
    });
  }

  // even electric lightnings through"); its glow is in fw-mempool.css. mempool names every mined cube
  // id="bitcoin-block-<height>". Fixed SVG paths built with createElementNS — no page or API text used.
  // Runs before the pill's hide check, so closing the pill keeps the bolts.
  if (location.hostname.indexOf('mempool.') === 0 && window.MutationObserver) {
    var FORK_CUBE = 'bitcoin-block-973728';
    var SVGNS = 'http://www.w3.org/2000/svg';
    var BOLTS = [   // in a 100×100 box stretched over the cube's front face
      'M30,-4 L38,22 L26,30 L44,56 L33,63 L52,104',
      'M78,-4 L66,18 L80,34 L60,52 L72,61 L58,104',
      'M-4,48 L22,42 L30,56 L54,46 L64,58 L104,50'
    ];
    var addBolts = function () {
      var cube = document.getElementById(FORK_CUBE);
      if (!cube || cube.querySelector('.fw-bolts')) return;
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'fw-bolts');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < BOLTS.length; i++) {
        var path = document.createElementNS(SVGNS, 'path');
        path.setAttribute('d', BOLTS[i]);
        path.setAttribute('class', 'fw-bolt fw-bolt-' + i);
        svg.appendChild(path);
      }
      cube.appendChild(svg);
    };
    var boltQueued = false;
    new MutationObserver(function () {
      if (boltQueued) return;
      boltQueued = true;
      requestAnimationFrame(function () { boltQueued = false; addBolts(); });
    }).observe(document.body, { childList: true, subtree: true });
    addBolts();
  }

  // block fork watch knows there out: pool, main chain / orphan / rejected / Bitcoin. Read-only: it only reads the
  // page's own /api/1/data.json. Nothing typed is ever put into the page as HTML (textContent only).
  // Own function scope (11-07 fix): its `var load` overwrote the price bar's `function load` below (hoisting), so the
  // price never showed. Nothing declared in here can reach the bar code.
  if (location.hostname.indexOf('fork.') === 0 && window.top === window && !document.getElementById('fw-search')) (function () {
    var EXPLORER = 'https://explorer.ecpool.tech/';
    var FORK_HEIGHT = 973728;   // ECX left Bitcoin here
    var cache = null, cacheAt = 0;
    var mk = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    var load = function () {
      if (cache && Date.now() - cacheAt < 60000) return Promise.resolve(cache);
      return fetch('/api/1/data.json', { credentials: 'omit' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (d) { var ix = index(d); if (!ix.starting) { cache = ix; cacheAt = Date.now(); } return ix; });
    };
    // Label every block: walk back from the ECX node's active tip = main chain; Bitcoin = everything that descends
    // from the other block at the fork height; the rest are ECX rivals, labelled by the node's tip status if known.
    var index = function (d) {
      var hs = (d && d.header_infos) || [], byId = {}, byHash = {}, byHeight = {}, kids = {};
      hs.forEach(function (h) {
        byId[h.id] = h; byHash[h.hash] = h;
        (byHeight[h.height] = byHeight[h.height] || []).push(h);
        (kids[h.prev_id] = kids[h.prev_id] || []).push(h.id);
      });
      var node = (d.nodes || [])[0] || {}, tips = node.tips || [], label = {};
      var walk = function (hash, stopAt) {
        var out = [], h = byHash[hash];
        while (h && !(stopAt && stopAt[h.id])) { out.push(h.id); h = byId[h.prev_id]; }
        return out;
      };
      var main = {};
      // Right after a restart fork watch has no node tips yet: without the active tip nothing can be labelled
      // (11-07: the largest branch at the fork height, ECX's, was then called Bitcoin). Not cached.
      if (!tips.some(function (t) { return t.status === 'active' && byHash[t.hash]; })) return { starting: true };
      tips.filter(function (t) { return t.status === 'active'; }).forEach(function (t) {
        walk(t.hash).forEach(function (id) { main[id] = 1; label[id] = 'main'; });
      });
      // Bitcoin = the subtree of the ONE non-main block at the fork height with by far the most descendants (the
      // frozen Bitcoin chain). Other non-main blocks there are ECX orphans (11-07: the pool node's fork-week orphans).
      var sub = function (id0) {
        var seen = {}, q = [id0];
        while (q.length) { var id = q.pop(); if (seen[id]) continue; seen[id] = 1; (kids[id] || []).forEach(function (k) { q.push(k); }); }
        return seen;
      };
      var btc = {}, best = 0;
      (byHeight[FORK_HEIGHT] || []).forEach(function (h) {
        if (main[h.id]) return;
        var s = sub(h.id), n = Object.keys(s).length;
        if (n > best) { best = n; btc = s; }
      });
      if (best < 10) btc = {};   // no real Bitcoin chain in the data
      Object.keys(btc).forEach(function (id) { label[id] = 'btc'; });
      tips.filter(function (t) { return t.status !== 'active'; }).forEach(function (t) {
        var st = t.status === 'invalid' ? 'invalid' : 'orphan';
        walk(t.hash, main).forEach(function (id) { if (!btc[id]) label[id] = st; });
      });
      hs.forEach(function (h) { if (!label[h.id]) label[h.id] = 'orphan'; });
      var low = Infinity, top = 0; hs.forEach(function (h) { if (h.height < low) low = h.height; if (h.height > top) top = h.height; });
      return { byHash: byHash, byHeight: byHeight, label: label, low: low, top: top };
    };
    var TEXT = { main: 'ECX main chain', orphan: 'Orphan: not on the ECX main chain', invalid: 'Rejected: invalid under the ECX rules', btc: 'Bitcoin chain (shown for reference)' };
    var box = mk('div'); box.id = 'fw-search';
    var form = mk('form'); form.setAttribute('role', 'search');
    var input = mk('input'); input.type = 'search'; input.placeholder = 'Block height or hash'; input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Search a block by height or hash'); input.maxLength = 64;
    var btn = mk('button', null, 'Search'); btn.type = 'submit';
    var out = mk('div', 'fw-search-out'); out.setAttribute('aria-live', 'polite');
    form.appendChild(input); form.appendChild(btn); box.appendChild(form);
    var seq = 0;
    var addClose = function () {
      var x = mk('button', 'fw-search-close', '×'); x.type = 'button';
      x.title = 'Close'; x.setAttribute('aria-label', 'Close search results');
      x.addEventListener('click', function () { seq++; out.textContent = ''; input.value = ''; });   // seq: a search still loading stays closed
      out.insertBefore(x, out.firstChild);
    };
    var say = function (t) { out.textContent = ''; if (t) { out.appendChild(mk('p', 'fw-search-msg', t)); addClose(); } };
    var row = function (h, ix) {
      var r = mk('div', 'fw-search-row fw-st-' + ix.label[h.id]);
      r.appendChild(mk('span', 'fw-search-h', String(h.height)));
      r.appendChild(mk('span', 'fw-search-pool', h.miner && h.miner !== 'Unknown' ? h.miner : 'Pool unknown'));
      r.appendChild(mk('span', 'fw-search-st', TEXT[ix.label[h.id]]));
      var hash = mk('code', 'fw-search-hash', h.hash); hash.title = 'Block hash'; r.appendChild(hash);
      var links = mk('span', 'fw-search-links');
      if (ix.label[h.id] === 'main') {
        var a = mk('a', null, 'Open in explorer ↗'); a.href = EXPLORER + 'block/' + h.hash; a.target = '_blank'; a.rel = 'noopener';
        links.appendChild(a);
      }
      var show = mk('a', null, 'Show in fork watch ↓'); show.href = '#drawing-area';
      show.addEventListener('click', function (e) { e.preventDefault(); showBlock(h.hash, r); });
      links.appendChild(show);
      r.appendChild(links);
      return r;
    };
    // own page-wide state (blocktree.js: layoutCache, zoom, svg, o, onBlockClick); if that ever changes, it says so.
    var showBlock = function (hash, r) {
      var note = function (t) { var old = r.querySelector('.fw-search-note'); if (old) old.remove(); r.appendChild(mk('span', 'fw-search-note', t)); };
      try {
        /* global layoutCache, zoom, svg, o, onBlockClick, d3 */
        var root = layoutCache.layout[0], htoi = layoutCache.layout[2];
        var node = root.descendants().find(function (n) { return n.data.data.hash === hash; });
        if (!node) { note('This block sits inside a folded "blocks hidden" stretch of the main chain, so it has no box of its own.'); return; }
        var viz = document.getElementById('drawing-area');
        viz.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var box = viz.getBoundingClientRect();
        zoom.translateTo(svg.transition(d3.transition().duration(750)), o.x(node, htoi), o.y(node, htoi), [box.width / 2, box.height / 2]);
        var tries = 0;
        var openCard = function () {   // after the pan the block is drawn (slow phones: retry up to ~2 s)
          var el = null;
          d3.selectAll('g.block').each(function (d) { if (d && d.data && d.data.data.hash === hash) el = this; });
          if (!el) { if (++tries < 6) setTimeout(openCard, 250); return; }
          var open = false;
          d3.selectAll('.block-description').each(function () { if (this.getAttribute('data-hash') === hash) open = true; });
          if (!open) onBlockClick({ target: el }, d3.select(el).datum());
        };
        setTimeout(openCard, 800);
      } catch (err) {
        note('Could not move the view. Please use the tree directly.');
      }
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var mine = ++seq;   // any new submit (even invalid) drops a search still loading
      var q = (input.value || '').trim().toLowerCase();
      var isHeight = /^\d{1,7}$/.test(q), isHash = /^[0-9a-f]{64}$/.test(q);
      if (!isHeight && !isHash) { say('Type a block height (e.g. 983167) or a 64-character block hash.'); return; }
      say('Searching…');
      load().then(function (ix) {
        if (mine !== seq) return;
        if (ix.starting) { say('Fork watch is still starting. Please try again in a minute.'); return; }
        var found = isHeight ? (ix.byHeight[+q] || []) : (ix.byHash[q] ? [ix.byHash[q]] : []);
        out.textContent = '';
        if (found.length) {
          if (isHeight && found.length > 1) out.appendChild(mk('p', 'fw-search-msg', found.length + ' blocks at this height:'));
          found.forEach(function (h) { out.appendChild(row(h, ix)); });
          addClose();
          return;
        }
        // Not in fork watch's data: a quiet main-chain block (fork watch folds those) or older than its window.
        var p = mk('p', 'fw-search-msg');
        p.appendChild(document.createTextNode(isHeight && +q >= ix.low && +q <= ix.top
          ? 'Fork watch only knows the main-chain block at ' + q + '. A block that lost a race often never reaches other ' +
            'nodes, so an orphan can still exist there; your pool can confirm it. '
          : 'Fork watch does not know this block. '));
        var a = mk('a', null, 'Look it up in the explorer ↗'); a.href = EXPLORER + 'block/' + q; a.target = '_blank'; a.rel = 'noopener';
        p.appendChild(a); out.appendChild(p); addClose();
      }).catch(function () { if (mine === seq) say('Could not load fork watch data. Please try again in a minute.'); });
    });
    // above the tree. Without the toolbar (page changed), both go above the tree as before.
    var placeSearch = function () {
      var viz = document.getElementById('drawing-area');
      var host = viz && viz.parentNode;
      if (!host || !host.parentNode) return false;
      var controls = document.querySelector('.toolbar-controls');
      if (controls) { box.className = 'fw-search-side'; controls.appendChild(box); }
      else host.parentNode.insertBefore(box, host);
      host.parentNode.insertBefore(out, host);
      return true;
    };
    if (!placeSearch()) {
      var tries2 = 0, t2 = setInterval(function () { if (placeSearch() || ++tries2 > 40) clearInterval(t2); }, 250);
    }
  })();

  if (window.top !== window) return;   // not inside embeds/iframes
  if (document.getElementById('fw-bar')) return;

  var onFork = location.hostname.indexOf('fork.') === 0;
  var other = onFork
    ? { href: 'https://explorer.ecpool.tech/', text: 'Explorer' }
    : { href: 'https://fork.ecpool.tech/', text: 'Fork watch' };

  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text) n.textContent = text;
    return n;
  }
  function link(href, text, css) {
    var a = el('a', 'color:#9ecbff;text-decoration:none;font-weight:600;' + (css || ''), text);
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    return a;
  }

  var bar = el('div',
    'position:fixed;right:12px;bottom:12px;z-index:2147483000;display:flex;align-items:center;' +
    'gap:10px;flex-wrap:wrap;max-width:calc(100vw - 24px);box-sizing:border-box;padding:7px 10px 7px 12px;' +
    'border-radius:12px;background:var(--ecx-elevated,#171615);color:#e6e8f0;border:1px solid var(--ecx-accent-dim,#8a5514);' +
    'box-shadow:0 4px 18px rgba(0,0,0,.35);font:13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif');
  bar.id = 'fw-bar';
  bar.setAttribute('data-noprice', '');   // until the first price arrives: no lone "|" (show() clears it)

  // pool button in ecpool.tech's default theme colours (--accent-2 → --accent, text --on-accent)
  var pool = link('https://ecpool.tech/', '⛏ Mine ',
    'color:var(--ecx-on-accent,#1a1000);background:linear-gradient(180deg,var(--ecx-accent-2,#ffb347),var(--ecx-accent,#f7941d));padding:4px 11px;' +
    'border-radius:999px;font-weight:700;white-space:nowrap;box-shadow:0 0 0 1px rgba(255,179,71,.35),0 2px 10px var(--ecx-glow,rgba(247,148,29,.45))');
  // parts of the text, so the phone layout in fw-mempool.css can shorten it: "Mine at eCPool.tech" or "Mine ECX"
  // white on the orange button there; the parts must take the button's dark text colour, as on the explorer.
  function part(cls, text) { var s = el('span', 'color:inherit', text); s.className = cls; return s; }
  pool.appendChild(part('fw-ecx', 'ECX '));
  pool.appendChild(part('fw-where', 'at eCPool.tech'));
  // the price links to wECX on Jupiter, same link as the pool site (EarnEstimate.tsx). The mint is fixed
  // can never point people at another token.
  var WECX_MINT = '6ombVv3YMs9qpx1QkycD9XW8HKSfv7vGrCFX3cxCYMVY';
  var price = link('https://jup.ag/tokens/' + WECX_MINT, '', 'display:none;white-space:nowrap;color:#e6e8f0;font-weight:400');
  var sep = el('span', 'opacity:.35;color:#e6e8f0', '|');
  sep.className = 'fw-sep';
  var swap = link(other.href, other.text + ' ↗', 'font-weight:500');
  swap.className = 'fw-swap';

  // pool button on top, price | other page below; one row in the fork header
  var row2 = el('div', 'display:flex;align-items:center;gap:10px');
  row2.appendChild(price); row2.appendChild(sep); row2.appendChild(swap);
  bar.appendChild(pool); bar.appendChild(row2);
  // fork page on a wide screen (≥1200 px: title + pill with price + network controls fit): sit in
  // the header right after the eCPool FORK WATCH logo
  // (the navbar is flex with space-between; auto margins on both sides centre it between them).
  // Explorer on a wide screen (2026-11-05): one line in the top bar, between the menu icons and the search box.
  // logo, styled by .fw-compact in fw-mempool.css. In between there is no room, so it floats.
  // Angular draws the bars after this script starts and swaps them between pages, so keep checking.
  var brand = onFork && document.querySelector('.app-header .navbar-brand');
  var wide = window.matchMedia && matchMedia('(min-width: 1200px)').matches;
  function inline(after, margin) {
    bar.style.position = 'static';
    bar.style.margin = margin;
    bar.style.padding = '4px 8px 4px 5px';
    bar.style.boxShadow = 'none';
    bar.style.maxWidth = 'none';
    bar.style.flexDirection = 'row';
    bar.style.flexWrap = 'nowrap';
    bar.style.flex = 'none';
    bar.style.whiteSpace = 'nowrap';
    after.parentNode.insertBefore(bar, after.nextSibling);
  }
  function floating() {
    bar.style.flexDirection = 'column';
    bar.style.alignItems = 'center';
    bar.style.gap = '6px';
    bar.style.padding = '8px 10px';
    // phones: mempool has a bottom menu bar (~56 px) — sit above it
    if (window.matchMedia && matchMedia('(max-width: 575px)').matches) bar.style.bottom = '72px';
    document.body.appendChild(bar);
  }
  var BASE_CSS = bar.style.cssText, placed = '', tries = 0;
  function reset(mode) { bar.style.cssText = BASE_CSS; bar.className = ''; placed = mode; }
  function placeExplorer() {
    var w = window.innerWidth, wait = false;
    if (w < 992) {
      // the phone transaction page has its own header, without the app's top bar
      var host = document.querySelector('app-tracker .nav-header') || document.querySelector('header nav.navbar');
      if (host) {
        tries = 0;
        if (placed === 'compact' && bar.parentNode === host) return;
        reset('compact');
        bar.style.cssText = '';
        bar.className = 'fw-compact';
        host.appendChild(bar);
        return;
      }
      wait = true;
    } else if (w >= 1380) {   // under this the search button is cut off
      var menu = document.querySelector('#navbarCollapse .navbar-nav');
      if (menu) {
        tries = 0;
        if (placed !== 'inline' || bar.parentNode !== menu.parentNode) { reset('inline'); inline(menu, '0 12px'); }
        return;
      }
      wait = placed !== 'compact';   // the small layout must not linger on a wide screen
    }
    // Give the app about 10 s to draw its bar. A page without one (an error page) still gets the box, floating.
    if (wait && placed !== 'floating' && ++tries <= 20) return;
    if (placed !== 'floating' || bar.parentNode !== document.body) { reset('floating'); floating(); }
  }

  // Phones (2026-11-06): the block strip opens with the newest mined block off-screen. Bring it into view once on the
  // pages that open at the tip. Never once the visitor has touched this page, and not on a block's page, which centres on that block.
  var stripKey = '', stripDone = false, touched = false;
  function placeStrip() {
    var key = location.pathname + '|' + window.innerWidth;
    if (key !== stripKey) { stripKey = key; stripDone = false; touched = false; }
    if (window.innerWidth >= 768 || touched || stripDone) return;
    if (!/^\/(?:[a-z]{2}(?:-[A-Z]{2})?(?:\/|$))?(?:mining\/?)?$/.test(location.pathname)) return;
    var strip = document.querySelector('#blockchain-container'), line = document.querySelector('#divider');
    var mined = document.querySelector('app-blockchain-blocks .bitcoin-block[id^="bitcoin-block-"]');
    if (!strip || !line || !mined) return;
    strip.scrollLeft += line.getBoundingClientRect().left - window.innerWidth * 0.4;
    stripDone = true;
  }

  if (brand && wide) {
    inline(brand, '0 auto');   // 11-07 (operator): in the middle of the header, between logo and network controls
  } else if (!onFork) {
    window.addEventListener('touchstart', function () { touched = true; }, { passive: true });
    var tick = function () { placeExplorer(); placeStrip(); };
    tick();
    setInterval(tick, 500);
    window.addEventListener('resize', tick);
  } else if (brand) {
    // header, right of the logo. Styled by .fw-compact + .fw-fork in fw-theme.css.
    bar.style.cssText = '';
    bar.className = 'fw-compact fw-fork';
    brand.parentNode.insertBefore(bar, brand.nextSibling);
  } else {
    floating();
  }

  // Skins (2026-11-05): the pool site's five, in place of the stock three. The page's head script applies the stored
  // one before first paint; the list is fixed here, so a stored or linked value cannot add a name to the page.
  var SKINS = [['default', 'Default'], ['retro', 'Retro'], ['scifi', 'Sci-Fi'], ['matrix', 'Matrix'], ['black-rose', 'Black Rose']];
  function skinNow() { return document.documentElement.getAttribute('data-ecx-skin') || 'default'; }
  function setSkin(id) {
    if (id === 'default') document.documentElement.removeAttribute('data-ecx-skin');
    else document.documentElement.setAttribute('data-ecx-skin', id);
    try { localStorage.setItem('ecx-explorer-skin', id); } catch (e) { /* the choice just lasts until reload */ }
  }
  // The app draws the footer twice (desktop and phone), so each stock list gets its own picker.
  function placeSkinPicker() {
    document.querySelectorAll('select').forEach(function (stock) {
      var isStock = false;
      for (var i = 0; i < stock.options.length; i++) if (stock.options[i].textContent.trim() === 'wiz') isStock = true;
      if (!isStock || stock.getAttribute('data-ecx-replaced')) return;
      stock.setAttribute('data-ecx-replaced', '1');
      var pick = document.createElement('select');
      pick.className = stock.className + ' ecx-skin-select';
      pick.setAttribute('aria-label', 'Skin');
      SKINS.forEach(function (s) {
        var o = document.createElement('option');
        o.value = s[0]; o.textContent = s[1];
        pick.appendChild(o);
      });
      pick.value = skinNow();
      pick.onchange = function () {
        setSkin(pick.value);
        document.querySelectorAll('.ecx-skin-select').forEach(function (p) { p.value = pick.value; });
      };
      stock.style.display = 'none';
      stock.parentNode.insertBefore(pick, stock.nextSibling);
    });
  }
  if (!onFork) { placeSkinPicker(); setInterval(placeSkinPicker, 1000); }

  function num(x) { return typeof x === 'number' && isFinite(x); }
  function money(v) {
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: v >= 1 ? 2 : 4,
                                              maximumFractionDigits: v >= 1 ? 2 : 4 });
  }

  // The average of wECX on Jupiter and native ECX on Neoxa: the API's ecxAvg, the number the pool site's "≈ $"
  // lines and this explorer's USD values use. Falls back to wECX alone (2026-11-05).
  function fresh(p, now) { return p && num(p.usd) && p.usd > 0 && num(p.at) && now - p.at <= 600 && p.at <= now + 60; }
  function pick(d, now) {
    var w = d && d.ecx, n = d && d.ecxNeoxa, a = d && d.ecxAvg;
    var wecx = fresh(w, now) ? { usd: w.usd, at: w.at, change24h: w.change24h, avg: false } : null;
    if (!fresh(a, now) || a.n !== 2 || a.neoxaDropped || !fresh(w, now) || !fresh(n, now)) return wecx;
    var r = { usd: a.usd, at: a.at, avg: true };
    // Change of the average: both prices a day ago, from each one's own change.
    if (num(w.change24h) && num(n.change24h) && w.change24h > -100 && n.change24h > -100) {
      var was = (w.usd / (1 + w.change24h / 100) + n.usd / (1 + n.change24h / 100)) / 2;
      r.change24h = ((w.usd + n.usd) / 2 / was - 1) * 100;
    }
    return r;
  }

  function show(d) {
    // same freshness rule as the pool site: older than 10 min = no price at all
    var now = Date.now() / 1000;
    var e = pick(d, now);
    if (!e) {
      price.style.display = 'none';
      sep.style.display = 'none';           // no "|" in front of the link when there is no price
      bar.setAttribute('data-noprice', '');  // 11-08: the phone CSS forces .fw-sep on; an attribute survives reset()'s className
      return;
    }
    price.textContent = '';
    var unit = el('span', 'opacity:.75;color:#e6e8f0', 'ECX ');
    unit.className = 'fw-long';
    price.appendChild(unit);
    price.appendChild(el('span', 'font-weight:600;color:#e6e8f0', money(e.usd)));
    if (num(e.change24h)) {
      var up = e.change24h >= 0;
      var change = el('span', 'margin-left:6px;color:' + (up ? '#3fd47c' : '#ff6b6b'),
        (up ? '▲' : '▼') + Math.abs(e.change24h).toFixed(1) + '%');
      change.appendChild(part('fw-long', ' 24h'));
      price.appendChild(change);
    }
    price.title = (e.avg ? 'Average of wECX on Jupiter and ECX on Neoxa' : 'wECX on Jupiter') +
      '. Opens the wECX token page. Price via ecpool.tech, updated ' +
      new Date(e.at * 1000).toLocaleTimeString();
    price.style.display = '';
    sep.style.display = '';
    bar.removeAttribute('data-noprice');
  }

  function load() {
    if (document.hidden) return;
    fetch('/fw-market.json', { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(show)
      .catch(function () { show(null); });
  }
  load();
  setInterval(load, 60000);
  document.addEventListener('visibilitychange', load);
})();
