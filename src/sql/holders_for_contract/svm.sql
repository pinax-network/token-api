WITH filtered_balances AS
(
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        program_id,
        account,
        argMax(amount, b.block_num) AS amount,
        mint,
        any(decimals) AS decimals,
        {network_id:String} as network_id
    FROM balances AS b
    WHERE
        mint = {mint:String}
        AND b.timestamp > now() - INTERVAL 1 MONTH
    GROUP BY program_id, mint, account
    ORDER BY amount DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
owners AS
(
    SELECT
        account,
        owner
    FROM owner_state_latest AS o
    WHERE account IN (SELECT account FROM filtered_balances)
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
        WHERE mint IN (SELECT mint FROM filtered_balances)
        GROUP BY metadata
    )
)
SELECT
    b.timestamp                         AS last_update,
    block_num                           AS last_update_block_num,
    toUnixTimestamp(b.timestamp)        AS last_update_timestamp,
    toString(program_id)                AS program_id,
    toString(owner)                     AS owner,
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
LEFT JOIN owners USING account
ORDER BY value DESC