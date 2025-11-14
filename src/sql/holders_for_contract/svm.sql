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
        WHERE mint = {contract:String}
        GROUP BY metadata
    )
),
/* 2) Get the latest balance per account for the specified mint */
top_balances AS (
    SELECT
        account,
        argMax(amount, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        any(decimals) AS dec,
        any(program_id) AS prog_id,
        any(mint) AS mnt
    FROM balances
    WHERE mint = {contract:String} AND amount > 0
    GROUP BY account
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
