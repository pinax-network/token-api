
/* 1) Get the cutoff for native token - 100 by default, pick optimal number by chain based token value and activity */
/* With optimal cutoff number, distinct holders with that cutoff should be at least 1000, but reasonable for the query performance: */
/* SELECT countDistinct(address) FROM native_balances WHERE balance > N * pow(10, 18); */
WITH cutoff AS (
    SELECT
        multiIf(
            {network:String} = 'unichain', toUInt256(1 * pow(10, 18)),
            {network:String} = 'optimism', toUInt256(10 * pow(10, 18)),
            {network:String} = 'base', toUInt256(10 * pow(10, 18)),
            {network:String} = 'arbitrum-one', toUInt256(100 * pow(10, 18)),
            {network:String} = 'bsc', toUInt256(100 * pow(10, 18)),
            {network:String} = 'avalanche', toUInt256(1000 * pow(10, 18)),
            {network:String} = 'mainnet', toUInt256(5000 * pow(10, 18)),
            {network:String} = 'polygon', toUInt256(50000 * pow(10, 18)),
            toUInt256(100 * pow(10, 18))
        )
),
/* find addresses above cutoff (ex: >=5000 ETH) */
addresses AS (
    SELECT address FROM {db_balances:Identifier}.native_balances
    WHERE balance >= (SELECT * FROM cutoff)
),
/* get the latest balance for each account */
balances AS (
    SELECT address, argMax(balance, b.block_num) as balance, max(b.timestamp) as timestamp, max(block_num) as block_num
    FROM {db_balances:Identifier}.native_balances b
    WHERE address IN (SELECT address FROM addresses)
    GROUP BY address
    ORDER BY balance DESC, address
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    /* timestamps */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* identifiers */
    address,

    /* amounts */
    toString(b.balance) AS amount,
    b.balance / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    nullIf(m.name, '') AS name,
    nullIf(m.symbol, '') AS symbol,
    m.decimals AS decimals,

    /* network */
    {network:String} as network
FROM balances b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND '0x0000000000000000000000000000000000000000' = m.contract
ORDER BY b.balance DESC, address
SETTINGS use_skip_indexes_for_top_k = 1, use_top_k_dynamic_filtering = 1
