WITH s AS (
    SELECT
        block_num,
        timestamp,
        tx_hash,
        toString(caller) as caller,
        pool,
        toString(sender) as sender,
        toString(recipient) AS recipient,
        amount0,
        amount1,
        price,
        protocol
    FROM swaps
    WHERE timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND ({transaction_id:String} = '' OR tx_hash = {transaction_id:String})
        AND ({caller:String}     = '' OR caller         = {caller:String})
        AND ({sender:String}     = '' OR sender         = {sender:String})
        AND ({recipient:String}  = '' OR recipient      = {recipient:String})
        AND ({pool:String}       = '' OR pool           = {pool:String})
        AND ({protocol:String}   = '' OR protocol       = {protocol:String})
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
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'mainnet', 'ETH',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'arbitrum-one', 'ETH',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'avalanche', 'AVAX',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'base', 'ETH',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'bsc', 'BNB',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'matic', 'MATIC',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'optimism', 'ETH',
                        p.token0 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'unichain', 'ETH',
                        c0.symbol
                    ), '')),
                coalesce(
                    if(p.token0 = '0x0000000000000000000000000000000000000000', 18, c0.decimals), 0
                )
            )
            AS Tuple(address String, symbol String, decimals UInt8)
        ) AS token0,
        CAST(
            (
                toString(p.token1),
                trim(coalesce(
                    multiIf(
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'mainnet', 'ETH',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'arbitrum-one', 'ETH',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'avalanche', 'AVAX',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'base', 'ETH',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'bsc', 'BNB',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'matic', 'MATIC',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'optimism', 'ETH',
                        p.token1 = '0x0000000000000000000000000000000000000000' AND {network_id:String} = 'unichain', 'ETH',
                        c1.symbol
                    ), '')),
                coalesce(
                    if(p.token1 = '0x0000000000000000000000000000000000000000', 18, c1.decimals), 0
                )
            )
            AS Tuple(address String, symbol String, decimals UInt8)
        ) AS token1
FROM filtered_pools AS p
JOIN filtered_tokens c0 ON c0.address = p.token0
JOIN filtered_tokens c1 ON c1.address = p.token1
)
SELECT
    s.block_num         AS block_num,
    s.timestamp         AS datetime,
    toUnixTimestamp(s.timestamp) as timestamp,
    s.tx_hash    AS transaction_id,
    s.caller            AS caller,
    s.pool              AS pool,
    toString(p.factory)           AS factory,
    token0,
    token1,
    s.sender,
    s.recipient,
    toString(s.amount0) as amount0,
    toString(s.amount1) as amount1,
    s.amount0 / pow(10, decimals0) AS value0,
    s.amount1 / pow(10, decimals1) AS value1,
    s.price   / pow(10, decimals1 - decimals0) AS price0,
    1.0 / price0 AS price1,
    s.protocol as protocol,
    {network_id:String} as network_id
FROM s
LEFT JOIN p USING (pool)
ORDER BY timestamp DESC
