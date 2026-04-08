WITH balances AS
(
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        '11111111111111111111111111111111' AS program_id,
        account,
        argMax(amount, b.block_num) AS balance_amount,
        'So11111111111111111111111111111111111111111' AS mint,
        9 AS decimals
    FROM {db_balances:Identifier}.native_balances AS b
    WHERE account IN {address:Array(String)}
    AND (b.amount > 0 OR {include_null_balances:Bool})
    GROUP BY account
    ORDER BY timestamp DESC
    LIMIT  {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    b.timestamp                         AS last_update,
    block_num                           AS last_update_block_num,
    toUnixTimestamp(b.timestamp)        AS last_update_timestamp,
    toString(program_id)                AS program_id,
    toString(account)                   AS address,
    toString(mint)                      AS mint,
    toString(b.balance_amount)          AS amount,
    b.balance_amount / pow(10, decimals) AS value,
    decimals,
    'SOL' AS name,
    'SOL' AS symbol,
    {network:String} AS network
FROM balances AS b
ORDER BY timestamp DESC
