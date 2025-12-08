WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({transaction_id:Array(String)} != ['']) +
        toUInt8({factory:Array(String)}        != ['']) +
        toUInt8({pool:Array(String)}           != ['']) +
        toUInt8({user:Array(String)}           != ['']) +
        toUInt8({input_contract:Array(String)} != ['']) +
        toUInt8({output_contract:Array(String)} != [''])
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT minute
    FROM swaps
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY minute
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps
    WHERE ({factory:Array(String)} != [''] AND factory IN {factory:Array(String)})
    GROUP BY minute
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps
    WHERE ({pool:Array(String)} != [''] AND pool IN {pool:Array(String)})
    GROUP BY minute
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps
    WHERE ({user:Array(String)} != [''] AND user IN {user:Array(String)})
    GROUP BY minute
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps
    WHERE ({input_contract:Array(String)} != [''] AND input_contract IN {input_contract:Array(String)})
    GROUP BY minute
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps
    WHERE ({output_contract:Array(String)} != [''] AND output_contract IN {output_contract:Array(String)})
    GROUP BY minute
    ORDER BY minute DESC
),
/* 3) Intersect: keep only buckets present in ALL active filters, bounded by requested time window */
filtered_minutes AS
(
    SELECT minute FROM minutes_union
    WHERE minute BETWEEN toRelativeMinuteNum(toDateTime({start_time: UInt64})) AND toRelativeMinuteNum(toDateTime({end_time: UInt64}))
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
/* Latest ingested timestamp in source table */
latest_minute AS
(
    SELECT max(minute) AS minute FROM swaps
),

filtered_swaps AS
(
    SELECT
        block_num,
        timestamp,
        tx_hash,
        tx_index,
        log_index,
        factory,
        pool,
        protocol,
        user,
        input_contract,
        output_contract,
        input_amount,
        output_amount
    FROM swaps
    PREWHERE
        timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND (
            (
                /* if no filters are active search only the last minute */
                (SELECT n FROM active_filters) = 0
                AND minute BETWEEN
                    greatest( toRelativeMinuteNum(toDateTime({start_time:UInt64})), least(toRelativeMinuteNum(toDateTime({end_time:UInt64})), (SELECT minute FROM latest_minute)) - (1 + 1 * {offset:UInt64}))
                    AND least(toRelativeMinuteNum(toDateTime({end_time:UInt64})), (SELECT minute FROM latest_minute))
            )
            /* if filters are active, search through the intersecting minute ranges */
            OR minute IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        ({transaction_id:Array(String)} = ['']    OR tx_hash IN {transaction_id:Array(String)})
        AND ({factory:Array(String)} = ['']       OR factory IN {factory:Array(String)})
        AND ({pool:Array(String)} = ['']          OR pool IN {pool:Array(String)})
        AND ({user:Array(String)} = ['']          OR user IN {user:Array(String)})
        AND ({input_contract:Array(String)} = [''] OR input_contract IN {input_contract:Array(String)})
        AND ({output_contract:Array(String)} = [''] OR output_contract IN {output_contract:Array(String)})
    ORDER BY timestamp DESC, tx_hash, log_index
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),

metadata AS (
    SELECT
        contract,
        CAST(
            (contract, symbol, name, decimals)
            AS Tuple(address String, symbol Nullable(String), name Nullable(String), decimals Nullable(UInt8))
        ) AS token,
        symbol,
        decimals
    FROM {db_evm_tokens:Identifier}.metadata_view
    WHERE contract IN (
        SELECT input_contract FROM filtered_swaps
        UNION DISTINCT
        SELECT output_contract FROM filtered_swaps
    )
    AND contract != '0x0000000000000000000000000000000000000000'

    UNION ALL

    SELECT
        contract,
        CAST(
            (contract, native_symbol, 'Native', 18)
            AS Tuple(address String, symbol Nullable(String), name Nullable(String), decimals Nullable(UInt8))
        ) AS token,
        native_symbol AS symbol,
        18 AS decimals
    FROM (
        SELECT
            '0x0000000000000000000000000000000000000000' AS contract,
            multiIf(
                {network:String} = 'mainnet', 'ETH',
                {network:String} = 'arbitrum-one', 'ETH',
                {network:String} = 'avalanche', 'AVAX',
                {network:String} = 'base', 'ETH',
                {network:String} = 'bsc', 'BNB',
                {network:String} = 'polygon', 'POL',
                {network:String} = 'optimism', 'ETH',
                {network:String} = 'unichain', 'ETH',
                'ETH'
            ) AS native_symbol
    )
    WHERE contract IN (
        SELECT input_contract FROM filtered_swaps
        UNION DISTINCT
        SELECT output_contract FROM filtered_swaps
    )
)

SELECT
    s.block_num AS block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    s.tx_hash AS transaction_id,
    toString(s.factory) AS factory,
    s.pool AS pool,
    s.user AS user,
    m1.token AS input_token,
    m2.token AS output_token,
    toString(s.input_amount) AS input_amount,
    s.input_amount / pow(10, m1.decimals) AS input_value,
    toString(s.output_amount) AS output_amount,
    s.output_amount / pow(10, m2.decimals) AS output_value,
    if(s.input_amount > 0, (s.output_amount / pow(10, m2.decimals)) / (s.input_amount / pow(10, m1.decimals)), 0) AS price,
    if(s.output_amount > 0, (s.input_amount / pow(10, m1.decimals)) / (s.output_amount / pow(10, m2.decimals)), 0) AS price_inv,
    s.protocol AS protocol,
    format('Swap {} {} for {} {} on {}',
        if(s.input_amount / pow(10, m1.decimals) > 1000, formatReadableQuantity(s.input_amount / pow(10, m1.decimals)), toString(s.input_amount / pow(10, m1.decimals))),
        m1.symbol,
        if(s.output_amount / pow(10, m2.decimals) > 1000, formatReadableQuantity(s.output_amount / pow(10, m2.decimals)), toString(s.output_amount / pow(10, m2.decimals))),
        m2.symbol,
        arrayStringConcat(
            arrayMap(x -> concat(upper(substring(x, 1, 1)), substring(x, 2)),
                     splitByChar('-', s.protocol)),
            ' '
        )
    ) AS summary,
    {network:String} AS network
FROM filtered_swaps AS s
LEFT JOIN metadata AS m1 ON s.input_contract = m1.contract
LEFT JOIN metadata AS m2 ON s.output_contract = m2.contract
ORDER BY s.timestamp DESC, s.tx_hash
SETTINGS query_plan_optimize_lazy_materialization = false
