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
    FINAL
    WHERE   timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND toString(consideration_token) IN {nativeContracts: Array(String)}
        AND offer_token = {contract:String}
        AND ({token_id:String}             = '' OR offer_token_id = {token_id:String})
        AND ({offererAddress:String}    = '' OR offerer        = {offererAddress:String})
        AND ({recipientAddress:String}  = '' OR recipient      = {recipientAddress:String})
        AND ({anyAddress:String}        = '' OR (offerer = {anyAddress:String} OR recipient = {anyAddress:String}))
),
metadata_by_contract AS (
    SELECT
        contract,
        symbol,
        name
    FROM erc721_metadata_by_contract
    WHERE contract = {contract: String}
    UNION DISTINCT
    SELECT
        contract,
        symbol,
        name
    FROM erc1155_metadata_by_contract
)
SELECT
    timestamp,
    block_num,
    tx_hash,
    token,
    token_id,
    m.symbol AS symbol,
    m.name AS name,
    offerer,
    recipient,
    sum(sale_amount) AS sale_amount,
    sale_currency
FROM filtered_orders
JOIN metadata_by_contract AS m ON m.contract = token
GROUP BY timestamp, block_num, tx_hash, token, token_id, symbol, name, offerer, recipient, sale_currency
ORDER BY timestamp DESC
LIMIT {limit:int}
OFFSET {offset:int}