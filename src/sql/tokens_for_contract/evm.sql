WITH transfers AS (
    SELECT
        log_address as contract,
        count() as total_transfers
    FROM {db_transfers:Identifier}.transfers
    WHERE contract IN {contract:Array(String)}
    GROUP BY log_address
    ORDER BY total_transfers DESC
),
circulating AS (
    SELECT
        contract,
        count() AS holders,
        sum(balance) AS circulating_supply,
        max(block_num) AS block_num,
        max(timestamp) AS timestamp
    FROM (
        SELECT
            address,
            contract,
            max(block_num) AS block_num,
            max(timestamp) AS timestamp,
            argMax(balance, b.block_num) AS balance
        FROM {db_balances:Identifier}.erc20_balances AS b
        WHERE contract IN {contract:Array(String)}
        GROUP BY contract, address
        HAVING balance > 0
    )
    GROUP BY contract
)
SELECT
    /* timestamps */
    c.timestamp AS last_update,
    c.block_num AS last_update_block_num,
    toUnixTimestamp(c.timestamp) AS last_update_timestamp,

    /* identifiers */
    c.contract AS contract,

    /* amounts */
    c.circulating_supply / pow(10, decimals) AS circulating_supply,
    c.holders AS holders,
    t.total_transfers AS total_transfers,

    /* token metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network: String} AS network
FROM circulating AS c
JOIN transfers AS t ON t.contract = c.contract
JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = c.contract
ORDER BY c.total_transfers DESC