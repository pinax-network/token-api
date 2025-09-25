WITH filtered_balances AS (
    SELECT
        max(timestamp) AS last_update,
        max(block_num) AS last_update_block_num,
        any(program_id) AS program_id,
        mint,
        any(decimals) AS decimals
    FROM balances
    WHERE mint = {mint:String} AND amount > 0
    GROUP BY mint
),
metadata AS
(
    SELECT
        mint,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        if(empty(uri), NULL, uri) AS uri
    FROM metadata_view
    WHERE metadata IN (
        SELECT metadata
        FROM metadata_mint_state_latest
        WHERE mint = {mint:String}
        GROUP BY metadata
    )
)
SELECT
    last_update,
    last_update_block_num,
    toUnixTimestamp(last_update) AS last_update_timestamp,
    toString(program_id) AS program_id,
    toString(mint) AS mint,
    decimals,
    name,
    symbol,
    uri,
    {network_id: String} AS network_id
FROM filtered_balances
LEFT JOIN metadata USING mint