WITH sorted_orders AS (
    SELECT DISTINCT
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
    WHERE   timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
        AND consideration_token IN {nativeContracts: Array(String)}
        AND ({token:String}             = '' OR offer_token    = {token:String})
        AND ({offererAddress:String}    = '' OR offerer        = {offererAddress:String})
        AND ({recipientAddress:String}  = '' OR recipient      = {recipientAddress:String})
        AND ({anyAddress:String}        = '' OR (offerer = {anyAddress:String} OR recipient = {anyAddress:String}))
    ORDER BY offer_token
),
erc1155_metadata_by_contract AS (
    SELECT DISTINCT
        contract,
        'TO IMPLEMENT OFFCHAIN' AS symbol,
        'TO IMPLEMENT OFFCHAIN' AS name
    FROM erc1155_balances
    FINAL
),
metadata_by_contract AS (
    SELECT
        contract,
        symbol,
        name
    FROM erc721_metadata_by_contract
    UNION ALL
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
    m.symbol,
    m.name,
    offerer,
    recipient,
    sale_amount,
    sale_currency
FROM sorted_orders
JOIN metadata_by_contract AS m ON m.contract = token
ORDER BY timestamp DESC
LIMIT {limit:int}
OFFSET {offset:int}