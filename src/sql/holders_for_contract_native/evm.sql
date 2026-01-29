
/* 1) Get the cutoff for native token - 100 by default, pick optimal number by chain based token value and activity */
/* With optimal cutoff number, distinct holders with that cutoff should be at least 1000, but reasonable for the query performance: */
/* SELECT countDistinct(address) FROM native_balances WHERE balance > N * pow(10, 18); */
WITH cutoff AS (
    SELECT
        multiIf(
            {network:String} = 'unichain', toUInt64(1),
            {network:String} = 'optimism', toUInt64(10),
            {network:String} = 'base', toUInt64(10),
            {network:String} = 'arbitrum-one', toUInt64(100),
            {network:String} = 'bsc', toUInt64(100),
            {network:String} = 'avalanche', toUInt64(1000),
            {network:String} = 'mainnet', toUInt64(5000),
            {network:String} = 'polygon', toUInt64(50000),
            toUInt64(100)
        ) AS eth_cut
),
/* 2) Get top native token holders with cutoff applied */
top_native AS (
    SELECT
        address,
        argMax(balance, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn
    FROM {db_balances:Identifier}.native_balances
    WHERE balance > (SELECT eth_cut FROM cutoff) * pow(10, 18)
    GROUP BY address
    ORDER BY amt DESC, address
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    /* timestamps */
    ts AS last_update,
    bn AS last_update_block_num,
    toUnixTimestamp(ts) AS last_update_timestamp,

    /* identifiers */
    address,

    /* amounts */
    toString(amt) AS amount,
    amt / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* network */
    {network:String} as network
FROM top_native
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND '0x0000000000000000000000000000000000000000' = m.contract
ORDER BY value DESC, address