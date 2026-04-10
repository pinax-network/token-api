WITH cutoff AS (
    SELECT
        multiIf(
            {mint:String} = 'So11111111111111111111111111111111111111112', toUInt64(50000 * pow(10, 9)),
            toUInt64(0)
        )
),
mint_meta AS (
    SELECT mint, name, symbol, uri
    FROM {db_metadata:Identifier}.metadata_view
    WHERE metadata = (
        SELECT metadata FROM {db_metadata:Identifier}.metadata_mint_state
        WHERE mint = {mint:String} LIMIT 1
    )
),
/* get the latest balance for each account */
balances AS (
    SELECT account, mint, amount, decimals, timestamp, block_num
    FROM {db_balances:Identifier}.balances FINAL
    WHERE mint = {mint:String} AND amount > (SELECT * FROM cutoff)
    ORDER BY amount DESC, account
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    /* timestamps */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* identifiers */
    b.account AS account,
    b.mint AS mint,
    /* TO-DO */
    /* owners.owner AS owner, */

    /* amounts */
    toString(b.amount) AS amount,
    b.amount / pow(10, b.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    b.decimals AS decimals,

    /* network */
    {network:String} as network
FROM balances b
LEFT JOIN mint_meta m USING (mint)
/* LEFT JOIN {db_accounts:Identifier}.owner_state USING (account) */
ORDER BY b.amount DESC, b.account
