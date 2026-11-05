#!/usr/bin/env python3
"""Build the patched mempool frontend tree for the ECX mainnet explorer.

Replaces the hand patch of 2026-09-18 (betanet). Reads the stock tree copied out of the
frontend image, writes a patched copy that compose.yml mounts read-only:
  - title "eCash Mainnet Explorer" in every locale's index.html AND in the JS bundle
    (the app sets document.title at runtime, so an index-only patch is overwritten);
  - main bundle renamed main.ecx-mainnet-<REV>.js and icons served from /resources/favicons-ecx/,
  - navbar wordmark: hide mempool's inline SVG, show our icon + "eCash Mainnet";
  - ECX pool list + logos under /resources/ecx/ and /resources/mining-pools/.

  python3 build-www.py <stock-dir> <out-dir> <favicons-dir> <pools-v2.json> <logos-dir> [REV]
Bump REV after any change a viewer must see at once (new bundle name = edge fetches fresh).
"""
import hashlib, json, re, shutil, sys
from pathlib import Path

stock, out, favs, pools, logos = map(Path, sys.argv[1:6])
rev = sys.argv[6] if len(sys.argv) > 6 else "1"
NAME = "eCash Mainnet"
TITLE = f"{NAME} Explorer"
BUNDLE = f"main.ecx-mainnet-{rev}.js"
HOST = "explorer.ecpool.tech"
PREVIEW = f"https://{HOST}/resources/favicons-ecx/android-chrome-512x512.png"
DESC = "Explorer for the eCash (ECX) mainnet: blocks, transactions, fees and mining pools."

STYLE = f"""<style id="ecx-brand">
/* ECX mainnet branding: hide mempool's inline wordmark, show our icon + name (2026-10-27) */
.navbar-brand app-svg-images.mempool-logo svg, .navbar-brand app-svg-images[name="officialMempoolSpace"] svg {{ display:none !important; }}
.navbar-brand app-svg-images.mempool-logo, .navbar-brand app-svg-images[name="officialMempoolSpace"] {{ display:inline-flex !important; align-items:center; gap:.45rem; width:auto !important; height:36px !important; }}
.navbar-brand app-svg-images.mempool-logo::before, .navbar-brand app-svg-images[name="officialMempoolSpace"]::before {{ content:""; width:28px; height:28px; border-radius:6px; background:url(/resources/favicons-ecx/favicon-32x32.png) center/contain no-repeat; }}
.navbar-brand app-svg-images.mempool-logo::after, .navbar-brand app-svg-images[name="officialMempoolSpace"]::after {{ content:"{NAME}"; font-weight:700; font-size:1.25rem; color:#fff; white-space:nowrap; }}
</style>"""

NOTE = """<style id="ecx-note-style">#ecx-note{position:fixed;left:12px;bottom:12px;z-index:2147482000;max-width:calc(100vw - 24px);
padding:4px 10px;border-radius:6px;background:rgba(0,0,0,.72);color:#fff;font:12px/1.4 sans-serif;pointer-events:none}
@media (max-width:767px){#ecx-note{top:112px;bottom:auto}}</style><div id="ecx-note">Address search is coming soon. <a href="https://github.com/Wired4ncer/ecx-explorer-source" style="color:#d9a066;pointer-events:auto" rel="noopener">Source code</a></div>"""

# The AGPL's source offer and the Mempool trademark policy's attribution, at the end of every page (2026-11-05).
SOURCE_URL = "https://github.com/Wired4ncer/ecx-explorer-source"
LEGAL = f"""<div id="ecx-legal" style="display:none;padding:12px 16px 72px;text-align:center;font:12px/1.5 sans-serif;color:#9aa1ad;background:#0d0d0d">
This site runs modified software derived from the source code for mempool.space (AGPL-3.0). It is not affiliated with or
endorsed by The Mempool Open Source Project. <a href="{SOURCE_URL}" style="color:#d9a066" rel="noopener">Source code and our changes</a>.</div>
<script>(function(){{var l=document.getElementById('ecx-legal');function p(){{var f=document.querySelector('app-global-footer footer');
if(f&&l.parentNode!==f){{f.appendChild(l);l.style.display='block'}}}}new MutationObserver(p).observe(document.body,{{childList:true,subtree:true}});p()}})();</script>"""
# Trademark policy: modified software must not carry the project's logos, and their pages are not this site's.
HIDE = """<style id="ecx-marks">#btn-about,.social-links,[class*="explore-tagline"],app-global-footer app-svg-images[name="mempoolSpace"],
a[href$="/about"],a[href$="/terms-of-service"],a[href$="/privacy-policy"],a[href$="/trademark-policy"],a[href$="host-my-own-instance-raspberry-pi"]{display:none !important}</style>"""
SEARCH_PLACEHOLDER = "Search blocks and transactions"
SEARCH_RE = re.compile(r'n="[^"]*",_="([^"]*)",\[\["searchInput",""\]')
GOGGLES_RE = re.compile(r'Mempool Goggles(?:\\u2122|\u2122)?')

# Exact stock strings; the script stops if one is missing so a new image cannot be half-patched.
JS_SUBS = [
    ('this.baseTitle="mempool"', f'this.baseTitle="{TITLE}"'),
    ('this.baseTitle+" - "+(this.network?this.ucfirst(this.network):"Bitcoin")+" Explorer"', 'this.baseTitle'),
    # Link previews and the canonical address (2026-11-05, before going public).
    ('this.baseDomain="mempool.space"', f'this.baseDomain="{HOST}"'),
    ('"https://mempool.space/resources/previews/mempool-space-preview.jpg"', f'"{PREVIEW}"'),
]
JS_DESC = re.compile(r'this\.baseDescription="[^"]*"')
# Exact stock tags in each locale's index.html: (old, new). New "" removes the tag.
META_SUBS = [
    ('<meta name="description" content="Explore the full Bitcoin ecosystem with The Mempool Open Source Project®. See the real-time status of your transactions, get network info, and more."/>',
     f'<meta name="description" content="{DESC}"/>'),
    ('<meta property="og:image" content="https://mempool.space/resources/previews/mempool-space-preview.jpg"/>',
     f'<meta property="og:image" content="{PREVIEW}"/>'),
    ('<meta property="og:image:width" content="2000"/>', '<meta property="og:image:width" content="512"/>'),
    ('<meta property="og:image:height" content="1000"/>', '<meta property="og:image:height" content="512"/>'),
    ('<meta property="og:description" content="Explore the full Bitcoin ecosystem with The Mempool Open Source Project®. See the real-time status of your transactions, get network info, and more."/>',
     f'<meta property="og:description" content="{DESC}"/>'),
    ('<meta name="twitter:card" content="summary_large_image">', '<meta name="twitter:card" content="summary">'),
    ('<meta name="twitter:site" content="@mempool">', ''),
    ('<meta name="twitter:creator" content="@mempool">', ''),
    ('<meta name="twitter:title" content="The Mempool Open Source Project®">', f'<meta name="twitter:title" content="{TITLE}">'),
    ('<meta name="twitter:description" content="Explore the full Bitcoin ecosystem with The Mempool Open Source Project®. See the real-time status of your transactions, get network info, and more."/>',
     f'<meta name="twitter:description" content="{DESC}"/>'),
    ('<meta name="twitter:image" content="https://mempool.space/resources/previews/mempool-space-preview.jpg"/>',
     f'<meta name="twitter:image" content="{PREVIEW}"/>'),
    ('<meta name="twitter:domain" content="mempool.space">', f'<meta name="twitter:domain" content="{HOST}">'),
    ('<link id="canonical" rel="canonical" href="https://mempool.space">', f'<link id="canonical" rel="canonical" href="https://{HOST}">'),
]

# ECX difficulty rule (2026-10-30): 288-block epochs from 973,728 (heights divisible by 288), not Bitcoin's 2016.
# The difficulty widget's epoch grid is 9 rows x (epoch / 9) columns -> 32 columns, viewBox 32 wide. The backend's
# estimate is patched by build-api.py. The chunk and the runtime that names it get new file names (edge cache).
DAA_CHUNK = "930.741470c5fc0f39d4.js"
DAA_SUBS = [
    ("d=2016*Math.floor(this.stateService.latestBlockHeight/2016)", "d=288*Math.floor(this.stateService.latestBlockHeight/288)"),
    ("this.expectedIndex=Math.min(this.expectedHeight-this.epochStart,2016)-1", "this.expectedIndex=Math.min(this.expectedHeight-this.epochStart,288)-1"),
    ("this.currentIndex<2015&&", "this.currentIndex<287&&"),
    (',2105,"remaining",!1)', ',287,"remaining",!1)'),
    ("i.remainingBlocks>1870?", "i.remainingBlocks>267?"),
    ('"viewBox","0 0 224 9"', '"viewBox","0 0 32 9"'),
]

# Empty `out` but KEEP the directory itself: the running web container bind-mounts it, and a
# deleted-and-recreated directory leaves the container serving an empty tree -> 403 on every
out.mkdir(exist_ok=True)
for child in out.iterdir():
    shutil.rmtree(child) if child.is_dir() and not child.is_symlink() else child.unlink()
shutil.copytree(stock, out, dirs_exist_ok=True)

locales = 0
for idx in sorted(out.glob("*/index.html")):
    d = idx.parent
    html = idx.read_text()
    m = re.findall(r'main\.[0-9a-f]+\.js', html)
    if len(set(m)) != 1:
        sys.exit(f"{idx}: expected one main bundle, found {set(m)}")
    old = m[0]
    js = (d / old).read_text()
    for a, b in JS_SUBS:
        if js.count(a) != 1:
            sys.exit(f"{d / old}: stock string found {js.count(a)}x, expected 1: {a}")
        js = js.replace(a, b)
    js, n = JS_DESC.subn(f'this.baseDescription="{DESC}"', js)
    if n != 1:
        sys.exit(f"{d / old}: {n} baseDescription strings")
    (d / BUNDLE).write_text(js)
    (d / old).unlink()
    html = html.replace(old, BUNDLE)
    # ECX difficulty chunk + the runtime that maps chunk 930 to its file name
    ch = (d / DAA_CHUNK).read_text()
    for a, b in DAA_SUBS:
        if ch.count(a) != 1:
            sys.exit(f"{d / DAA_CHUNK}: stock string found {ch.count(a)}x, expected 1: {a}")
        ch = ch.replace(a, b)
    daa_id = f"ecxdaa{rev}"
    (d / f"930.{daa_id}.js").write_text(ch)
    (d / DAA_CHUNK).unlink()
    rt = re.findall(r'runtime\.[0-9a-f]+\.js', html)
    if len(set(rt)) != 1:
        sys.exit(f"{idx}: expected one runtime, found {set(rt)}")
    rjs = (d / rt[0]).read_text()
    key = '930:"' + DAA_CHUNK.split(".")[1] + '"'
    if rjs.count(key) != 1:
        sys.exit(f"{d / rt[0]}: chunk map entry found {rjs.count(key)}x: {key}")
    new_rt = f"runtime.ecx-mainnet-{rev}.js"
    (d / new_rt).write_text(rjs.replace(key, f'930:"{daa_id}"'))
    (d / rt[0]).unlink()
    html = html.replace(rt[0], new_rt)
    html, n = re.subn(r'<title>[^<]*</title>', f'<title>{TITLE}</title>', html)
    if n != 1:
        sys.exit(f"{idx}: {n} <title> tags")
    html = html.replace("/resources/favicons/", "/resources/favicons-ecx/")
    for a, b in META_SUBS:
        if html.count(a) != 1:
            sys.exit(f"{idx}: stock tag found {html.count(a)}x, expected 1: {a[:70]}")
        html = html.replace(a, b)
    html = html.replace("</head>", STYLE + HIDE + "</head>", 1)
    if html.count("</body>") != 1:
        sys.exit(f"{idx}: expected one </body>")
    html = html.replace("</body>", LEGAL + NOTE + "</body>")
    idx.write_text(html)
    locales += 1

# tooltips, the "BTC/block" tile, halving texts. Only the bare token: not LBTC / ViaBTC / BTC.com / BTCPay /
# BTC_LightningLike / addresses.BTC / formatBTC, not an unquoted object key (BTC:), not the RPC docs' "BTC/kB".
# (A quoted "BTC": key in the API-docs example text IS changed - display text only.)
# No code compares a value with "BTC" (checked in the stock tree), so this changes display text only.
UNIT = re.compile(r'(?<![A-Za-z0-9_.$])BTC(?![A-Za-z0-9_:]|\.com|/kB)')
units = 0
for js in sorted(out.glob("*/*.js")):
    if js.parent.name == "resources":
        continue
    s, n = UNIT.subn("ECX", js.read_text())
    if n:
        js.write_text(s)
        units += n
if not units:
    sys.exit("no BTC unit strings found - stock tree changed?")

# Trademark marks in the text people see. The project's own policy and about pages stay untouched and are not linked.
for loc in sorted(p for p in out.iterdir() if (p / "index.html").exists()):
    found_search = found_goggles = 0
    for js in loc.glob("*.js"):
        s = js.read_text()
        if "Trademark Policy and Guidelines" in s:
            continue
        s, a = SEARCH_RE.subn(lambda m: f'n="{SEARCH_PLACEHOLDER}",_="{m.group(1)}",[["searchInput",""]', s)
        s, b = GOGGLES_RE.subn("Transaction filters", s)
        if a or b:
            js.write_text(s)
        found_search += a
        found_goggles += b
    if not found_search or not found_goggles:
        sys.exit(f"{loc}: search {found_search}, goggles {found_goggles}: stock changed?")

res = out / "resources"
# Remove the project's logo files, as its trademark policy asks of modified versions.
removed = 0
for pat in ("mempool-*", "promo-video/mempool-promo.*", "previews/mempool-space-preview.*", "favicons/*"):
    for f in res.glob(pat):
        f.unlink()
        removed += 1
if not removed:
    sys.exit("no logo files found - stock tree changed?")
# Frontend switches. The image's entrypoint cannot rewrite config.js (the tree is mounted read-only),
# so they are set here. No historical price: the backend (build-api.py, 11-03) now feeds the live ECX price,
# but has no ECX price history (stock would show Bitcoin's). No accelerator button:
# it sends viewers to mempool.space's paid Bitcoin service.
cfg = res / "config.js"
c = cfg.read_text()
for a, b in [("window.__env.HISTORICAL_PRICE = true;", "window.__env.HISTORICAL_PRICE = false;"),
             ("window.__env.ACCELERATOR_BUTTON = true;", "window.__env.ACCELERATOR_BUTTON = false;")]:
    if c.count(a) != 1:
        sys.exit(f"{cfg}: stock string found {c.count(a)}x, expected 1: {a}")
    c = c.replace(a, b)
cfg.write_text(c)
shutil.copytree(favs, res / "favicons-ecx")
# The icons' app name, shown when someone installs the page as an app.
mf = res / "favicons-ecx/site.webmanifest"
m = json.loads(mf.read_text())
m["name"], m["short_name"] = TITLE, "ECX Explorer"
mf.write_text(json.dumps(m, indent=2))
for f in logos.iterdir():
    if f.suffix in (".svg", ".png"):
        shutil.copy2(f, res / "mining-pools" / f.name)

# Pool list served to the backend (MEMPOOL_POOLS_JSON_URL); tree.json carries a sha so the
# backend re-imports when the list changes.
ecx = res / "ecx"
ecx.mkdir()
data = pools.read_bytes()
json.loads(data)
(ecx / "pools-v2.json").write_bytes(data)
sha = hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()
(ecx / "tree.json").write_text(json.dumps(
    {"sha": sha, "tree": [{"path": "pools-v2.json", "type": "blob", "sha": sha}]}, indent=2))

print(f"patched {locales} locales, bundle {BUNDLE}, {units} BTC->ECX units, pool list sha {sha[:12]}")
