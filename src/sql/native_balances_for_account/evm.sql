WITH filtered_balances AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        address,
        contract,
        argMax(balance, b.timestamp) AS amount
    FROM {db_balances:Identifier}.balances AS b
    WHERE
        address IN {address:Array(String)}
        AND contract = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        AND (balance > 0 OR {include_null_balances:Bool})
    GROUP BY address, contract
    ORDER BY timestamp DESC, address, contract
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    timestamp AS last_update,
    block_num AS last_update_block_num,
    toUnixTimestamp(a.timestamp) AS last_update_timestamp,
    toString(address) AS address,
    toString(contract) AS contract,
    toString(amount) AS amount,
    a.amount / pow(10, decimals) AS value,
    'Native' AS name,
    multiIf(
        {network:String} = 'mainnet', 'ETH',
        {network:String} = 'arbitrum-one', 'ETH',
        {network:String} = 'avalanche', 'AVAX',
        {network:String} = 'base', 'ETH',
        {network:String} = 'bsc', 'BNB',
        {network:String} = 'polygon', 'POL',
        {network:String} = 'optimism', 'ETH',
        {network:String} = 'unichain', 'ETH',
        ''
    ) AS symbol,
    18 AS decimals,
    {network:String} AS network
FROM filtered_balances AS a
ORDER BY timestamp DESC, address, contract
