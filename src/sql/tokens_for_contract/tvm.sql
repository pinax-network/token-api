WITH circulating AS (
    SELECT
        log_address AS contract,
        count() as total_transfers,
        max(block_num) AS block_num,
        max(timestamp) AS timestamp
    FROM {db_transfers:Identifier}.transfers
    WHERE log_address IN {contract:Array(String)}
    GROUP BY log_address
)
SELECT
    /* timestamps */
    c.timestamp AS last_update,
    c.block_num AS last_update_block_num,
    toUnixTimestamp(c.timestamp) AS last_update_timestamp,

    /* identifiers */
    c.contract AS contract,

    /* amounts */
    c.total_transfers AS total_transfers,

    /* token metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network: String} AS network
FROM circulating AS c
JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = c.contract
ORDER BY c.total_transfers DESC