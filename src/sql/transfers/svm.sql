WITH filtered_transfers AS
(
    SELECT
        block_num,
        timestamp,
        signature,
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
            WHEN mint = 'So11111111111111111111111111111111111111111' THEN pow(10, 9)
            ELSE 1
        END AS value
    FROM transfers t
    WHERE   t.timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND ({source:String}            = '' OR source = {source:String})
        AND ({destination:String}       = '' OR destination = {destination:String})
        AND ({mint:String}              = '' OR mint = {mint:String})
        AND ({authority:String}         = '' OR authority = {authority:String})
        AND ({program_id:String}        = '' OR program_id = {program_id:String})
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
    program_id,
    mint,
    authority,
    source,
    destination,
    amount,
    value,
    decimals,
    name,
    symbol,
    uri,
    {network_id: String} AS network_id
FROM filtered_transfers AS t
LEFT JOIN metadata USING mint
ORDER BY timestamp DESC