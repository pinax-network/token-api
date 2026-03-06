/*
    Unified timestamp resolution.
    Uses coalesce instead of `isNull(X) OR timestamp >= (subquery)` because
    the OR pattern prevents ClickHouse from recognizing a clean primary-key range.
    With coalesce, ClickHouse always sees `timestamp >= <value>` / `timestamp <= <value>`,
    enabling granule skipping on the primary index (timestamp is the leading key).

    NOTE: block_num filtering is limited — unlike swaps/transfers, the NFT database
    has no `blocks` table to resolve block_num → timestamp, so block filters are applied
    as secondary WHERE clauses after the timestamp clamp.
*/
WITH
start_ts AS (
    SELECT coalesce(toDateTime({start_time:Nullable(UInt64)}), toDateTime(0)) AS ts
),
end_ts AS (
    SELECT coalesce(toDateTime({end_time:Nullable(UInt64)}), now()) AS ts
),
has_filters AS (
    SELECT (
        notEmpty({contract:Array(String)})
        OR notEmpty({transaction_id:Array(String)}) OR notEmpty({token_id:Array(String)})
        OR notEmpty({address:Array(String)})
        OR notEmpty({from_address:Array(String)}) OR notEmpty({to_address:Array(String)})
    ) AS yes
),
clamped_start_ts AS (
    SELECT if(
        (SELECT yes FROM has_filters) OR isNotNull({start_time:Nullable(UInt64)}) OR isNotNull({start_block:Nullable(UInt64)}),
        (SELECT ts FROM start_ts),
        greatest((SELECT ts FROM start_ts), (SELECT ts FROM end_ts) - INTERVAL 1 HOUR)
    ) AS ts
),
filtered_orders AS (
    SELECT
        timestamp,
        block_num,
        tx_hash,
        offer_token as token,
        toString(offer_token_id) AS token_id,
        offerer,
        recipient,
        consideration_amount / pow(10, 18) AS sale_amount,
        {sale_currency:String} AS sale_currency
    FROM {db_nft:Identifier}.seaport_orders
    WHERE timestamp >= (SELECT ts FROM clamped_start_ts) AND timestamp <= (SELECT ts FROM end_ts)
        AND (isNull({start_block:Nullable(UInt64)}) OR block_num >= {start_block:Nullable(UInt64)})
        AND (isNull({end_block:Nullable(UInt64)}) OR block_num <= {end_block:Nullable(UInt64)})
        AND toString(consideration_token) IN {nativeContracts: Array(String)}
        AND (empty({contract:Array(String)}) OR offer_token IN {contract:Array(String)})
        AND (empty({transaction_id:Array(String)}) OR tx_hash IN {transaction_id:Array(String)})
        AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
        AND (empty({address:Array(String)}) OR (offerer IN {address:Array(String)} OR recipient IN {address:Array(String)}))
        AND (empty({from_address:Array(String)}) OR offerer IN {from_address:Array(String)})
        AND (empty({to_address:Array(String)}) OR recipient IN {to_address:Array(String)})
),
metadata_by_contract AS (
    SELECT
        contract,
        symbol,
        name
    FROM {db_nft:Identifier}.erc721_metadata_by_contract
    WHERE contract IN {contract:Array(String)}
    UNION DISTINCT
    SELECT
        contract,
        symbol,
        name
    FROM {db_nft:Identifier}.erc1155_metadata_by_contract
    WHERE contract IN {contract:Array(String)}
)
SELECT
    block_num,
    o.timestamp AS datetime,
    toUnixTimestamp(datetime) AS timestamp,
    tx_hash AS transaction_id,
    token AS contract,
    token_id,
    m.name AS name,
    m.symbol AS symbol,
    offerer,
    recipient,
    sum(sale_amount) AS sale_amount,
    sale_currency,
    {network:String} as network
FROM filtered_orders AS o
LEFT JOIN metadata_by_contract AS m ON m.contract = token
GROUP BY o.timestamp, block_num, token, token_id, tx_hash, symbol, name, offerer, recipient, sale_currency
ORDER BY timestamp DESC, token, token_id, transaction_id, symbol, name, offerer, recipient, sale_currency
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
