WITH accounts AS (
    SELECT DISTINCT account
    FROM (
        SELECT {token_account:String} AS account
        WHERE {token_account:String} != ''
        
        UNION ALL
        
        SELECT argMax(account, o.block_num) AS account
        FROM owner_state_latest AS o
        WHERE {token_account:String} = ''
          AND owner = {owner:String}
        GROUP BY owner, o.account
    )
    WHERE account != ''
),
mints AS (
    SELECT DISTINCT mint
    FROM (
        SELECT {mint:String} AS mint
        WHERE {mint:String} != ''
        
        UNION ALL
        
        SELECT mint
        FROM mint_state_latest
        WHERE {mint:String} = '' 
          AND account IN (SELECT account FROM accounts)
    )
    WHERE mint != ''
),
filtered_balances AS
(
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        program_id,
        account,
        argMax(amount, b.block_num) AS amount,
        mint,
        any(decimals) AS decimals
    FROM balances AS b
    WHERE mint IN (SELECT mint FROM mints)
        AND mint != 'So11111111111111111111111111111111111111111'
        AND account IN (SELECT account FROM accounts)
        AND ({program_id:String}      = '' OR program_id = {program_id:String})
        AND b.amount > 0
    GROUP BY program_id, mint, account
    ORDER BY timestamp DESC
    LIMIT  {limit:UInt64}
    OFFSET {offset:UInt64}
),
metadata AS
(
    SELECT
        mint,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        if(empty(uri), NULL, uri) AS uri
    FROM metadata_view
    WHERE metadata IN (
        SELECT metadata
        FROM metadata_mint_state_latest
        WHERE mint IN (SELECT mint FROM filtered_balances)
        GROUP BY metadata
    )
)
SELECT
    b.timestamp                         AS last_update,
    block_num                           AS last_update_block_num,
    toUnixTimestamp(b.timestamp)        AS last_update_timestamp,
    toString(program_id)                AS program_id,
    {owner:String}                      AS owner,
    toString(account)                   AS token_account,
    toString(mint)                      AS mint,
    toString(b.amount)                  AS amount,
    b.amount / pow(10, decimals)        AS value,
    decimals,
    name,
    symbol,
    uri,
    {network_id:String}     AS network_id
FROM filtered_balances AS b
LEFT JOIN metadata USING mint
ORDER BY timestamp DESC