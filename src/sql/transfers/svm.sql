WITH
filtered_transfers AS (
    SELECT
        block_num,
        timestamp AS datetime,
        tx_hash AS transaction_id,
        toString(program_id) AS program,
        toString(mint) AS contract,
        toString(source) AS `from`,
        toString(destination) AS `to`,
        amount,
        decimals,
        amount / pow(10, decimals) AS value
    FROM transfers
    WHERE timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
        AND ({transaction_id:String} = '' OR tx_hash = {transaction_id:String})
        AND ({from:String} = ''  OR source = {from:String})
        AND ({to:String} = ''  OR destination = {to:String})
        AND ({contract:String} = '' OR mint = {contract:String})
)
SELECT
    *,
    {network_id: String} AS network_id
FROM filtered_transfers AS t
ORDER BY datetime DESC
LIMIT   {limit:int}
OFFSET  {offset:int}
