SELECT
    'TRANSFER' AS "@type",
    block_num,
    block_hash,
    timestamp,
    tx_hash,
    contract,
    symbol,
    name,
    from,
    to,
    token_id,
    amount,
    transfer_type,
    token_standard
FROM erc721_transfers AS t
LEFT JOIN erc721_metadata_by_contract AS m USING (contract)
WHERE   timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
    AND ({contract:String}          = '' OR contract       = {contract:String})
    AND ({fromAddress:String}       = '' OR from           = {fromAddress:String})
    AND ({toAddress:String}         = '' OR to             = {toAddress:String})
    AND ({anyAddress:String}        = '' OR (to = {anyAddress:String} OR from = {anyAddress:String}))
LIMIT {limit:int}
OFFSET {offset:int}