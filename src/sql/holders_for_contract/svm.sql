/* 1) Get metadata for the mint */
WITH
metadata AS (
    SELECT
        'So11111111111111111111111111111111111111111' AS mint,
        'Native' AS name,
        'SOL' AS symbol,
        '' AS uri

    UNION ALL

    SELECT
        'So11111111111111111111111111111111111111112' AS mint,
        'Wrapped SOL' AS name,
        'SOL' AS symbol,
        '' AS uri

    UNION ALL

    SELECT
        mint,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        if(empty(uri), NULL, uri) AS uri
    FROM {db_metadata:Identifier}.metadata_view
    WHERE {mint:String} NOT IN ('So11111111111111111111111111111111111111111', 'So11111111111111111111111111111111111111112')
      AND metadata IN (
        SELECT metadata
        FROM {db_metadata:Identifier}.metadata_mint_state
        WHERE mint = {mint:String}
        GROUP BY metadata
    )
),
/* 2) Branch if it's native SOL - use balances_native table with reasonable cutoff */
/* With optimal cutoff number, distinct holders with that cutoff should be at least 1000, but reasonable for the query performance: */
/* SELECT countDistinct(account) FROM balances_native WHERE lamports > N * pow(10, 9); */
top_native AS (
    SELECT
        account,
        argMax(lamports, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        toUInt8(9) AS dec,
        'Native' AS prog_id,
        {mint:String} AS mnt
    FROM {db_balances:Identifier}.balances_native
    WHERE {mint:String} = 'So11111111111111111111111111111111111111111'
      AND lamports > 100000 * pow(10, 9)
    GROUP BY account
),
/* 3) Branch if it's wrapped SOL - use balances table with reasonable cutoff */
/* With optimal cutoff number, distinct holders with that cutoff should be at least 1000, but reasonable for the query performance: */
/* SELECT countDistinct(account) FROM balances WHERE mint = 'So11111111111111111111111111111111111111112' AND amount > N * pow(10, 9); */
top_wrapped AS (
    SELECT
        account,
        argMax(amount, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        any(decimals) AS dec,
        any(program_id) AS prog_id,
        any(mint) AS mnt
    FROM {db_balances:Identifier}.balances
    WHERE {mint:String} = 'So11111111111111111111111111111111111111112'
      AND mint = {mint:String}
      AND amount > 4000 * pow(10, 9)
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
    FROM {db_balances:Identifier}.balances
    WHERE {mint:String} NOT IN ('So11111111111111111111111111111111111111111', 'So11111111111111111111111111111111111111112')
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
    name,
    symbol,
    uri,
    {network:String} AS network
FROM top_balances
LEFT JOIN metadata ON mnt = metadata.mint
ORDER BY value DESC, account
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
