WITH circulating AS (
    SELECT
        count() AS holders,
        sum(balance) AS circulating_supply,
        max(block_num) AS block_num,
        max(timestamp) AS timestamp
    FROM {db_balances:Identifier}.erc20_balances_final
    WHERE contract = {contract: String}
)
SELECT
    /* timestamps */
    circulating.timestamp AS last_update,
    circulating.block_num AS last_update_block_num,
    toUnixTimestamp(circulating.timestamp) AS last_update_timestamp,

    /* identifiers */
    {contract: String} AS contract,

    circulating.circulating_supply / pow(10, decimals) AS circulating_supply,
    circulating.holders AS holders,

    /* token metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network: String} AS network
FROM circulating
JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = {contract: String}
