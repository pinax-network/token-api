WITH balances AS (
    SELECT
        account,
        argMax(b.amount, b.block_num) AS amount,
        max(b.timestamp) AS timestamp,
        max(b.block_num) AS block_num
    FROM {db_balances:Identifier}.native_balances b
    GROUP BY account
    HAVING amount > 4000 * pow(10, 9)
    ORDER BY amount DESC, account DESC
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* token */
    '11111111111111111111111111111111' AS program_id,
    'So11111111111111111111111111111111111111111' AS mint,

    /* owner */
    if(notEmpty(o.owner), o.owner, Null) AS owner,
    b.account AS token_account,

    /* amount */
    b.amount AS amount,
    b.amount / pow(10, 9) AS value,

    /* accounts */
    9 AS decimals,

    /* metadata */
    'SOL' AS name,
    'SOL' AS symbol,

    {network:String} AS network
FROM balances AS b
LEFT JOIN {db_accounts:Identifier}.owner_view AS o USING (account)
ORDER BY amount DESC, b.account
