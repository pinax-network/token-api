# Validation Run Report

- **Run ID**: `2a7e1db5-7dbe-4743-817d-4ec82133f2dd`
- **Date**: 2026-03-09 16:30 UTC
- **Duration**: 7m 14s
- **Tokens checked**: 710
- **Validator version**: v0.2.1

## Summary

| Metric | Value |
|--------|-------|
| Accuracy | 96.11% |
| Adjusted Accuracy (fresh ≤5m) | 96.03% |
| Coverage | 51.34% |
| Comparisons | 3660 |
| Matches | 1806 |
| Mismatches | 73 |
| Nulls | 1781 |
| Errors | 0 |

Accuracy and adjusted accuracy are nearly identical (0.08pp gap), indicating mismatches are not caused by indexing lag.

## Accuracy by Field

| Field | Accuracy | Coverage | Matches | Mismatches | Nulls |
|-------|----------|----------|---------|------------|-------|
| decimals | 99.60% | 41.07% | 499 | 2 | 719 |
| symbol | 96.21% | 41.07% | 482 | 19 | 719 |
| total_supply | 94.07% | 71.89% | 825 | 52 | 343 |

Low coverage on decimals/symbol is driven by Etherscan free tier limitations (see [Null Analysis](#null-analysis)).

## Accuracy by Network

| Network | Tokens | Field | Accuracy | Coverage | Mismatches |
|---------|--------|-------|----------|----------|------------|
| arbitrum-one | 74 | total_supply | 88.73% | 95.95% | 16 |
| arbitrum-one | 74 | symbol | 93.06% | 48.65% | 5 |
| arbitrum-one | 74 | decimals | 97.22% | 48.65% | 2 |
| optimism | 27 | total_supply | 88.46% | 48.15% | 3 |
| polygon | 47 | total_supply | 90.91% | 93.62% | 8 |
| polygon | 47 | symbol | 95.56% | 47.87% | 2 |
| mainnet | 258 | total_supply | 95.91% | 99.42% | 21 |
| mainnet | 258 | symbol | 96.11% | 49.81% | 10 |
| base | 96 | total_supply | 95.74% | 48.96% | 4 |
| base | 96 | symbol | 98.94% | 48.96% | 1 |
| unichain | 8 | symbol | 85.71% | 43.75% | 1 |

arbitrum-one and polygon have the lowest total_supply accuracy. bsc and avalanche have 0 comparable results (Etherscan paid-only, no Blockscout).

## Accuracy by Provider

| Provider | Comparisons | Matches | Mismatches | Nulls | Accuracy |
|----------|-------------|---------|------------|-------|----------|
| blockscout | 1530 | 1443 | 60 | 27 | 96.01% |
| etherscan | 2130 | 363 | 13 | 1754 | 96.54% |

Etherscan's high null count reflects free tier limitations. Where both providers have data, accuracy is comparable.

## Freshness Distribution

| Freshness | Comparisons | Matches | Mismatches |
|-----------|-------------|---------|------------|
| Fresh (≤5m) | 915 | 879 | 36 |
| Stale (5-30m) | 260 | 248 | 12 |
| Very stale (>30m) | 704 | 679 | 25 |

Mismatches are evenly distributed across freshness buckets — indexing lag is not a significant factor.

## Null Analysis

| Side | Field | Our Reason | Reference Reason | Count |
|------|-------|------------|------------------|-------|
| reference | decimals | — | paid_plan_required | 696 |
| reference | symbol | — | paid_plan_required | 696 |
| reference | total_supply | — | paid_plan_required | 318 |
| our | total_supply | empty | — | 8 |
| both | decimals | empty | paid_plan_required | 7 |
| both | symbol | empty | paid_plan_required | 7 |
| our | total_supply | timeout | — | 7 |
| reference | total_supply | — | rate_limited | 5 |
| our | symbol | empty | — | 5 |
| our | decimals | empty | — | 5 |

97% of nulls (1710/1781) are Etherscan `paid_plan_required` — expected without a Standard plan. Our-side nulls: 8 `empty` total_supply (Token API returned no data) and 7 `timeout` (Token API did not respond in time).

## Active Regressions

### Exact Regressions (decimals, symbol)

All 21 exact-field mismatches have been mismatching in every historical run (15/15). None are new regressions — they represent persistent data differences since the validator started tracking.

| Network | Symbol | Contract | Field | Our Value | Reference Value | Likely Cause |
|---------|--------|----------|-------|-----------|-----------------|--------------|
| arbitrum-one | EUTBL | `0xcbeb19549054cc0a6257a77736fc78c367216ce7` | decimals | `0` | `5` | Token API returns 0 decimals; contract has 5. Cascades into total_supply. |
| arbitrum-one | USTBL | `0x021289588cd81dc1ac87ea91e91607eef68303f5` | decimals | `6` | `5` | Token API returns 6 decimals; contract has 5. Cascades into total_supply. |
| arbitrum-one | EUTBL | `0xcbeb19549054cc0a6257a77736fc78c367216ce7` | symbol | `` | `EUTBL` | Token API returns empty. Contract may not be indexed. |
| arbitrum-one | USR | `0x2492d0006411af6c8bbb1c8afc1b0197350a79e9` | symbol | `` | `USR` | Token API returns empty. Contract may not be indexed. |
| arbitrum-one | USTBL | `0x021289588cd81dc1ac87ea91e91607eef68303f5` | symbol | `` | `USTBL` | Token API returns empty. Contract may not be indexed. |
| arbitrum-one | FRAX | `0x9d2f299715d94d8a7e6f5eaa8e654e8c74a988a7` | symbol | `FXS` | `FRAX` | Token API returns the FXS governance token symbol instead of FRAX. Same on mainnet/polygon. |
| mainnet | FRAX | `0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0` | symbol | `FXS` | `FRAX` | Same as above. |
| polygon | FRAX | `0x1a3acf6d19267e2d3e7f898f42803e90c9219062` | symbol | `FXS` | `FRAX` | Same as above. |
| arbitrum-one | RLP | `0x35e5db674d8e93a03d814fa0ada70731efe8a4b9` | symbol | `USR` | `RLP` | Token API returns USR — likely indexing a different contract. |
| mainnet | RENDER | `0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24` | symbol | `RNDR` | `RENDER` | Token migrated from RNDR to RENDER. Token API has the pre-migration symbol. |
| mainnet | GOMINING | `0x7ddc52c4de30e94be3a6a0a2b259b2850f421989` | symbol | `GMT` | `GOMINING` | GoMining rebranded from GMT. Token API has the pre-rebrand symbol. |
| polygon | FLUID | `0xf50d05a1402d0adafa880d36050736f9f6ee7dee` | symbol | `INST` | `FLUID` | Instadapp rebranded to Fluid. Token API has the pre-rebrand symbol. |
| mainnet | TON | `0x582d872a1b094fc48f5de31d3b73f2d9be47def1` | symbol | `TONCOIN` | `TON` | Wrapped TON contract returns TONCOIN on-chain; Blockscout normalizes to TON. |
| mainnet | VENOM | `0x46f84dc6564cdd93922f7bfb88b03d35308d87c9` | symbol | `WVENOM` | `VENOM` | Token API returns the wrapped variant symbol. |
| mainnet | BMX | `0x986ee2b944c42d017f52af21c4c69b84dbea35d8` | symbol | `BMC` | `BMX` | Token API returns a different symbol entirely. |
| mainnet | CTC | `0xa3ee21c306a700e682abcdfe9baa6a08f3820419` | symbol | `G-CRE` | `CTC` | Token API returns a different symbol entirely. |
| mainnet | MBG | `0x45e02bc2875a2914c4f585bbf92a6f28bc07cb70` | symbol | `$MBG` | `MBG` | Token API includes `$` prefix not present in reference. |
| unichain | WIF | `0x97fadb3d000b953360fd011e173f12cddb5d70fa` | symbol | `$WIF` | `WIF` | Token API includes `$` prefix not present in reference. |
| mainnet | DOVU | `0x2aeabde1ab736c59e9a19bed67681869eef39526` | symbol | `DOVU[eth]` | `DOVU` | Token API appends chain suffix. |
| base | DOVU | `0xb38266e0e9d9681b77aeb0a280e98131b953f865` | symbol | `DOVU[base]` | `DOVU` | Token API appends chain suffix. |
| mainnet | AUSDT | `0x9eead9ce15383caeed975427340b3a369410cfbf` | symbol | `aUSD₮` | `AUSDT` | Token API returns Unicode on-chain symbol; Blockscout returns ASCII normalized form. |

### Sustained Regressions (total_supply, ≥3/5 runs mismatching)

54 sustained regressions (deduplicated by provider: 31 unique tokens). Sorted by divergence magnitude.

| Network | Symbol | Contract | Diff % | Runs (of 5) | Likely Cause |
|---------|--------|----------|--------|-------------|--------------|
| mainnet | VVS | `0x839e71613f9aa06e5701cf6de63e303616b0dde3` | 7.0e49% | 5/5 | Our value is 1.16e59 — likely max uint256 overflow or broken indexing. VVS is a Cronos-native token. |
| arbitrum-one | EUTBL | `0xcbeb19549054cc0a6257a77736fc78c367216ce7` | 10M% | 5/5 | Cascading from wrong decimals (0 vs 5). Our unscaled value is 10^5× too large. |
| arbitrum-one | SUSHI | `0xd4d42f0b6def4ce0383636770ef773390d85c61a` | 13,082% | 5/5 | Our value (66M) is ~130× the reference (500K). Token API may aggregate across contracts or index a different one. |
| arbitrum-one | ARB | `0x912ce59144191c1204e64559fe8253a0e49e6548` | 504% | 5/5 | Our value (60B) vs reference (10B). Token API likely returns total minted rather than circulating supply. |
| arbitrum-one | AAVE | `0xba5ddd1f9d7f570dc94a51479a000e3bce967196` | 496% | 5/5 | Our value (381K) vs reference (64K). Same pattern — total minted vs bridge-local supply. |
| arbitrum-one | USTBL | `0x021289588cd81dc1ac87ea91e91607eef68303f5` | 90% | 5/5 | Cascading from wrong decimals (6 vs 5). Off by exactly 10×. |
| arbitrum-one | GMX | `0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a` | 75% | 5/5 | Our value (18.9M) vs reference (10.8M). Possible supply method discrepancy. |
| mainnet | HSK | `0xe7c6bf469e97eeb0bfb74c8dbff5bd47d4c1c98a` | 65% | 5/5 | Our value (345M) vs reference (1B). Our API returning partial supply. |
| polygon | CRVUSD | `0xc4ce1d6f5d98d65ee25cf85e9f2e9dcfee6cb5d6` | 59% | 5/5 | Our value (9.9K) vs reference (24K). |
| mainnet | QNT | `0x4a220e6096b25eadb88358cb44068a3248254675` | 46% | 5/5 | Our value (24.4M) vs reference (45.5M). Token API may track a subset. |
| arbitrum-one | GHO | `0x7dff72693f6a4149b17e7c6314655f6a9f7c8b33` | 35% | 5/5 | Our value (2.0M) vs reference (3.1M). |
| mainnet | NMR | `0x1776e1f26f98b1a5df9cd347953a26dd3cb46671` | 28% | 5/5 | Our value (13.6M) vs reference (10.6M). Our value is higher — opposite pattern. |
| polygon | POL | `0x0000000000000000000000000000000000001010` | 27% | 5/5 | Our value (7.3B) vs reference (10B). Native token supply is often reported differently. |
| mainnet | EIGEN | `0xec53bf9167f50cdeb3ae105f56099aaab9061f83` | 19% | 5/5 | Our value (1.46B) vs reference (1.80B). |
| mainnet | USTB | `0x43415eb6ff9db7e26a15b704e7a3edce97d31c4e` | 12% | 5/5 | Our value (55.6M) vs reference (63.2M). |
| mainnet | USYC | `0x136471a34f6ef19fe571effc1ca711fdb8e49f2b` | 12% | 5/5 | Our value (113M) vs reference (101M). Our value is higher. |
| optimism | UNI | `0x6fd9d7ad17242c41f7131d257212c54a0e816691` | 11% | 5/5 | Our value (73.7K) vs reference (82.7K). |
| mainnet | MOG | `0xaaee1a9723aadb7afa2810263653a34ba2c21c7a` | 8% | 5/5 | Our value (420.7T) vs reference (390.6T). Burned tokens may not be subtracted. |
| mainnet | OKB | `0x75231f58b43240c9718dd58b4967c5114342a86c` | 7% | 5/5 | Our value (429K) vs reference (459K). |
| arbitrum-one | CRVUSD | `0x498bf2b1e120fed3ad3d42ea2165e9b73f99c1e5` | 6% | 5/5 | |
| optimism | LINK | `0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6` | 5% | 5/5 | |
| polygon | UNI | `0xb33eaad8d922b1083446dc23f610c2567fb5180f` | 5% | 5/5 | |
| base | CGUSD | `0xca72827a3d211cfd8f6b00ac98824872b72cab49` | 4% | 5/5 | |
| arbitrum-one | ATH | `0xc87b37a581ec3257b734886d9d3a581f5a9d056c` | 3% | 3/5 | Intermittent — close to tolerance boundary. |
| arbitrum-one | ZRO | `0x6985884c4392d348587b19cb9eaaf157f13271cd` | 3% | 5/5 | |
| base | CAKE | `0x3055913c90fcc1a6ce9a358911721eeb942013a1` | 3% | 5/5 | |
| arbitrum-one | USDE | `0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34` | 2% | 5/5 | |
| arbitrum-one | CAKE | `0x1b896893dfc86bb67cf57767298b9073d2c1ba2c` | 2% | 5/5 | |
| polygon | MANA | `0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4` | 2% | 5/5 | |
| optimism | SNX | `0x8700daec35af8ff88c16bdf0418774cb3d7599b4` | 2% | 5/5 | |
| polygon | EURS | `0xe111178a87a3bff0c8d18decba5798827539ae99` | 1% | 5/5 | Borderline — just above 1% tolerance. |
| mainnet | RSR | `0x320623b8e4ff03373931769a31fc52a4e78b5d70` | 1% | 5/5 | Borderline — just above 1% tolerance. |
| mainnet | A7A5 | `0x6fa0be17e4bea2fcfa22ef89bf8ac9aab0ab0fc9` | 1% | 5/5 | Borderline — just above 1% tolerance. |
| polygon | USD+ | `0x236eec6359fb44cce8f97e99387aa7f8cd5cde1f` | N/A | 5/5 | Reference returns `0`, our value is 81K. Division by zero in diff calc. |

## Findings

### 1. Wrong decimals on arbitrum-one (2 tokens)

EUTBL (0 vs 5) and USTBL (6 vs 5) have incorrect decimals in Token API. This cascades into total_supply mismatches because the comparator uses decimals to normalize raw supply values. Fixing these 2 tokens would resolve 4 additional total_supply mismatches.

### 2. Wrong contract or symbol mapping (6 tokens)

FRAX returns `FXS` on 3 networks — Token API appears to index the FXS governance token address under the FRAX entry. RLP returns `USR` on arbitrum-one — same pattern. BMX→`BMC` and CTC→`G-CRE` on mainnet suggest wrong contracts or proxy resolution issues.

### 3. Stale token rebrands (3 tokens)

RNDR→RENDER, GMT→GOMINING, INST→FLUID. These tokens migrated to new contracts with updated symbols. Token API still returns the old on-chain symbol from the deprecated contract.

### 4. Total supply semantic gap (≥15 tokens, arbitrum-one concentrated)

Many L2 tokens show our supply value consistently higher than the reference, with the same ratio every run. This pattern (ARB 6×, AAVE 6×, SUSHI 130×, GMX 1.8×) suggests Token API is returning total minted supply (or aggregating across an L1 contract) rather than the L2-local `totalSupply()` that explorers report.

### 5. Symbol formatting inconsistencies (4 tokens)

`$MBG`, `$WIF` (dollar-sign prefix), `DOVU[eth]`, `DOVU[base]` (chain suffix), `aUSD₮` (Unicode). These are valid on-chain values but differ from the ASCII-normalized forms explorers return. Could be addressed by extended normalization in the comparator, or by updating Token API's output format.

### 6. Etherscan coverage gap

1710 of 1781 nulls are Etherscan `paid_plan_required`. This affects: all decimals/symbol comparisons (696 each, since `tokeninfo` needs a paid plan), and total_supply on chains excluded from the free tier (318). An Etherscan Standard plan ($199/mo) would add ~1400 additional comparable data points per run.
