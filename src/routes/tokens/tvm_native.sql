WITH circulating AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp
    FROM {db_transfers:Identifier}.native_transfers
)
SELECT
    /* timestamps */
    circulating.timestamp AS last_update,
    circulating.block_num AS last_update_block_num,
    toUnixTimestamp(circulating.timestamp) AS last_update_timestamp,

    /* token metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network: String} AS network
FROM circulating
JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = '0x0000000000000000000000000000000000000000'
