SELECT
    /* timestamps */
    timestamp AS last_update,
    block_num AS last_update_block_num,
    toUnixTimestamp(timestamp) AS last_update_timestamp,

    /* transfer */
    '11111111111111111111111111111111' AS program_id,
    'So11111111111111111111111111111111111111111' AS mint,
    9 AS decimals,

    /* amounts */
    circulating_supply / pow(10, decimals) AS circulating_supply,
    holders,

    /* token metadata */
    'Native' AS name,
    'SOL' AS symbol,

    /* network */
    {network: String} AS network
FROM {db_balances:Identifier}.native_balances_metadata
