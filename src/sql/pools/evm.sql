WITH filtered_pools AS (
    SELECT
        block_num,
        timestamp as datetime,
        tx_hash AS transaction_id,
        toString(factory) AS factory,
        pool,
        token0,
        token1,
        fee,
        protocol
    FROM pools
    WHERE
        if ({pool:String} == '', true, pool  = {pool:String}) AND
        if ({factory:String} == '', true, factory = {factory:String}) AND
        if ({token:String} == '', true, token0 = {token:String} OR token1 = {token:String}) AND
        if ({protocol:String} == '', true, protocol = {protocol:String})
    ORDER BY datetime DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
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
)
SELECT
    pools.block_num AS block_num,
    datetime,
    transaction_id,
    pools.factory AS factory,
    pools.pool AS pool,
    CAST(
        (
            toString(pools.token0),
            trim(coalesce(
                multiIf(
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'mainnet', 'ETH',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'arbitrum-one', 'ETH',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'avalanche', 'AVAX',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'base', 'ETH',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'bsc', 'BNB',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'matic', 'MATIC',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'optimism', 'ETH',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'unichain', 'ETH',
                    t0.symbol
                ), '')),
            coalesce(
                if((pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'), 18, t0.decimals), 0
            )
        )
        AS Tuple(address String, symbol String, decimals UInt8)
    ) AS token0,
    CAST(
        (
            toString(pools.token1),
            trim(coalesce(
                multiIf(
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'mainnet', 'ETH',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'arbitrum-one', 'ETH',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'avalanche', 'AVAX',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'base', 'ETH',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'bsc', 'BNB',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'matic', 'MATIC',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'optimism', 'ETH',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network_id:String} = 'unichain', 'ETH',
                    t1.symbol
                ), '')),
            coalesce(
                if((pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'), 18, t1.decimals), 0
            )
        )
        AS Tuple(address String, symbol String, decimals UInt8)
    ) AS token1,
    pools.fee AS fee,
    pools.protocol AS protocol,
    {network_id: String} as network_id
FROM filtered_pools AS pools
LEFT JOIN filtered_tokens t0 ON pools.token0 = t0.address
LEFT JOIN filtered_tokens t1 ON pools.token1 = t1.address
ORDER BY datetime DESC, protocol
