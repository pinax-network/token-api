WITH filtered_transfers AS
(
    SELECT
        block_num,
        timestamp,
        signature,
        transaction_index,
        instruction_index,
        program_id,
        authority,
        mint,
        source,
        destination,
        amount,
        decimals,
        t.amount /
        CASE
            WHEN decimals IS NOT NULL THEN pow(10, decimals)
            ELSE 1
        END AS value
    FROM transfers t
    WHERE   t.timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND ({signature:Array(String)}         = [''] OR signature IN {signature:Array(String)})
        AND ({address:Array(String)} = ['']  OR source IN {address:Array(String)} OR destination IN {address:Array(String)})
        AND ({source:Array(String)}            = [''] OR source IN {source:Array(String)})
        AND ({destination:Array(String)}       = [''] OR destination IN {destination:Array(String)})
        AND ({authority:Array(String)}         = [''] OR authority IN {authority:Array(String)})
        AND ({mint:Array(String)}              = [''] OR mint IN {mint:Array(String)})
        AND ({program_id:String}        = '' OR program_id = {program_id:String})
    ORDER BY timestamp DESC, mint, instruction_index, transaction_index
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
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
        JOIN filtered_transfers USING mint
        GROUP BY metadata
    )
)
SELECT
    block_num,
    t.timestamp AS datetime,
    toUnixTimestamp(t.timestamp) AS timestamp,
    signature,
    transaction_index,
    instruction_index,
    program_id,
    mint,
    authority,
    source,
    destination,
    toString(amount) AS amount,
    value,
    decimals,
    name,
    symbol,
    uri,
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN metadata USING mint
ORDER BY timestamp DESC, mint, instruction_index, transaction_index