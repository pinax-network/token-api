WITH s AS (
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
    WHERE timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({pool:Array(String)} = ['']  OR pool IN {pool:Array(String)})
        AND ({caller:Array(String)} = ['']  OR caller IN {caller:Array(String)})
        AND ({sender:Array(String)} = ['']  OR sender IN {sender:Array(String)})
        AND ({recipient:Array(String)} = [''] OR recipient IN {recipient:Array(String)})
    ORDER BY timestamp DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
filtered_pools AS (
    SELECT
        pool,
        factory,
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
        if(isNull(t.symbol), '', t.symbol) AS symbol,
        coalesce(t.decimals, 0) AS decimals
    FROM erc20_metadata_initialize t
    WHERE t.address IN (SELECT address FROM unique_tokens)
),
p AS (
    SELECT
        pool,
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
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'polygon', 'MATIC',
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
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network:String} = 'polygon', 'MATIC',
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
LEFT JOIN p USING (pool)
ORDER BY timestamp DESC