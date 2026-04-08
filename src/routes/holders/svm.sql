WITH mint_meta AS (
    SELECT name, symbol, uri
    FROM {db_metadata:Identifier}.metadata_view
    WHERE metadata = (
        SELECT metadata FROM {db_metadata:Identifier}.metadata_mint_state
        WHERE mint = {mint:String} LIMIT 1
    )
)
SELECT
    b.ts AS last_update,
    b.bn AS last_update_block_num,
    toUnixTimestamp(b.ts) AS last_update_timestamp,
    toString(b.prog_id) AS program_id,
    {mint:String} AS mint,
    toString(if(notEmpty(ol.owner), ol.owner, Null)) AS owner,
    toString(b.account) AS token_account,
    toString(b.amt) AS amount,
    b.amt / pow(10, b.dec) AS value,
    b.dec AS decimals,
    nullIf(m.name, '') AS name,
    nullIf(m.symbol, '') AS symbol,
    nullIf(m.uri, '') AS uri,
    {network:String} AS network
FROM (
    SELECT account, argMax(amount, block_num) AS amt, max(timestamp) AS ts,
        max(block_num) AS bn, any(program_id) AS prog_id, any(decimals) AS dec
    FROM {db_balances:Identifier}.balances
    WHERE mint = {mint:String} AND amount > 0
    GROUP BY account
    HAVING amt > if({mint:String} = 'So11111111111111111111111111111111111111112', 4000 * pow(10, 9), 0)
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
            FROM {db_balances:Identifier}.balances
            WHERE mint = {mint:String} AND amount > 0
            GROUP BY account
            HAVING amt > if({mint:String} = 'So11111111111111111111111111111111111111112', 4000 * pow(10, 9), 0)
            ORDER BY amt DESC
            LIMIT {limit:UInt64}
            OFFSET {offset:UInt64}
        )
    )
    GROUP BY account
) AS ol ON b.account = ol.account
LEFT JOIN mint_meta AS m ON 1 = 1
ORDER BY b.amt DESC, b.account
