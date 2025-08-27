SELECT
    block_num,
    signature,
    program_id,
    authority,
    mint,
    source,
    destination,
    amount,
    decimals,
    t.amount / pow(10, ifNull(decimals, 0)) AS value,
    {network_id: String} AS network_id
FROM transfers t
WHERE   timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
    AND ({source:String}            = '' OR source = {source:String})
    AND ({destination:String}       = '' OR destination = {destination:String})
    AND ({mint:String}              = '' OR mint = {mint:String})
    AND ({authority:String}         = '' OR authority = {authority:String})
    AND ({program_id:String}         = '' OR program_id = {program_id:String})
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}