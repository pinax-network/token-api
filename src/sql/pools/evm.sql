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
        ({pool:Array(String)} = [''] OR pool IN {pool:Array(String)})
        AND ({factory:Array(String)} = [''] OR factory IN {factory:Array(String)})
        AND ({input_token:Array(String)} = [''] OR token0 IN {input_token:Array(String)})
        AND ({output_token:Array(String)} = [''] OR token1 IN {output_token:Array(String)})
        AND ({protocol:String} = '' OR protocol = {protocol:String})
    ORDER BY datetime DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),

unique_tokens AS (
    SELECT token0 AS contract FROM filtered_pools
    UNION DISTINCT
    SELECT token1 AS contract FROM filtered_pools
),

metadata AS (
    SELECT
        contract,
        CAST(
            (contract, symbol, decimals)
            AS Tuple(address String, symbol String, decimals UInt8)
        ) AS token,
        symbol,
        decimals
    FROM {db_evm_tokens:Identifier}.metadata_view
    WHERE contract IN (SELECT contract FROM unique_tokens)
    AND contract NOT IN ('0x0000000000000000000000000000000000000000', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')

    UNION ALL

    SELECT
        contract,
        CAST(
            (contract, native_symbol, 18)
            AS Tuple(address String, symbol String, decimals UInt8)
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
        WHERE '0x0000000000000000000000000000000000000000' IN (SELECT contract FROM unique_tokens)

        UNION ALL

        SELECT
            '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' AS contract,
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
        WHERE '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' IN (SELECT contract FROM unique_tokens)
    )
)

SELECT
    p.factory AS factory,
    p.pool AS pool,
    m1.token AS input_token,
    m2.token AS output_token,
    p.fee AS fee,
    p.protocol AS protocol,
    {network:String} AS network
FROM filtered_pools AS p
LEFT JOIN metadata AS m1 ON p.token0 = m1.contract
LEFT JOIN metadata AS m2 ON p.token1 = m2.contract
ORDER BY p.datetime DESC, p.protocol
