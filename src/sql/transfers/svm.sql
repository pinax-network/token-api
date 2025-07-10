WITH t AS (
    SELECT
        timestamp_since_genesis,
        decimals,
        *
    FROM transfers
    WHERE timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
    ORDER BY timestamp DESC
)
SELECT
    block_num,
    t.timestamp_since_genesis AS datetime,
    toUnixTimestamp(t.timestamp_since_genesis) AS timestamp,
    tx_hash AS signature,
    toString(program_id) AS program_id,
    toString(authority) AS authority,
    toString(mint_raw) AS mint,
    toString(source) AS source,
    toString(destination) AS destination,
    toString(amount) as amount,
    decimals,
    t.amount / pow(10, ifNull(decimals, 0)) AS value,
    {network_id: String} AS network_id
FROM t
WHERE   ({source:String}            = '' OR source = {source:String})
    AND ({destination:String}       = '' OR destination = {destination:String})
    AND ({mint:String}              = '' OR mint = {mint:String})
    AND ({authority:String}         = '' OR authority = {authority:String})
LIMIT   {limit:int}
OFFSET  {offset:int}