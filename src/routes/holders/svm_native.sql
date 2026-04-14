WITH balances AS (
    SELECT account, block_num, timestamp, amount, decimals
    FROM {db_balances:Identifier}.native_balances_holders
    LIMIT 1000
),
close_accounts AS (
    SELECT account, closed
    FROM {db_accounts:Identifier}.close_account_view
    WHERE account IN (SELECT account FROM balances)
)
SELECT
    /* block */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* token */
    '11111111111111111111111111111111' AS program_id,
    'So11111111111111111111111111111111111111111' AS mint,

    /* account */
    account AS token_account,

    /* amount */
    toString(b.amount) AS amount,
    b.amount / pow(10, 9) AS value,
    9 AS decimals,

    /* metadata */
    'SOL' AS name,
    'SOL' AS symbol,

    {network:String} AS network
FROM balances AS b
LEFT JOIN close_accounts c USING (account)
WHERE (closed IS NULL OR closed = false)
ORDER BY b.amount DESC, b.account
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
