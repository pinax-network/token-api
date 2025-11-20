WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({transaction_id:Array(String)} != ['']) +
        toUInt8({pool:Array(String)}           != ['']) +
        toUInt8({caller:Array(String)}         != ['']) +
        toUInt8({sender:Array(String)}         != ['']) +
        toUInt8({recipient:Array(String)}      != [''])
    AS n
),
/* 2) Union buckets from only active filters */
minutes_union AS
(
    SELECT minute
    FROM swaps_by_tx_hash
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_pool
    WHERE ({pool:Array(String)} != [''] AND pool IN {pool:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_caller
    WHERE ({caller:Array(String)} != [''] AND caller IN {caller:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_sender
    WHERE ({sender:Array(String)} != [''] AND sender IN {sender:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_recipient
    WHERE ({recipient:Array(String)} != [''] AND recipient IN {recipient:Array(String)})
    ORDER BY minute DESC
),
/* 3) Intersect: keep only buckets present in ALL active filters */
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
latest_ts AS
(
    SELECT max(timestamp) AS ts FROM swaps
),
s AS (
    SELECT
        block_num,
        timestamp,
        tx_hash,
        pool,
        toString(caller) AS caller,
        toString(sender) AS sender,
        toString(recipient) AS recipient,
        abs(amount0) AS amount0,
        abs(amount1) AS amount1,
        price,
        protocol,
        s.amount0 < 0 AS invert_tokens
    FROM swaps AS s
    PREWHERE
        timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND (
            (
                /* if no filters are active, search through the last hour only */
                (SELECT n FROM active_filters) = 0
                AND timestamp BETWEEN
                    greatest( toDateTime({start_time:UInt64}), least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts)) - (INTERVAL 1 HOUR + INTERVAL 1 * {offset:UInt64} SECOND))
                    AND least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts))
            )
            /* if filters are active, search through the intersecting minute ranges */
            OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        /* filter the trimmed down minute ranges by the active filters */
        ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({pool:Array(String)} = ['']  OR pool IN {pool:Array(String)})
        AND ({caller:Array(String)} = ['']  OR caller IN {caller:Array(String)})
        AND ({sender:Array(String)} = ['']  OR sender IN {sender:Array(String)})
        AND ({recipient:Array(String)} = [''] OR recipient IN {recipient:Array(String)})
        AND ({protocol:String} = '' OR protocol = {protocol:String})
    ORDER BY timestamp DESC, tx_hash
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
filtered_pools AS (
    SELECT
        pool,
        factory,
        protocol,
        token0,
        token1
    FROM pools
    WHERE pool IN (SELECT DISTINCT pool FROM s)
),
unique_tokens AS (
    SELECT DISTINCT token0 AS address FROM filtered_pools
    UNION DISTINCT
    SELECT DISTINCT token1 AS address FROM filtered_pools
),
filtered_tokens AS (
    SELECT
        t.address,
        argMax(if(isNull(t.symbol), '', t.symbol), t.block_num) AS symbol,
        argMax(coalesce(t.decimals, 0), t.block_num) AS decimals
    FROM erc20_metadata_initialize t
    WHERE t.address IN (SELECT address FROM unique_tokens)
    GROUP BY t.address
),
p AS (
    SELECT
        pool,
        protocol,
        factory,
        c0.decimals AS decimals0,
        c1.decimals AS decimals1,
        CAST((
                toString(p.token0),
                trim(coalesce(
                    multiIf(
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'mainnet', 'ETH',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'arbitrum-one', 'ETH',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'avalanche', 'AVAX',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'base', 'ETH',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'bsc', 'BNB',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'polygon', 'POL',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'optimism', 'ETH',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'unichain', 'ETH',
                        c0.symbol
                    ), '')),
                coalesce(
                    if(p.token0 = '0x0000000000000000000000000000000000000000', 18, c0.decimals), 0
                )
            )
            AS Tuple(address String, symbol String, decimals UInt8)
        ) AS input_token,
        CAST(
            (
                toString(p.token1),
                trim(coalesce(
                    multiIf(
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'mainnet', 'ETH',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'arbitrum-one', 'ETH',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'avalanche', 'AVAX',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'base', 'ETH',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'bsc', 'BNB',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'polygon', 'POL',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'optimism', 'ETH',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'unichain', 'ETH',
                        c1.symbol
                    ), '')),
                coalesce(
                    if(p.token1 = '0x0000000000000000000000000000000000000000', 18, c1.decimals), 0
                )
            )
            AS Tuple(address String, symbol String, decimals UInt8)
        ) AS output_token
    FROM filtered_pools AS p
    JOIN filtered_tokens c0 ON c0.address = p.token0
    JOIN filtered_tokens c1 ON c1.address = p.token1
)
SELECT
    s.block_num AS block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    s.tx_hash AS transaction_id,
    toString(p.factory) AS factory,
    s.pool AS pool,
    if(invert_tokens, p.output_token, p.input_token) AS input_token,
    if(invert_tokens, p.input_token, p.output_token) AS output_token,
    s.caller AS caller,
    s.sender,
    s.recipient,
    if(invert_tokens, toString(s.amount1), toString(s.amount0)) AS input_amount,
    if(invert_tokens, s.amount1 / pow(10, decimals1), s.amount0 / pow(10, decimals0)) AS input_value,
    if(invert_tokens, toString(s.amount0), toString(s.amount1)) AS output_amount,
    if(invert_tokens, s.amount0 / pow(10, decimals0), s.amount1 / pow(10, decimals1)) AS output_value,
    s.price AS price,
    1 / s.price AS price_inv,
    s.protocol AS protocol,
    format('Swap {} {} for {} {} on {}',
        if(input_value > 1000, formatReadableQuantity(input_value), toString(round(input_value, input_token.decimals))),
        input_token.symbol,
        if(output_value > 1000, formatReadableQuantity(output_value), toString(round(output_value, output_token.decimals))),
        output_token.symbol,
        arrayStringConcat(
            arrayMap(x -> concat(upper(substring(x, 1, 1)), substring(x, 2)),
                     splitByChar('_', protocol)),
            ' '
        )
    ) AS summary,
    {network:String} AS network
FROM s
LEFT JOIN p USING (pool, protocol)
ORDER BY timestamp DESC, transaction_id
