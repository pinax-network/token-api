/* 1) Get metadata for the mint */
WITH
metadata AS (
    SELECT
        mint,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        if(empty(uri), NULL, uri) AS uri
    FROM metadata_view
    WHERE metadata IN (
        SELECT metadata
        FROM metadata_mint_state_latest
        WHERE {mint:String} != 'So11111111111111111111111111111111111111111' AND mint = {mint:String}
        GROUP BY metadata
    )
),
/* 2) Branch if it's native SOL - use balances_native table with reasonable cutoff */
top_native AS (
    SELECT
        account,
        argMax(lamports, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        toUInt8(9) AS dec,
        '' AS prog_id,
        {mint:String} AS mnt,
        'Native' AS name_override,
        'SOL' AS symbol_override,
        '' AS uri_override
    FROM balances_native
    WHERE {mint:String} = 'So11111111111111111111111111111111111111111'
      AND lamports > 50000 * pow(10, 9)
    GROUP BY account
),
/* 3) Branch if it's wrapped SOL - use balances table with reasonable cutoff */
top_wrapped AS (
    SELECT
        account,
        argMax(amount, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        any(decimals) AS dec,
        any(program_id) AS prog_id,
        any(mint) AS mnt
    FROM balances
    WHERE {mint:String} = 'So11111111111111111111111111111111111111112'
      AND mint = {mint:String}
      AND amount > 2000 * pow(10, 9)
    GROUP BY account
),
/* 4) Branch if it's a regular SPL token - no cutoff */
top_spl AS (
    SELECT
        account,
        argMax(amount, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        any(decimals) AS dec,
        any(program_id) AS prog_id,
        any(mint) AS mnt
    FROM balances
    WHERE {mint:String} != 'So11111111111111111111111111111111111111111'
      AND {mint:String} != 'So11111111111111111111111111111111111111112'
      AND mint = {mint:String}
      AND amount > 0
    GROUP BY account
),
top_balances AS (
    SELECT account, amt, ts, bn, dec, prog_id, mnt
    FROM top_native
    UNION ALL
    SELECT account, amt, ts, bn, dec, prog_id, mnt
    FROM top_wrapped
    UNION ALL
    SELECT account, amt, ts, bn, dec, prog_id, mnt
    FROM top_spl
)
SELECT
    ts AS last_update,
    bn AS last_update_block_num,
    toUnixTimestamp(ts) AS last_update_timestamp,
    toString(account) AS owner,
    toString(mnt) AS mint,
    toString(prog_id) AS program_id,
    toString(amt) AS amount,
    amt / pow(10, dec) AS value,
    dec AS decimals,
    if({mint:String} = 'So11111111111111111111111111111111111111111', 'Native', name) AS name,
    if({mint:String} = 'So11111111111111111111111111111111111111111', 'SOL', symbol) AS symbol,
    if (isNull(uri), '', uri) AS uri,
    {network:String} AS network
FROM top_balances
LEFT JOIN metadata ON mnt = metadata.mint
ORDER BY value DESC, account
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
