/* filter out small balances below 5000 SOL */
WITH accounts AS (
    SELECT account FROM {db_balances:Identifier}.native_balances
    WHERE amount > toUInt64(5000 * pow(10, 9))
),
/* get the latest balance for each account */
balances AS (
    SELECT account, argMax(amount, b.block_num) as amount, max(timestamp) as timestamp, max(block_num) as block_num
    FROM {db_balances:Identifier}.native_balances b
    WHERE account IN (SELECT account FROM accounts)
    GROUP BY account
    ORDER BY amount DESC, account
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
),
owners AS (
    SELECT account, owner FROM {db_accounts:Identifier}.owner_state
    WHERE account IN (SELECT account FROM balances)
)
SELECT
    timestamp AS last_update,
    block_num AS last_update_block_num,
    toUnixTimestamp(timestamp) AS last_update_timestamp,

    /* token */
    '11111111111111111111111111111111' AS program_id,
    'So11111111111111111111111111111111111111111' AS mint,

    /* owner */
    account AS token_account,
    /* TO-DO */
    /* owners.owner AS owner, */

    /* amount */
    amount,
    amount / pow(10, 9) AS value,

    /* accounts */
    9 AS decimals,

    /* metadata */
    'SOL' AS name,
    'SOL' AS symbol,

    {network:String} AS network
FROM balances AS b
/* LEFT JOIN owners USING (account) */
ORDER BY amount DESC, account
SETTINGS use_skip_indexes_for_top_k = 1, use_top_k_dynamic_filtering = 1