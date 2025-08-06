WITH
filtered_transfers AS (
    SELECT
        block_num,
        timestamp,
        signature,
        toString(program_id) AS program_id,
        toString(authority) AS authority,
        toString(mint) AS mint,
        toString(source) AS source,
        toString(destination) AS destination,
        toString(amount) as amount,
        decimals,
        transfers.amount / pow(10, ifNull(decimals, 0)) AS value,
        {network_id: String} AS network_id
    FROM transfers
    WHERE timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND ({source:String}            = '' OR source = {source:String})
        AND ({destination:String}       = '' OR destination = {destination:String})
        AND ({mint:String}              = '' OR mint = {mint:String})
        AND ({authority:String}         = '' OR authority = {authority:String})
        AND ({program_id:String}         = '' OR program_id = {program_id:String})
    LIMIT   {limit:int}
    OFFSET  {offset:int}
)
SELECT
    block_num,
    timestamp AS datetime,
    toUnixTimestamp(timestamp) AS timestamp,
    signature,
    program_id,
    authority,
    mint,
    if(
        mint = 'So11111111111111111111111111111111111111111',
        'SOL',
        if(
            mint = 'So11111111111111111111111111111111111111112',
            'Wrapped SOL',
            name
        )
    ) AS name,
    if(
        mint = 'So11111111111111111111111111111111111111111',
        'SOL',
        if(
            mint = 'So11111111111111111111111111111111111111112',
            'WSOL',
            symbol
        )
    ) AS symbol,
    source,
    destination,
    amount,
    decimals,
    value,
    network_id
FROM filtered_transfers
LEFT JOIN metadata USING mint
ORDER BY timestamp DESC;