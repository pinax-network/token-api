WITH filtered_balances AS
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
    WHERE mint = 'So11111111111111111111111111111111111111111'
        AND account = {address:String}
    GROUP BY program_id, mint, account
    ORDER BY timestamp DESC
    LIMIT  {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    b.timestamp                         AS last_update,
    block_num                           AS last_update_block_num,
    toUnixTimestamp(b.timestamp)        AS last_update_timestamp,
    toString(program_id)                AS program_id,
    {address:String}                    AS address,
    toString(mint)                      AS mint,
    toString(b.amount)                  AS amount,
    b.amount / pow(10, decimals)        AS value,
    decimals,
    'SOL' AS name,
    'SOL' AS symbol,
    null AS uri,
    {network_id:String}     AS network_id
FROM filtered_balances AS b
ORDER BY timestamp DESC
