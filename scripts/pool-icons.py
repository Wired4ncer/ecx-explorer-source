#!/usr/bin/env python3
"""Stand-in icons for ECX pools with no logo of their own, and a nicer default (2026-11-06).

Own drawings, made from each pool's name, not the pools' marks. When a pool publishes a real logo: delete its line here
FIRST (a re-run would overwrite the logo), then replace assets/logos/<slug>.svg with it (deleting the line alone leaves
the old stand-in file in place). Same shape throughout: coloured round badge, white glyph,
so they read as a set at the 20-25 px the explorer shows them, and do not pass as a pool's own brand.

The file name must be the pool's slug from the API (/api/v1/mining/pools/all). ec-pool's slug is `ecpool`: its icon
must never look like ours (see build-pools.py).

Usage: python3 pool-icons.py <out-dir>  (the out-dir is assets/logos; then run build-www.py)
"""
import sys
from pathlib import Path

W = 'fill="#fff"'
S = 'fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"'


def mono(text, size=24):
    """Letters as shapes would need a font file; an <img> SVG falls back to the system sans, good enough at this size."""
    return (f'<text x="32" y="{32 + size * 0.36:.1f}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" '
            f'font-weight="700" font-size="{size}" fill="#fff">{text}</text>')


# slug: (colour top, colour bottom, glyph on a 64 x 64 canvas)
ICONS = {
    # eu + hash: a ring of stars would copy the EU flag, so a hash sign in a ring of dots
    "euhashme": ("#2f6fed", "#173a8c",
                 f'<g {S}><path d="M27 21l-3 22M40 21l-3 22M20 28h25M19 36h25"/></g>'
                 + "".join(f'<circle cx="{x}" cy="{y}" r="2" {W}/>' for x, y in
                           [(32, 9), (48, 15), (55, 32), (48, 49), (32, 55), (16, 49), (9, 32), (16, 15)])),
    # sky + doge: a dog's head on a cloud
    "skydogenet": ("#38bdf8", "#0369a1",
                   f'<path {W} d="M19 53a8 8 0 0 1-1-16h28a8 8 0 0 1 1 16z"/>'
                   f'<rect x="21" y="13" width="22" height="26" rx="10" {W}/>'
                   '<ellipse cx="18.500" cy="24" rx="5" ry="10" transform="rotate(14 18.500 24)" fill="#fff" stroke="#0369a1" stroke-width="2"/>'
                   '<ellipse cx="45.500" cy="24" rx="5" ry="10" transform="rotate(-14 45.500 24)" fill="#fff" stroke="#0369a1" stroke-width="2"/>'
                   '<circle cx="27" cy="23" r="2" fill="#0369a1"/><circle cx="37" cy="23" r="2" fill="#0369a1"/>'
                   '<ellipse cx="32" cy="30" rx="3.500" ry="2.600" fill="#0369a1"/>'),
    # a speech bubble holding a clock
    "talkingtoyoufromthefuture": ("#a855f7", "#5b21b6",
                                  f'<path {W} d="M16 14h32a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H30l-10 9v-9h-4a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z"/>'
                                  '<circle cx="32" cy="29" r="10" fill="none" stroke="#5b21b6" stroke-width="3"/>'
                                  '<path d="M32 23v6l5 3" fill="none" stroke="#5b21b6" stroke-width="3" stroke-linecap="round"/>'),
    # solo: one miner, one target, three different ones so the solo pools stay apart
    "ecxsolopool": ("#14b8a6", "#0f5f58",
                    f'<g {S}><circle cx="32" cy="32" r="19"/><circle cx="32" cy="32" r="9"/></g><circle cx="32" cy="32" r="3" {W}/>'),
    "soloecash": ("#f43f5e", "#9f1239",
                  f'<path {W} d="M32 11l6.4 13.8 15.1 1.8-11.2 10.3 3 14.9L32 45.4 18.7 52.800l3-14.9L10.500 27.600l15.100-1.800z"/>'),
    "ecxsolo": ("#84cc16", "#3f6212", mono("1", 34)),
    # simple: a plain cube
    "simplepool": ("#64748b", "#334155",
                   f'<g {S}><path d="M32 12l18 10v20L32 52 14 42V22z"/><path d="M14 22l18 10 18-10M32 32v20"/></g>'),
    # a mole: round head, small eyes, big snout, front teeth
    "molepoolcom": ("#a16207", "#57340a",
                    f'<circle cx="32" cy="31" r="19" {W}/>'
                    '<circle cx="24" cy="26" r="2.600" fill="#57340a"/><circle cx="40" cy="26" r="2.600" fill="#57340a"/>'
                    '<ellipse cx="32" cy="35" rx="8" ry="6" fill="#57340a"/><circle cx="32" cy="32.500" r="2.400" fill="#fff"/>'
                    f'<path {W} d="M28 48h3.300v6h-3.300zM32.700 48h3.300v6h-3.300z"/>'),
    # ec-pool: letters only. No hexagon, no orange, so it cannot pass for eCPool.tech
    "ecpool": ("#06b6d4", "#155e75", mono("EC", 25)),
    # a sprout
    "nurserypool": ("#22c55e", "#166534",
                    f'<path {S} d="M32 52V29"/>'
                    f'<path {W} d="M32 32c-2-11-10-16-20-15 0 11 8 17 20 15zM32 39c1-9 8-14 19-14 0 11-8 16-19 14z"/>'),
    "lapimpa": ("#ec4899", "#9d174d", mono("LP", 25)),
    # kikko = a tortoise-shell pattern in Japanese: one large hexagon with six around its edge
    "kikkoecash": ("#10b981", "#065f46",
                   f'<g {S}><path d="M32 22l9 5.200v10.400L32 42.800l-9-5.200V27.200z"/>'
                   '<path d="M32 22V11M41 27.200l10-5.700M41 37.600l10 5.700M32 42.800V53M23 37.600l-10 5.700M23 27.200l-10-5.700"/>'
                   '<path d="M32 11l19 10.500v21L32 53 13 42.500v-21z"/></g>'),
    # a vault door with a wheel
    "vaultnet": ("#94a3b8", "#334155",
                 f'<g {S}><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="6.500"/>'
                 '<path d="M32 25.500V17M32 38.500V47M25.500 32H17M38.500 32H47"/></g>'),
    # farm: a barn
    "nanacossolominingfarm": ("#ef4444", "#7f1d1d",
                              f'<path {W} d="M12 28l9-12h22l9 12v24H12z"/>'
                              '<path d="M25 52V36h14v16M25 36l14 16M39 36L25 52" fill="none" stroke="#7f1d1d" stroke-width="3"/>'
                              '<rect x="27" y="22" width="10" height="7" fill="#7f1d1d"/>'),
    # a pool of water, by its name
    "ecashpoolio": ("#3b82f6", "#1e3a8a",
                    f'<g {S}><path d="M11 26c5-6 9-6 14 0s9 6 14 0 9-6 14 0"/><path d="M11 38c5-6 9-6 14 0s9 6 14 0 9-6 14 0"/></g>'),
    # segments of a ring
    "segpool": ("#f59e0b", "#92400e",
                '<g fill="none" stroke="#fff" stroke-width="8">'
                '<path d="M35 13.300a19 19 0 0 1 15.700 15.700M50.700 35a19 19 0 0 1-15.700 15.700M29 50.700A19 19 0 0 1 13.300 35M13.300 29A19 19 0 0 1 29 13.300"/></g>'),
    # beta tests: a flask
    "betatests123": ("#6366f1", "#312e81",
                     f'<g {S}><path d="M25 11h14M28 11v15L15 49a3 3 0 0 0 3 4h28a3 3 0 0 0 3-4L36 26V11"/></g>'
                     f'<path {W} d="M21.500 42h21l4 8.500h-29z"/>'),
    "bcmecxpplns": ("#0ea5e9", "#0c4a6e", mono("BCM", 18)),
    # a world, with the szat's z on it
    "szatsworld": ("#8b5cf6", "#4c1d95",
                   f'<g {S}><circle cx="32" cy="32" r="21"/><path d="M11 32h5M48 32h5"/></g>' + mono("z", 30)),
}

# Default for any pool without an icon, in place of stock's pickaxe, which looks too much like the one in our logo.
# A neutral grey block with facets: a block of ore. No colour, so a real icon always stands out from it.
DEFAULT = ("#6b7280", "#374151",
           f'<g {S}><path d="M32 12l18 11-5 20-13 9-13-9-5-20z"/>'
           '<path d="M14 23l18 6 18-6M32 29v23M19 43l13-14 13 14"/></g>')


def badge(slug, top, bottom, glyph):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
            f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/>'
            f'<stop offset="1" stop-color="{bottom}"/></linearGradient></defs>'
            f'<circle cx="32" cy="32" r="31" fill="url(#g)"/>{glyph}</svg>\n')


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for slug, (top, bottom, glyph) in ICONS.items():
        (out / f"{slug}.svg").write_text(badge(slug, top, bottom, glyph))
    for name in ("default", "default.light"):
        (out / f"{name}.svg").write_text(badge(name, *DEFAULT))
    print(f"{len(ICONS)} pool icons + default written to {out}")


if __name__ == "__main__":
    main()
