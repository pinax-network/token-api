WITH balances AS (
    SELECT
        account,
        argMax(b.amount, b.block_num) AS amount,
        max(b.timestamp) AS timestamp,
        max(b.block_num) AS block_num,
        program_id,
        decimals,
        mint
    FROM {db_balances:Identifier}.balances b
    WHERE mint = {mint:String}
    GROUP BY account, program_id, mint, decimals
    HAVING amount > if ( {mint:String} = 'So11111111111111111111111111111111111111112', 4000 * pow(10, 9), 0 )
    ORDER BY amount DESC, account DESC
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,
    /* token */
    toString(b.program_id) AS program_id,
    toString(b.mint) AS mint,

    /* owner */
    toString(if(notEmpty(o.owner), o.owner, Null)) AS owner,
    toString(b.account) AS token_account,

    /* amount */
    toString(b.amount) AS amount,
    b.amount / pow(10, b.decimals) AS value,

    /* accounts */
    b.decimals AS decimals,

    /* metadata */
    nullIf(m.name, '') AS name,
    nullIf(m.symbol, '') AS symbol,
    nullIf(m.uri, '') AS uri,

    {network:String} AS network
FROM balances AS b
LEFT JOIN {db_accounts:Identifier}.owner_view AS o USING (account)
LEFT JOIN {db_metadata:Identifier}.metadata_mint_state AS mm USING (mint)
LEFT JOIN {db_metadata:Identifier}.metadata_view AS m USING (metadata)
ORDER BY amount DESC, b.account
