WITH sorted AS (
    SELECT *
    FROM transfers
    WHERE timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
    ORDER BY timestamp DESC
),
filtered AS (
    SELECT *
    FROM sorted
    WHERE ({signature:String}           = '' OR tx_hash = {signature:String})
        AND ({source:String}            = '' OR source = {source:String})
        AND ({destination:String}       = '' OR destination = {destination:String})
        AND ({mint:String}              = '' OR mint_raw = {mint:String})
)
SELECT
    block_num,
    toUnixTimestamp(timestamp) AS datetime,
    if (
        timestamp = 0,
        toDateTime(1584332940 + intDiv(block_num * 2, 5), 'UTC'),
        timestamp
    ) AS timestamp,
    tx_hash AS signature,
    toString(program_id) AS program,
    toString(mint_raw) AS mint,
    toString(source) AS source,
    toString(destination) AS destination,
    amount,
    {network_id: String} AS network_id
FROM filtered
LIMIT   {limit:int}
OFFSET  {offset:int}