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
        document.title = document.title.replace('fork-observer', 'ECX Fork Watch');
    };
    fixTitle();
    var t = document.querySelector('title');
    if (t && window.MutationObserver) new MutationObserver(fixTitle).observe(t, { childList: true });

    // every pool name in its own colour, picked from a fixed set by a hash of the name, so a pool keeps
    // its colour across reloads. The set leaves out red (invalid), orange (our pool) and bright green
    // (active tip) so a label never reads as a tip status. Our pool keeps the ecpool.tech orange.
    var PALETTE = ['#7dd3fc', '#a5b4fc', '#c4b5fd', '#f0abfc', '#fde047',
                   '#6ee7b7', '#67e8f9', '#e7d7a8', '#cbd5e1', '#93c5fd'];
    // the known ECX pools (pool list 3001-3108) each get their own colour — they are the ones that
    // matter after the fork; Bitcoin pools share the hashed colours (collisions there are fine)
    var ECX_POOLS = { 'FreeBank': '#fde047', 'bip300.xyz': '#7dd3fc', 'ePool': '#c4b5fd',
                      'Pow.re': '#6ee7b7', 'guilastuce': '#f0abfc', 'kikko-ecash': '#67e8f9',
                      'complicatedpool': '#e7d7a8', 'avonpool': '#a5b4fc', 'eCashPool': '#93c5fd' };
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
    // digits only, e.g. "Foundry USA" -> foundryusa.svg); a pool without a logo just has no icon
    var LOGO_BASE = 'https://mempool.ecpool.tech/resources/mining-pools/';
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
        img.addEventListener('error', function () { this.style.display = 'none'; });
        g.appendChild(img);
      }
      if (img.getAttribute('href') !== href) {
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
        var name = fullName(label);
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

  if (window.top !== window) return;   // not inside embeds/iframes
  if (document.getElementById('fw-bar')) return;

  var onFork = location.hostname.indexOf('fork.') === 0;
  var other = onFork
    ? { href: 'https://mempool.ecpool.tech/', text: 'Explorer' }
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
    'border-radius:12px;background:rgba(23,22,21,.95);color:#e6e8f0;border:1px solid #8a5514;' +
    'box-shadow:0 4px 18px rgba(0,0,0,.35);font:13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif');
  bar.id = 'fw-bar';

  // pool button in ecpool.tech's default theme colours (--accent-2 → --accent, text --on-accent)
  var pool = link('https://ecpool.tech/', '⛏ Mine ECX at eCPool.tech',
    'color:#1a1000;background:linear-gradient(180deg,#ffb347,#f7941d);padding:4px 11px;' +
    'border-radius:999px;font-weight:700;white-space:nowrap;box-shadow:0 0 0 1px rgba(255,179,71,.35),0 2px 10px rgba(247,148,29,.45)');
  // the price links to wECX on Jupiter, same link as the pool site (EarnEstimate.tsx). The mint is fixed
  // can never point people at another token.
  var WECX_MINT = '6ombVv3YMs9qpx1QkycD9XW8HKSfv7vGrCFX3cxCYMVY';
  var price = link('https://jup.ag/tokens/' + WECX_MINT, '', 'display:none;white-space:nowrap;color:#e6e8f0;font-weight:400');
  var sep = el('span', 'opacity:.35;color:#e6e8f0', '|');
  var swap = link(other.href, other.text + ' ↗', 'font-weight:500');

  // pool button on top, price | other page below; one row in the fork header
  var row2 = el('div', 'display:flex;align-items:center;gap:10px');
  row2.appendChild(price); row2.appendChild(sep); row2.appendChild(swap);
  bar.appendChild(pool); bar.appendChild(row2);
  // fork page on a wide screen (≥1200 px: title + pill with price + network controls fit): sit in
  // the header right after the "ECX Fork Watch" title
  // (the navbar is flex with space-between; margin-right:auto keeps the network controls on the right).
  // Explorer on a wide screen (2026-11-05): one line in the top bar, between the menu icons and the search box.
  // Smaller screens have no room, so it floats. Angular draws the bar after this script starts, so wait for it.
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
  if (brand && wide) {
    inline(brand, '0 auto 0 18px');
  } else if (!onFork && window.matchMedia && matchMedia('(min-width: 1380px)').matches) {   // under this the search button is cut off
    var tries = 0;
    (function wait() {
      var menu = document.querySelector('#navbarCollapse .navbar-nav');
      if (menu) {
        inline(menu, '0 12px');
        // The banner must stay: if the app redraws its top bar, put it back.
        setInterval(function () {
          var m = document.querySelector('#navbarCollapse .navbar-nav');
          if (m && !document.contains(bar)) inline(m, '0 12px');
        }, 2000);
        return;
      }
      if (++tries > 50) { floating(); return; }
      setTimeout(wait, 200);
    })();
  } else {
    floating();
  }

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
      return;
    }
    price.textContent = '';
    price.appendChild(el('span', 'opacity:.75;color:#e6e8f0', 'ECX '));
    price.appendChild(el('span', 'font-weight:600;color:#e6e8f0', money(e.usd)));
    if (num(e.change24h)) {
      var up = e.change24h >= 0;
      price.appendChild(el('span', 'margin-left:6px;color:' + (up ? '#3fd47c' : '#ff6b6b'),
        (up ? '▲' : '▼') + Math.abs(e.change24h).toFixed(1) + '% 24h'));
    }
    price.title = (e.avg ? 'Average of wECX on Jupiter and ECX on Neoxa' : 'wECX on Jupiter') +
      '. Opens the wECX token page. Price via ecpool.tech, updated ' +
      new Date(e.at * 1000).toLocaleTimeString();
    price.style.display = '';
    sep.style.display = '';
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
