WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({transaction_id:Array(String)} != ['']) +
        toUInt8({from_address:Array(String)}   != ['']) +
        toUInt8({to_address:Array(String)}     != ['']) +
        toUInt8({contract:Array(String)}       != [''])
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE ({from_address:Array(String)} != [''] AND `from` IN {from_address:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE ({to_address:Array(String)} != [''] AND `to` IN {to_address:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE ({contract:Array(String)} != [''] AND log_address IN {contract:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY minute
),
/* 3) Intersect: keep only buckets present in ALL active filters, bounded by requested time window */
filtered_minutes AS
(
    SELECT minute FROM minutes_union
    WHERE ({start_time: UInt64} = 1420070400 OR minute >= toRelativeMinuteNum(toDateTime({start_time: UInt64})))
      AND ({end_time: UInt64} = 2524608000 OR minute <= toRelativeMinuteNum(toDateTime({end_time: UInt64})))
    GROUP BY minute
    HAVING count() >= (SELECT n FROM active_filters)
    ORDER BY minute DESC
    LIMIT 1 BY minute
    LIMIT if(
        (SELECT n FROM active_filters) <= 1,
        toUInt64({limit:UInt64}) + toUInt64({offset:UInt64}),           /* safe to limit if there is 1 active filter */
        (toUInt64({limit:UInt64}) + toUInt64({offset:UInt64})) * 10     /* unsafe limit with a multiplier - usually safe but find a way to early return */
    )
),
filtered_transfers AS
(
    SELECT *
    FROM {db_transfers:Identifier}.transfers t
    WHERE
            ((SELECT n FROM active_filters) = 0 OR minute IN (SELECT minute FROM filtered_minutes))

        /* Always apply minute bounds for partition pruning */
        AND ({start_time: UInt64} = 1420070400 OR minute >= toRelativeMinuteNum(toDateTime({start_time: UInt64})))
        AND ({end_time: UInt64} = 2524608000 OR minute <= toRelativeMinuteNum(toDateTime({end_time: UInt64})))

        /* Fine-grained timestamp filter */
        AND ({start_time: UInt64} = 1420070400 OR (minute, timestamp) >= (toRelativeMinuteNum(toDateTime({start_time: UInt64})), {start_time: UInt64}))
        AND ({end_time: UInt64} = 2524608000 OR (minute, timestamp) <= (toRelativeMinuteNum(toDateTime({end_time: UInt64})), {end_time: UInt64}))
        AND ({start_block: UInt64} = 0 OR block_num >= {start_block: UInt64})
        AND ({end_block: UInt64} = 9999999999 OR block_num <= {end_block: UInt64})
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({from_address:Array(String)} = ['']  OR `from` IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = ['']    OR `to` IN {to_address:Array(String)})
        AND ({contract:Array(String)} = ['']      OR contract IN {contract:Array(String)})
    ORDER BY minute DESC, timestamp DESC, block_num DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
contracts AS (
    SELECT DISTINCT log_address AS contract FROM filtered_transfers
),
contracts_metadata AS (
    SELECT network, contract, name, symbol, decimals
    FROM metadata.metadata
    WHERE network = {network:String} AND contract IN (SELECT contract FROM contracts)
    ORDER BY block_num DESC
    LIMIT 1 BY network, contract
)
SELECT
    /* block */
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,

    /* transaction */
    toString(t.tx_hash) as transaction_id,

    /* log */
    log_index,
    /* log_ordinal AS ordinal, for `/v2` endpoint */
    log_address as contract,

    /* transfer */
    transfer_type as type,
    `from`,
    `to`,

    /* metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* amounts */
    toString(t.amount) AS amount,
    t.amount / pow(10, m.decimals) AS value,

    /* network */
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN contracts_metadata AS m ON t.log_address = m.contract
ORDER BY minute DESC, timestamp DESC, block_num DESC
