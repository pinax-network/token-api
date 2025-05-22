WITH erc721 AS (
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
        toString(token_id) AS token_id,
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
),
erc1155_metadata_by_contract AS (
    SELECT DISTINCT
        contract
    FROM erc1155_balances
    FINAL
),
erc1155 AS (
    SELECT
        'TRANSFER' AS "@type",
        block_num,
        block_hash,
        timestamp,
        tx_hash,
        contract,
        'TO IMPLEMENT OFFCHAIN' AS symbol,
        'TO IMPLEMENT OFFCHAIN' AS name,
        from,
        to,
        toString(token_id) AS token_id,
        amount,
        transfer_type,
        token_standard
    FROM erc1155_transfers AS t
    LEFT JOIN erc1155_metadata_by_contract AS m USING (contract)
    WHERE   timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
        AND ({contract:String}          = '' OR contract       = {contract:String})
        AND ({fromAddress:String}       = '' OR from           = {fromAddress:String})
        AND ({toAddress:String}         = '' OR to             = {toAddress:String})
        AND ({anyAddress:String}        = '' OR (to = {anyAddress:String} OR from = {anyAddress:String}))
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
)
SELECT * FROM combined
LIMIT {limit:int}
OFFSET {offset:int}