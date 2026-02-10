WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({transaction_id:Array(String)}  != ['']) +
        toUInt8({factory:Array(String)}         != ['']) +
        toUInt8({pool:Array(String)}            != ['']) +
        toUInt8({recipient:Array(String)}       != ['']) +
        toUInt8({sender:Array(String)}          != ['']) +
        toUInt8({caller:Array(String)}          != ['']) +
        toUInt8({input_contract:Array(String)}  != ['']) +
        toUInt8({output_contract:Array(String)} != ['']) +
        toUInt8({protocol:String}               != '')
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({factory:Array(String)} != [''] AND factory IN {factory:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({pool:Array(String)} != [''] AND pool IN {pool:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({recipient:Array(String)} != [''] AND user IN {recipient:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({sender:Array(String)} != [''] AND tx_from IN {sender:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({caller:Array(String)} != [''] AND tx_from IN {caller:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({input_contract:Array(String)} != [''] AND input_contract IN {input_contract:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({output_contract:Array(String)} != [''] AND output_contract IN {output_contract:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE ({protocol:String} != '' AND protocol = replaceAll({protocol:String}, '_', '-'))
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
filtered_swaps AS
(
    SELECT *
    FROM {db_dex:Identifier}.swaps

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

        AND ({transaction_id:Array(String)} = ['']      OR tx_hash IN {transaction_id:Array(String)})
        AND ({factory:Array(String)} = ['']             OR factory IN {factory:Array(String)})
        AND ({pool:Array(String)} = ['']                OR pool IN {pool:Array(String)})
        AND ({recipient:Array(String)} = ['']           OR user IN {recipient:Array(String)})
        AND ({sender:Array(String)} = ['']              OR tx_from IN {sender:Array(String)})
        AND ({caller:Array(String)} = ['']              OR tx_from IN {caller:Array(String)})
        AND ({input_contract:Array(String)} = ['']      OR input_contract IN {input_contract:Array(String)})
        AND ({output_contract:Array(String)} = ['']     OR output_contract IN {output_contract:Array(String)})
        AND ({protocol:String} = ''                     OR protocol = {protocol:String})
    ORDER BY minute DESC, timestamp DESC, block_num DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
contracts AS (
    SELECT DISTINCT input_contract AS contract FROM filtered_swaps
    UNION DISTINCT
    SELECT DISTINCT output_contract AS contract FROM filtered_swaps
),
contracts_metadata AS (
    SELECT
        network,
        contract,
        argMax(name, block_num) as name,
        argMax(symbol, block_num) as symbol,
        argMax(decimals, block_num) as decimals
    FROM metadata.metadata
    WHERE network = {network:String} AND contract IN (SELECT contract FROM contracts)
    GROUP BY network, contract
)
SELECT
    /* block */
    s.block_num AS block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,

    /* transaction */
    s.tx_hash AS transaction_id,
    /* s.log_ordinal AS ordinal, for `/v2` endpoint */

    /* swap */
    toString(s.factory) AS factory,
    s.pool AS pool,
    s.tx_from AS caller,
    s.tx_from AS sender,
    s.user AS recipient,

    /* tokens */
    CAST ((
        s.input_contract,
        m1.symbol,
        m1.decimals
    ) AS Tuple(address String, symbol String, decimals UInt8)) AS input_token,
    CAST ((
        s.output_contract,
        m2.symbol,
        m2.decimals
    ) AS Tuple(address String, symbol String, decimals UInt8)) AS output_token,

    /* amounts and prices */
    toString(s.input_amount) AS input_amount,
    s.input_amount / pow(10, m1.decimals) AS input_value,
    toString(s.output_amount) AS output_amount,
    s.output_amount / pow(10, m2.decimals) AS output_value,
    if(s.input_amount > 0, (s.output_amount / pow(10, m2.decimals)) / (s.input_amount / pow(10, m1.decimals)), 0) AS price,
    if(s.output_amount > 0, (s.input_amount / pow(10, m1.decimals)) / (s.output_amount / pow(10, m2.decimals)), 0) AS price_inv,
    s.protocol AS protocol,

    /* summary */
    format('Swap {} {} for {} {} on {}',
        if(s.input_amount / pow(10, m1.decimals) > 1000, formatReadableQuantity(s.input_amount / pow(10, m1.decimals)), toString(s.input_amount / pow(10, m1.decimals))),
        m1.symbol,
        if(s.output_amount / pow(10, m2.decimals) > 1000, formatReadableQuantity(s.output_amount / pow(10, m2.decimals)), toString(s.output_amount / pow(10, m2.decimals))),
        m2.symbol,
        arrayStringConcat(
            arrayMap(x -> concat(upper(substring(x, 1, 1)), substring(x, 2)),
                     splitByChar('_', toString(s.protocol))),
            ' '
        )
    ) AS summary,

    /* network */
    {network:String} AS network
FROM filtered_swaps AS s
LEFT JOIN contracts_metadata AS m1 ON s.input_contract = m1.contract
LEFT JOIN contracts_metadata AS m2 ON s.output_contract = m2.contract
ORDER BY minute DESC, timestamp DESC, block_num DESC
