WITH
tx_hash_timestamps AS (
    SELECT timestamp
    FROM trc20_transfer
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY timestamp
),
from_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE {from_address:Array(String)} != [''] OR `from` IN {from_address:Array(String)}
    GROUP BY minute
),
to_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE {to_address:Array(String)} != [''] OR `to` IN {to_address:Array(String)}
    GROUP BY minute
),
log_address_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE ({contract:Array(String)} != [''] AND log_address IN {contract:Array(String)})
    GROUP BY minute
),
transfers AS (
    SELECT * FROM trc20_transfer
    WHERE
        /* filter by timestamp and block_num early to reduce data scanned */
            ({start_time:UInt64} = 1420070400 OR timestamp >= toDateTime({start_time:UInt64}))
        AND ({end_time:UInt64} = 2524608000 OR timestamp <= toDateTime({end_time:UInt64}))
        AND ({start_block:UInt64} = 0 OR block_num >= {start_block:UInt64})
        AND ({end_block:UInt64} = 9999999999 OR block_num <= {end_block:UInt64})

        /* timestamp/minute filters */
        AND ({transaction_id:Array(String)} = [''] OR timestamp IN tx_hash_timestamps)
        AND ({contract:Array(String)} = [''] OR minute IN log_address_minutes)
        AND ({from_address:Array(String)} = [''] OR minute IN (SELECT minute FROM from_minutes))
        AND ({to_address:Array(String)} = [''] OR minute IN to_minutes)

        /* filter by active filters if any */
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({contract:Array(String)} = [''] OR log_address IN {contract:Array(String)})
        AND ({from_address:Array(String)} = [''] OR `from` IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = [''] OR `to` IN {to_address:Array(String)})
    ORDER BY timestamp DESC, block_num DESC, tx_index DESC, log_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    /* block */
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,

    /* transaction */
    toString(t.tx_hash) as transaction_id,
    tx_index AS transaction_index,

    /* log */
    log_index,
    log_ordinal,
    log_address AS contract,

    /* transfer */
    `from`,
    `to`,
    toString(t.amount) AS amount,
    t.amount / pow(10, decimals) AS value,

    /* token metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network:String} AS network
FROM transfers AS t
/* Get token metadata (name, symbol, decimals) */
JOIN `tron:tvm-tokens@v0.1.2`.metadata AS m ON t.log_address = m.contract
ORDER BY timestamp DESC, block_num DESC, tx_index DESC, log_index DESC;