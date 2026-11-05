#!/usr/bin/env python3
"""Patch the mempool backend for ECX's difficulty rule.

ECX since v1.1.0 (ecash-com/bitcoin src/pow.cpp, read at master c8474e0): from height 973,728 the difficulty
changes every 288 blocks (heights divisible by 288), target timespan 288 x 600 s, measured timespan clamped to
1/4..4x, and new target = old x (6T + measured) / 7T. So one adjustment moves difficulty by at most +12 % / -30 %.
Stock mempool assumes Bitcoin: 2016-block epochs, change = 600 / avg - 1 clamped to +300 / -75 %, and a 504-block
sliding window ("quarter epoch") for the first quarter of an epoch — with 288-block epochs that window would
always be used, so it is switched off.

Reads the stock files out of the backend IMAGE (pinned by digest in compose.yml), writes patched copies
that compose.yml mounts read-only over the originals:
  python3 build-api.py <image> <out-dir>
The script stops if a stock string is missing, so a new image cannot be half-patched. Restart the api
The adjustment history (mining.js $indexDifficultyAdjustments) is built from bits changes between
consecutive blocks, not from 2016, so it needs no patch: delete a wrong row from `difficulty_adjustments` and
the indexer writes it again from the chain.
"""
import subprocess, sys
from pathlib import Path

image, out = sys.argv[1], Path(sys.argv[2])
API = "/backend/package/api"

def stock(name, base=API):
    return subprocess.run(["podman", "run", "--rm", "--entrypoint", "cat", image, f"{base}/{name}"],
                          check=True, capture_output=True, text=True).stdout

def patch(name, subs, base=API):
    s = stock(name, base)
    for a, b, *n in subs:
        want = n[0] if n else 1
        if s.count(a) != want:
            sys.exit(f"{name}: stock string found {s.count(a)}x, expected {want}: {a[:80]}")
        s = s.replace(a, b)
    out.mkdir(parents=True, exist_ok=True)
    (out / name).write_text(s)
    print(f"patched {name}: {len(subs)} substitutions")

# goes out in /api/v1/init-data and the websocket's init data, so it is blanked here at the source.
patch("backend-info.js", [
    ("            osVersion: `${os_1.default.type()} ${os_1.default.release()}`,\n",
     "            osVersion: '?', // ECX: public site, do not show the kernel\n"),
])

# Same review: mempool answers every websocket message, with no limit, so a loop of {"action":"init"} (18 KB each)
# one init data per 30 s, 64 KB per message. Over the limit the message is ignored, the socket stays open.
patch("websocket-handler.js", [
    ("                    try {\n"
     "                        const parsedMessage = JSON.parse(message);\n",
     "                    try {\n"
     "                        const ecxNow = Date.now();\n"
     "                        if (message.length > 65536) {\n"
     "                            client.close();\n"
     "                            return;\n"
     "                        }\n"
     "                        client['ecxTokens'] = Math.min(20, (client['ecxTokens'] ?? 20) + (ecxNow - (client['ecxLast'] ?? ecxNow)) / 2000);\n"
     "                        client['ecxLast'] = ecxNow;\n"
     "                        if (client['ecxTokens'] < 1) {\n"
     "                            return;\n"
     "                        }\n"
     "                        client['ecxTokens'] -= 1;\n"
     "                        const parsedMessage = JSON.parse(message);\n"),
    ("                        if (parsedMessage.action === 'init') {\n",
     "                        if (parsedMessage.action === 'init' && ecxNow - (client['ecxInit'] ?? 0) >= 30000) {\n"),
    ("                            client.send(this.serializedInitData);\n",
     "                            client['ecxInit'] = ecxNow;\n"
     "                            client.send(this.serializedInitData);\n"),
])

patch("difficulty-adjustment.js", [
    ("    const EPOCH_BLOCK_LENGTH = 2016; // Bitcoin mainnet\n",
     "    const EPOCH_BLOCK_LENGTH = 288; // ECX: 288-block retarget from 973,728 (ecash v1.1.0)\n"),
    ("(blocksInEpoch === 2015 ? latestBlockTimestamp : nowSeconds)",
     "(blocksInEpoch === EPOCH_BLOCK_LENGTH - 1 ? latestBlockTimestamp : nowSeconds)"),
    # ECX: no 504-block sliding window (with 288-block epochs it would always apply)
    ("    if (quarterEpochTime && blocksInEpoch < 503) {",
     "    if (false && quarterEpochTime && blocksInEpoch < 503) { // ECX: off"),
    ("        difficultyChange = (BLOCK_SECONDS_TARGET / (actualTimespan / (blocksInEpoch + 1)) - 1) * 100;\n",
     "        // ECX: target = old * (6T + measured) / 7T, measured clamped to 1/4..4x -> +12 % / -30 % at most\n"
     "        const ecxAvg = Math.min(4 * BLOCK_SECONDS_TARGET, Math.max(BLOCK_SECONDS_TARGET / 4, actualTimespan / (blocksInEpoch + 1)));\n"
     "        difficultyChange = (7 * BLOCK_SECONDS_TARGET / (6 * BLOCK_SECONDS_TARGET + ecxAvg) - 1) * 100;\n"),
])

patch("blocks.js", [
    ("const heightDiff = blockHeightTip % 2016;", "const heightDiff = blockHeightTip % 288; // ECX"),
    ("if (blockHeightTip >= 2016) {", "if (blockHeightTip >= 288) { // ECX"),
    ("$getBlockHash(blockHeightTip - heightDiff - 2016);", "$getBlockHash(blockHeightTip - heightDiff - 288); // ECX"),
    # ECX 2026-11-01: compare a retarget block with the block BEFORE it, not with this.currentBits. Stock keeps
    # currentBits from start-up / the last retarget the live loop saw; after a restart that fast-forwarded past a
    # retarget it is one epoch stale (982,080 showed +25.3 %, real +12 %). Stock bug, rare with 2016-block epochs.
    ("if (block.height % 2016 === 0) {",
     "if (block.height % 288 === 0) { // ECX\n"
     "                const ecxPrevBits = (await bitcoin_api_factory_1.default.$getBlock(verboseBlock.previousblockhash)).bits; // ECX"),
    ("calcBitsDifference)(this.currentBits, block.bits)", "calcBitsDifference)(ecxPrevBits, block.bits)", 2),
])

# five exchanges for BITCOIN's price, so fiat was off (FIAT_PRICE_ENABLED=false) and the explorer showed no values.
# Now one feed: ecpool.tech's /api/pool/market via the guard's /fw-market.json (127.0.0.1:8082, same proxy the pill
# uses). It takes `ecxAvg` (the mean of wECX on Jupiter + native ECX on neoxa — what the pool site's "≈ $" lines use),
# falling back to `ecx` (wECX alone); a price older than 10 min counts as none (the site's rule). USD only.
# Also: 2 decimals instead of whole dollars (fine for Bitcoin, ~1 % off at ~$45), and no Bitcoin price history
# (MtGox/Kraken) is ever written into the prices table.
ECX_FEED = """        // ECX: one feed, ecpool.tech's market API through the local guard (build-api.py, 2026-11-03)
        this.feeds.push({
            name: 'ecpool.tech',
            currencies: ['USD'],
            $fetchPrice: async (currency) => {
                if (currency !== 'USD') {
                    return -1;
                }
                const r = await fetch('http://127.0.0.1:8082/fw-market.json', { signal: AbortSignal.timeout(10000) });
                if (!r.ok) {
                    return -1;
                }
                const d = await r.json();
                const now = Date.now() / 1000;
                const fresh = (e) => !!e && typeof e.usd === 'number' && isFinite(e.usd) && e.usd > 0 &&
                    typeof e.at === 'number' && now - e.at <= 600 && e.at <= now + 60;
                if (fresh(d && d.ecxAvg)) {
                    return d.ecxAvg.usd;
                }
                if (fresh(d && d.ecx)) {
                    return d.ecx.usd;
                }
                return -1;
            },
        });
"""
patch("price-updater.js", [
    ("        this.feeds.push(new bitflyer_api_1.default()); // Does not have historical endpoint\n"
     "        this.feeds.push(new kraken_api_1.default());\n"
     "        this.feeds.push(new coinbase_api_1.default());\n"
     "        this.feeds.push(new bitfinex_api_1.default());\n"
     "        this.feeds.push(new gemini_api_1.default());\n", ECX_FEED),
    ("    currencies = ['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'AUD', 'JPY'];\n",
     "    currencies = ['USD']; // ECX: USD only (the market API has no other currency)\n"),
    ("this.setLatestPrice(currency, Math.round(getMedian(prices)));",
     "this.setLatestPrice(currency, Math.round(getMedian(prices) * 100) / 100); // ECX: cents"),
    ("    async $insertHistoricalPrices() {\n",
     "    async $insertHistoricalPrices() {\n"
     "        this.historyInserted = true; // ECX: no Bitcoin price history (MtGox/Kraken) in this explorer\n"
     "        return;\n"),
    # review MED (11-03): stock keeps the last GOOD price for ever (websocket + /api/v1/prices serve latestGoodPrices),
    # so a dead or stale feed would show an old price as live. ECX: once the last good price is > 15 min old, drop it.
    ("        if (price > 0) {\n"
     "            this.latestGoodPrices[currency] = price;\n"
     "            this.latestGoodPrices.time = Math.round(new Date().getTime() / 1000);\n"
     "        }\n",
     "        if (price > 0) {\n"
     "            this.latestGoodPrices[currency] = price;\n"
     "            this.latestGoodPrices.time = Math.round(new Date().getTime() / 1000);\n"
     "        }\n"
     "        else if (Math.round(new Date().getTime() / 1000) - this.latestGoodPrices.time > 900) {\n"
     "            this.latestGoodPrices[currency] = -1; // ECX: no stale price shown as live\n"
     "        }\n"),
], base="/backend/package/tasks")
