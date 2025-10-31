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
        if ({pool:Array(String)} == [''], true, pool IN {pool:Array(String)}) AND
        if ({factory:Array(String)} == [''], true, factory IN {factory:Array(String)}) AND
        if ({input_token:Array(String)} == [''], true, token0 IN {input_token:Array(String)}) AND
        if ({output_token:Array(String)} == [''], true, token1 IN {output_token:Array(String)}) AND
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
    pools.factory AS factory,
    pools.pool AS pool,
    CAST(
        (
            toString(pools.token0),
            trim(coalesce(
                multiIf(
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'mainnet', 'ETH',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'arbitrum-one', 'ETH',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'avalanche', 'AVAX',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'base', 'ETH',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'bsc', 'BNB',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'polygon', 'POL',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'optimism', 'ETH',
                    (pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'unichain', 'ETH',
                    t0.symbol
                ), '')),
            coalesce(
                if((pools.token0 = '0x0000000000000000000000000000000000000000' OR pools.token0 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'), 18, t0.decimals), 0
            )
        )
        AS Tuple(address String, symbol String, decimals UInt8)
    ) AS input_token,
    CAST(
        (
            toString(pools.token1),
            trim(coalesce(
                multiIf(
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'mainnet', 'ETH',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'arbitrum-one', 'ETH',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'avalanche', 'AVAX',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'base', 'ETH',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'bsc', 'BNB',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'polygon', 'POL',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'optimism', 'ETH',
                    (pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND {network:String} = 'unichain', 'ETH',
                    t1.symbol
                ), '')),
            coalesce(
                if((pools.token1 = '0x0000000000000000000000000000000000000000' OR pools.token1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'), 18, t1.decimals), 0
            )
        )
        AS Tuple(address String, symbol String, decimals UInt8)
    ) AS output_token,
    pools.fee AS fee,
    pools.protocol AS protocol,
    {network:String} as network
FROM filtered_pools AS pools
LEFT JOIN filtered_tokens t0 ON pools.token0 = t0.address
LEFT JOIN filtered_tokens t1 ON pools.token1 = t1.address
ORDER BY datetime DESC, protocol
