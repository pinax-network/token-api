WITH filtered_contract AS (
    SELECT
        timestamp AS last_update,
        block_num AS last_update_block_num,
        log_address AS contract
    FROM trc20_transfer
    WHERE log_address = {contract:String}
    ORDER BY timestamp DESC
    LIMIT 1
),
metadata AS
(
    SELECT
        contract,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        decimals
    FROM metadata
    WHERE contract = {contract:String}
)
SELECT
    last_update,
    last_update_block_num,
    toUnixTimestamp(last_update) AS last_update_timestamp,
    toString(fc.contract) AS contract,
    decimals,
    name,
    symbol,
    {network:String} AS network
FROM filtered_contract AS fc
LEFT JOIN metadata USING contract
