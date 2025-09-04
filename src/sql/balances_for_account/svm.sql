WITH filtered_balances AS
(
    SELECT *
    FROM balances
    WHERE ({token_account:String}     = '' OR account = {token_account:String})
        AND ({mint:String}            = '' OR mint = {mint:String})
        AND ({program_id:String}      = '' OR program_id = {program_id:String})
        AND amount > 0
    ORDER BY program_id
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
    FROM metadata
    WHERE metadata IN (
        SELECT metadata
        FROM metadata_mint_state_latest
        JOIN filtered_balances USING mint
        GROUP BY metadata
    )
)
SELECT
    block_num,
    b.timestamp                         AS datetime,
    toUnixTimestamp(b.timestamp)        AS timestamp,
    toString(program_id)                AS program_id,
    toString(account)                     AS token_account,
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
