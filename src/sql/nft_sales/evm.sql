WITH filtered_orders AS (
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
    FROM seaport_orders
    WHERE timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND toString(consideration_token) IN {nativeContracts: Array(String)}
        AND ({contract:Array(String)} = [''] OR offer_token IN {contract:Array(String)})
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({token_id:Array(String)} = [''] OR token_id IN {token_id:Array(String)})
        AND ({address:Array(String)} = [''] OR (offerer IN {address:Array(String)} OR recipient IN {address:Array(String)}))
        AND ({from_address:Array(String)} = [''] OR offerer IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = [''] OR recipient IN {to_address:Array(String)})
),
metadata_by_contract AS (
    SELECT
        contract,
        symbol,
        name
    FROM erc721_metadata_by_contract
    WHERE contract IN {contract:Array(String)}
    UNION DISTINCT
    SELECT
        contract,
        symbol,
        name
    FROM erc1155_metadata_by_contract
    WHERE contract IN {contract:Array(String)}
)
SELECT
    timestamp,
    block_num,
    tx_hash AS transaction_id,
    token,
    token_id,
    m.symbol AS symbol,
    m.name AS name,
    offerer,
    recipient,
    sum(sale_amount) AS sale_amount,
    sale_currency,
    {network:String} as network
FROM filtered_orders
LEFT JOIN metadata_by_contract AS m ON m.contract = token
GROUP BY timestamp, block_num, token, token_id, tx_hash, symbol, name, offerer, recipient, sale_currency
ORDER BY timestamp DESC, token, token_id, transaction_id, symbol, name, offerer, recipient, sale_currency
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}