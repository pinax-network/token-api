SELECT
    b.ts AS last_update,
    b.bn AS last_update_block_num,
    toUnixTimestamp(b.ts) AS last_update_timestamp,

    /* token */
    '11111111111111111111111111111111' AS program_id,
    'So11111111111111111111111111111111111111111' AS mint,

    /* owner */
    if(notEmpty(ol.owner), ol.owner, Null) AS owner,
    b.account AS token_account,

    /* amount */
    b.amt AS amount,
    b.amt / pow(10, 9) AS value,

    /* accounts */
    9 AS decimals,

    /* metadata */
    'SOL' AS name,
    'SOL' AS symbol,

    {network:String} AS network
FROM (
    SELECT account, argMax(amount, block_num) AS amt, max(timestamp) AS ts,
        max(block_num) AS bn
    FROM {db_balances:Identifier}.native_balances
    WHERE amount > 4000 * pow(10, 9)
    GROUP BY account
    ORDER BY amt DESC, account DESC
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
) AS b
LEFT JOIN (
    SELECT account, argMax(owner, version) AS owner
    FROM {db_accounts:Identifier}.owner_state
    WHERE account IN (
        SELECT account FROM (
            SELECT account, argMax(amount, block_num) AS amt
            FROM {db_balances:Identifier}.native_balances
            WHERE amount > 4000 * pow(10, 9)
            GROUP BY account
            ORDER BY amt DESC
            LIMIT {limit:UInt64}
            OFFSET {offset:UInt64}
        )
    )
    GROUP BY account
) AS ol ON b.account = ol.account
ORDER BY b.amt DESC, b.account
