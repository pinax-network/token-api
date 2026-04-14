WITH metadata AS (
    SELECT mint, name, symbol, uri
    FROM {db_metadata:Identifier}.metadata
    WHERE mint = {mint:String}
    LIMIT 1
),
balances AS (
    SELECT account, block_num, timestamp, program_id, mint, amount, decimals
    FROM {db_balances:Identifier}.balances_holders
    WHERE mint = {mint:String}
    LIMIT 1000
),
close_accounts AS (
    SELECT account, closed
    FROM {db_accounts:Identifier}.close_account_view
    WHERE account IN (SELECT account FROM balances)
),
owners AS (
    SELECT account, owner
    FROM {db_accounts:Identifier}.owner_view
    WHERE account IN (SELECT account FROM balances)
)
SELECT
    /* block */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* token */
    program_id,
    mint,

    /* token account */
    b.account AS token_account,
    o.owner AS owner,

    /* amount */
    toString(b.amount) AS amount,
    b.amount / pow(10, b.decimals) AS value,
    b.decimals AS decimals,

    /* metadata */
    nullIf(m.name, '') AS name,
    nullIf(m.symbol, '') AS symbol,
    nullIf(m.uri, '') AS uri,

    /* network */
    {network:String} as network
FROM balances b
LEFT JOIN metadata m USING (mint)
LEFT JOIN owners o USING (account)
LEFT JOIN close_accounts c USING (account)
WHERE mint = {mint:String} AND (closed IS NULL OR closed = false)
ORDER BY b.amount DESC, b.account
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
