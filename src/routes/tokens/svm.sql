WITH circulating AS (
    SELECT
        mint,
        program_id,
        decimals,
        count() AS holders,
        sum(amount) AS circulating_supply,
        max(block_num) AS block_num,
        max(timestamp) AS timestamp
    FROM (
        SELECT
            account,
            program_id,
            mint,
            decimals,
            max(block_num) AS block_num,
            max(timestamp) AS timestamp,
            argMax(amount, b.block_num) AS amount
        FROM {db_balances:Identifier}.balances AS b
        WHERE mint IN {mint:Array(String)}
        GROUP BY mint, account, program_id, decimals
        HAVING amount > 0
    )
    GROUP BY mint, program_id, decimals
),
metadata AS
(
    SELECT
        mint,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        if(empty(uri), NULL, uri) AS uri
    FROM {db_metadata:Identifier}.metadata_view
    WHERE metadata IN (
        SELECT metadata
        FROM {db_metadata:Identifier}.metadata_mint_state
        WHERE mint IN {mint:Array(String)}
        GROUP BY metadata
    )
)
SELECT
    /* timestamps */
    c.timestamp AS last_update,
    c.block_num AS last_update_block_num,
    toUnixTimestamp(c.timestamp) AS last_update_timestamp,

    /* identifiers */
    toString(c.program_id) AS program_id,
    toString(c.mint) AS mint,

    /* amounts */
    c.circulating_supply / pow(10, c.decimals) AS circulating_supply,
    c.holders AS holders,

    /* metadata */
    c.decimals AS decimals,
    m.name AS name,
    m.symbol AS symbol,
    m.uri AS uri,

    {network:String} AS network
FROM circulating AS c
LEFT JOIN metadata AS m USING mint
