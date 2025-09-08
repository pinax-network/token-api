WITH accounts AS
(
    SELECT
        argMax(account, o.block_num) AS account
    FROM owner_state_latest AS o
    WHERE owner = {owner:String}
    GROUP BY owner, o.account
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
        decimals
    FROM balances AS b
    WHERE account IN (SELECT account FROM accounts WHERE ({token_account:String} = '' OR account = {token_account:String}))
        AND ({mint:String}            = '' OR mint = {mint:String})
        AND mint != 'So11111111111111111111111111111111111111111'
        AND ({program_id:String}      = '' OR program_id = {program_id:String})
        AND b.amount > 0
    GROUP BY program_id, mint, account, decimals
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
