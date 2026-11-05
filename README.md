# ECX explorer source

Source for the modified block explorer at explorer.ecpool.tech, an explorer for the eCash (ECX) mainnet.

It is derived from the source code for mempool.space and is not affiliated with or endorsed by The Mempool Open Source
Project. Licensed under the GNU AGPL v3 or later: see `LICENSE` and `COPYING`. The license does not cover the project's
trademarks; the project's logos and marks were removed from what this site shows, as far as is listed below.

## What is modified

The site runs these unmodified, pinned images with the changes below applied on top:

- backend: `docker.io/mempool/backend@sha256:c358a20591285f77fb11e6f2502441e6b15bc7dd8282433e09bfd948b8ab0aa8`
- frontend: `docker.io/mempool/frontend@sha256:83c5d1e20cd4fad358584f5921ca547d69ab80162d0e2f3138c2d142a91dbadd`

| Path | What it is |
|---|---|
| `patches/backend/` | Every changed backend file, as a diff against the image: ECX difficulty rule and price, kernel version hidden, websocket rate limit |
| `scripts/build-api.py` | Writes those patched files from the image |
| `scripts/build-www.py` | Patches the frontend tree: ECX name and icons, ECX units, pool list, link previews, marks and logo files removed |
| `web/guard.conf` | The read-only nginx in front of the site: GET and HEAD only, adds the two files below |
| `web/fw-bar.js`, `web/fw-mempool.css` | The price bar and the ECX look |
| `pools/` | ECX mining pool list |

Pool logos are copied into the frontend by `build-www.py`. They belong to their pools.

## What stays from upstream

The minified frontend bundles still hold upstream's own texts: the docs, FAQ, and the about and policy pages, which this
site does not link to. The upstream source is at https://github.com/mempool/mempool.
