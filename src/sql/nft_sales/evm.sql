WITH (
    consideration_amount / pow(10, 18) AS sale_amount
)
SELECT
    timestamp,
    block_num,
    tx_hash,
    offer_token as token,
    toString(offer_token_id) AS token_id,
    m.symbol,
    m.name,
    offerer,
    recipient,
    sale_amount,
    {sale_currency:String} AS sale_currency
FROM seaport_orders
JOIN erc721_metadata_by_contract AS m ON m.contract = offer_token
WHERE   timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
    AND consideration_token IN {nativeContracts: Array(String)}
    AND ({token:String}             = '' OR offer_token    = {token:String})
    AND ({offererAddress:String}    = '' OR offerer        = {offererAddress:String})
    AND ({recipientAddress:String}  = '' OR recipient      = {recipientAddress:String})
    AND ({anyAddress:String}        = '' OR (offerer = {anyAddress:String} OR recipient = {anyAddress:String}))
LIMIT {limit:int}
OFFSET {offset:int}